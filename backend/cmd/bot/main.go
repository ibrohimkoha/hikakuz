package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"anivorm/internal/config"
	"anivorm/internal/database"
)

type BotUpdate struct {
	UpdateID int `json:"update_id"`
	Message  *struct {
		MessageID int `json:"message_id"`
		From      struct {
			ID        int64  `json:"id"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Username  string `json:"username"`
		} `json:"from"`
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
	CallbackQuery *struct {
		ID   string `json:"id"`
		From struct {
			ID        int64  `json:"id"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Username  string `json:"username"`
		} `json:"from"`
		Data    string `json:"data"`
		Message struct {
			Chat struct {
				ID int64 `json:"id"`
			} `json:"chat"`
			MessageID int `json:"message_id"`
		} `json:"message"`
	} `json:"callback_query"`
}

var httpClient = &http.Client{
	Timeout: 45 * time.Second,
}

func sendTelegramMessage(token string, chatID int64, text string, replyMarkup interface{}) error {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	payload := map[string]interface{}{
		"chat_id":                  chatID,
		"text":                     text,
		"parse_mode":               "HTML",
		"disable_web_page_preview": true,
	}
	if replyMarkup != nil {
		payload["reply_markup"] = replyMarkup
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram sendMessage returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func editTelegramMessage(token string, chatID int64, messageID int, text string, replyMarkup interface{}) error {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/editMessageText", token)
	payload := map[string]interface{}{
		"chat_id":                  chatID,
		"message_id":               messageID,
		"text":                     text,
		"parse_mode":               "HTML",
		"disable_web_page_preview": true,
	}
	if replyMarkup != nil {
		payload["reply_markup"] = replyMarkup
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram editMessageText returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func answerTelegramCallback(token string, callbackQueryID string, text string) error {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/answerCallbackQuery", token)
	payload := map[string]interface{}{
		"callback_query_id": callbackQueryID,
	}
	if text != "" {
		payload["text"] = text
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func main() {
	cfg := config.LoadConfig()

	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("[AuthBot] Failed to connect to DB: %v", err)
	}
	defer db.Close()

	tokenBot := cfg.TelegramToken
	if tokenBot == "" {
		log.Fatalf("[AuthBot] TELEGRAM_BOT_TOKEN muhit o'zgaruvchisi topilmadi! Iltimos, token kiriting.")
	}

	log.Printf("[AuthBot] Starting Dedicated Hikaku Telegram Auth Bot (@hikakuzbot)...")

	// Delete webhook if any, to ensure getUpdates polling works cleanly
	deleteWebhookURL := fmt.Sprintf("https://api.telegram.org/bot%s/deleteWebhook?drop_pending_updates=false", tokenBot)
	if resp, err := httpClient.Get(deleteWebhookURL); err == nil {
		_ = resp.Body.Close()
		log.Printf("[AuthBot] Checked and cleared webhook status")
	}

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	offset := 0
	running := true

	go func() {
		<-stopChan
		log.Println("[AuthBot] Stopping bot gracefully...")
		running = false
	}()

	for running {
		url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?offset=%d&timeout=25", tokenBot, offset)
		resp, err := httpClient.Get(url)
		if err != nil {
			if running {
				log.Printf("[AuthBot] Network error polling updates: %v", err)
				time.Sleep(2 * time.Second)
			}
			continue
		}

		var updateResp struct {
			OK     bool        `json:"ok"`
			Result []BotUpdate `json:"result"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&updateResp); err != nil {
			resp.Body.Close()
			time.Sleep(1 * time.Second)
			continue
		}
		resp.Body.Close()

		if !updateResp.OK {
			log.Printf("[AuthBot] Telegram API returned ok=false, sleeping 2s...")
			time.Sleep(2 * time.Second)
			continue
		}

		for _, update := range updateResp.Result {
			if update.UpdateID >= offset {
				offset = update.UpdateID + 1
			}

			// 1. Process Messages (Commands)
			if update.Message != nil && update.Message.Chat.ID != 0 {
				msg := update.Message
				text := strings.TrimSpace(msg.Text)

				if strings.HasPrefix(text, "/start") {
					parts := strings.Fields(text)
					if len(parts) > 1 && strings.HasPrefix(parts[1], "auth_") {
						token := parts[1]

						// Check session validity in database
						var createdAt time.Time
						var isVerified bool
						err := db.QueryRow("SELECT created_at, is_verified FROM anivorm_auth_sessions WHERE token = $1", token).Scan(&createdAt, &isVerified)
						if err != nil {
							if err == sql.ErrNoRows {
								_ = sendTelegramMessage(tokenBot, msg.Chat.ID,
									"⚠️ <b>Kirish so'rovi topilmadi yoki eskirgan.</b>\n\nIltimos, <a href=\"https://hikaku.uz\">Hikaku.uz</a> saytiga o'tib, qaytadan urinib ko'ring.",
									map[string]interface{}{
										"inline_keyboard": [][]map[string]interface{}{
											{{"text": "🌐 Hikaku.uz Saytiga O'tish", "url": "https://hikaku.uz"}},
										},
									})
							} else {
								log.Printf("[AuthBot] DB error checking auth token %s: %v", token, err)
							}
							continue
						}

						if isVerified || time.Since(createdAt) > 3*time.Minute {
							_ = sendTelegramMessage(tokenBot, msg.Chat.ID,
								"⚠️ <b>Kirish so'rovi muddati tugagan (3 daqiqa) yoki avvalroq tasdiqlangan.</b>\n\nIltimos, saytdan yangi kirish so'rovini hosil qiling.",
								map[string]interface{}{
									"inline_keyboard": [][]map[string]interface{}{
										{{"text": "🌐 Hikaku.uz Saytiga O'tish", "url": "https://hikaku.uz"}},
									},
								})
							continue
						}

						name := msg.From.FirstName
						if msg.From.Username != "" {
							name = "@" + msg.From.Username
						}

						authMsg := fmt.Sprintf(
							"🔐 <b>Hikaku.uz Saytiga Kirish So'rovi</b>\n\n"+
								"Salom, <b>%s</b>!\n"+
								"Siz brauzeringiz orqali <b>Hikaku.uz</b> platformasiga ushbu Telegram profilingiz bilan kirishni so'radingiz.\n\n"+
								"⏱ <i>Ushbu tasdiqlash so'rovi 3 daqiqa davomida amal qiladi.</i>\n\n"+
								"Haqiqatan ham saytga kirishni tasdiqlaysizmi?",
							html.EscapeString(name),
						)

						// Note: callback_data must be strictly under 64 bytes for Telegram inline buttons!
						markup := map[string]interface{}{
							"inline_keyboard": [][]map[string]interface{}{
								{
									{"text": "✅ Ha, Kirishni Tasdiqlash", "callback_data": "yes:" + token},
								},
								{
									{"text": "❌ Bekor Qilish", "callback_data": "no:" + token},
								},
							},
						}

						if err := sendTelegramMessage(tokenBot, msg.Chat.ID, authMsg, markup); err != nil {
							log.Printf("[AuthBot] Failed to send auth prompt: %v", err)
						}
						continue
					}

					// General /start without token
					name := msg.From.FirstName
					if name == "" {
						name = "Foydalanuvchi"
					}
					welcomeMsg := fmt.Sprintf(
						"👋 <b>Assalomu alaykum, %s!</b>\n\n"+
							"🤖 Bu <b>Hikaku.uz</b> rasmiy avtorizatsiya boti.\n\n"+
							"Ushbu bot faqat <b>Hikaku.uz</b> platformasiga bir marta bosish orqali xavfsiz va parolsiz kirish (kirishni tasdiqlash) uchun xizmat qiladi.\n\n"+
							"Platformadan to'liq foydalanish uchun quyidagi tugma orqali saytga kiring:",
						html.EscapeString(name),
					)
					markup := map[string]interface{}{
						"inline_keyboard": [][]map[string]interface{}{
							{{"text": "🌐 Hikaku.uz Platformasini Ochish", "url": "https://hikaku.uz"}},
						},
					}
					_ = sendTelegramMessage(tokenBot, msg.Chat.ID, welcomeMsg, markup)
					continue
				}

				// Any other text message
				_ = sendTelegramMessage(tokenBot, msg.Chat.ID,
					"ℹ️ <b>Hikaku.uz Auth Bot</b>\n\n"+
						"Ushbu bot faqat platformaga kirishni tasdiqlash uchun mo'ljallangan.\n"+
						"Saytga kirish yoki animelarni tomosha qilish uchun saytimizga tashrif buyuring:",
					map[string]interface{}{
						"inline_keyboard": [][]map[string]interface{}{
							{{"text": "🌐 Hikaku.uz Saytiga O'tish", "url": "https://hikaku.uz"}},
						},
					})
			}

			// 2. Process Callback Queries
			if update.CallbackQuery != nil {
				cb := update.CallbackQuery
				data := cb.Data

				if strings.HasPrefix(data, "yes:") || strings.HasPrefix(data, "auth_confirm_") {
					token := strings.TrimPrefix(data, "yes:")
					token = strings.TrimPrefix(token, "auth_confirm_")

					var createdAt time.Time
					var isVerified bool
					err := db.QueryRow("SELECT created_at, is_verified FROM anivorm_auth_sessions WHERE token = $1", token).Scan(&createdAt, &isVerified)
					if err != nil || isVerified || time.Since(createdAt) > 3*time.Minute {
						_ = answerTelegramCallback(tokenBot, cb.ID, "⚠️ So'rov eskirgan yoki mavjud emas")
						_ = editTelegramMessage(tokenBot, cb.Message.Chat.ID, cb.Message.MessageID,
							"⚠️ <b>Kirish so'rovi eskirgan!</b>\n\nUshbu so'rov muddati tugagan (3 daqiqa) yoki avvalroq tasdiqlangan. Iltimos, <a href=\"https://hikaku.uz\">Hikaku.uz</a> saytidan qaytadan kiring.",
							map[string]interface{}{
								"inline_keyboard": [][]map[string]interface{}{
									{{"text": "🌐 Hikaku.uz Saytiga O'tish", "url": "https://hikaku.uz"}},
								},
							})
						continue
					}

					// Verify session in DB
					err = db.VerifyAuthSession(token, cb.From.ID, cb.From.Username, cb.From.FirstName, cb.From.LastName, "")
					if err != nil {
						_ = answerTelegramCallback(tokenBot, cb.ID, "Xatolik yuz berdi")
						log.Printf("[AuthBot] VerifyAuthSession failed for token %s: %v", token, err)
						continue
					}

					_ = answerTelegramCallback(tokenBot, cb.ID, "✅ Kirish muvaffaqiyatli tasdiqlandi!")
					_ = editTelegramMessage(tokenBot, cb.Message.Chat.ID, cb.Message.MessageID,
						"✅ <b>Kirish muvaffaqiyatli tasdiqlandi!</b>\n\n"+
							"Siz <b>Hikaku.uz</b> platformasiga muvaffaqiyatli kirdingiz.\n"+
							"Brauzeringizdagi sahifa avtomatik tarzda tizimga kirdi.\n\n"+
							"Marhamat, saytga o'tishingiz mumkin:",
						map[string]interface{}{
							"inline_keyboard": [][]map[string]interface{}{
								{{"text": "🌐 Hikaku.uz ga O'tish", "url": "https://hikaku.uz"}},
							},
						})
					continue
				}

				if strings.HasPrefix(data, "no:") || strings.HasPrefix(data, "auth_cancel_") {
					token := strings.TrimPrefix(data, "no:")
					token = strings.TrimPrefix(token, "auth_cancel_")
					_, _ = db.Exec("DELETE FROM anivorm_auth_sessions WHERE token = $1", token)

					_ = answerTelegramCallback(tokenBot, cb.ID, "❌ Kirish bekor qilindi")
					_ = editTelegramMessage(tokenBot, cb.Message.Chat.ID, cb.Message.MessageID,
						"❌ <b>Kirish so'rovi bekor qilindi.</b>\n\n"+
							"Sizning Telegram hisobingiz saytga kiritilmadi.\n"+
							"Xavfsizligingiz to'liq ta'minlandi.",
						map[string]interface{}{
							"inline_keyboard": [][]map[string]interface{}{
								{{"text": "🌐 Hikaku.uz ga Qaytish", "url": "https://hikaku.uz"}},
							},
						})
					continue
				}
			}
		}
	}

	log.Println("[AuthBot] Bot stopped gracefully.")
}
