package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"anivorm/internal/cache"
	"anivorm/internal/database"
	"anivorm/internal/service"
)

type FandubHandler struct {
	*Handler
	b2Uploader   *service.B2Uploader
	hlsConverter *service.HLSConverter
}

func NewFandubHandler(h *Handler, b2Uploader *service.B2Uploader, hlsConverter *service.HLSConverter) *FandubHandler {
	return &FandubHandler{
		Handler:      h,
		b2Uploader:   b2Uploader,
		hlsConverter: hlsConverter,
	}
}

func parseTelegramID(r *http.Request) int64 {
	val := r.URL.Query().Get("telegram_id")
	if val == "" {
		val = r.Header.Get("X-Telegram-Id")
	}
	if val == "" {
		val = r.Header.Get("X-Telegram-ID")
	}
	if id, err := strconv.ParseInt(strings.TrimSpace(val), 10, 64); err == nil {
		return id
	}
	return 0
}

// GetStudioAnimes returns all animes (including archive) for fandub episode upload selector
func (fh *FandubHandler) GetStudioAnimes(w http.ResponseWriter, r *http.Request) {
	animes, err := fh.db.GetAnimes()
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch animes: " + err.Error(),
			"data":    []database.Anime{},
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"total":   len(animes),
		"data":    animes,
	})
}

// HandleMyStudio handles GET /api/v1/fandub/my-studio and PUT /api/v1/fandub/my-studio
func (fh *FandubHandler) HandleMyStudio(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error":   "Avtorizatsiyadan o'tilmagan yoki Telegram ID topilmadi",
		})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"error":   "Fandub studiyasi topilmadi yoki siz biriktirilmagansiz",
		})
		return
	}

	if r.Method == http.MethodGet {
		epCount, animeCount, _ := fh.db.GetFandubStats(fandub.ID)
		members, _ := fh.db.GetFandubUsers(fandub.ID)

		var availableFandubs []database.Fandub
		if fh.db.CheckIsAdmin(tgID) || tgID == 5415350162 || tgID == 6149114216 {
			availableFandubs, _ = fh.db.GetFandubs()
		} else {
			availableFandubs, _ = fh.db.GetUserFandubs(tgID)
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"fandub":  fandub,
			"role":    role,
			"stats": map[string]int{
				"episodes_count": epCount,
				"animes_count":   animeCount,
			},
			"members":           members,
			"available_fandubs": availableFandubs,
		})
		return
	}

	if r.Method == http.MethodPut {
		if role != "ADMIN" && role != "UPLOADER" {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Faqat studiya Admini yoki Uploaderi studiya profilini o'zgartirishi mumkin",
			})
			return
		}

		var payload struct {
			Name        string `json:"name"`
			LogoURL     string `json:"logo_url"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Noto'g'ri so'rov formati",
			})
			return
		}

		err = fh.db.UpdateFandub(fandub.ID, payload.Name, payload.LogoURL, payload.Description)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error":   "Studiya ma'lumotlarini saqlashda xatolik: " + err.Error(),
			})
			return
		}

		_ = fh.db.CreateAuditLog(tgID, fandub.Name, "UPDATE_STUDIO", "FANDUB", strconv.Itoa(fandub.ID), fmt.Sprintf("Studiya tahrirlandi: %s", payload.Name))
		cache.GlobalCache.Flush()

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Studiya muvaffaqiyatli yangilandi",
		})
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

// GetStudioEpisodes gets all episodes uploaded by this fandub
func (fh *FandubHandler) GetStudioEpisodes(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiya talab qilinadi"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, _, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Fandub studiyasi topilmadi"})
		return
	}

	episodes, err := fh.db.GetFandubEpisodes(fandub.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    episodes,
		"fandub":  fandub,
	})
}

// UploadStudioEpisode uploads an episode strictly attached to caller's fandub
func (fh *FandubHandler) UploadStudioEpisode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiya talab qilinadi"})
		return
	}

	var req struct {
		AnimeID       int    `json:"anime_id"`
		EpisodeNumber int    `json:"episode_number"`
		Title         string `json:"title"`
		B2Key         string `json:"b2_key"`
		VideoURL      string `json:"video_url"`
		ThumbnailURL  string `json:"thumbnail_url"`
		IsVIPOnly     bool   `json:"is_vip_only"`
		FandubID      int    `json:"fandub_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON formati"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	if targetFandubID <= 0 && req.FandubID > 0 {
		targetFandubID = req.FandubID
	}

	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Fandub studiyasiga a'zo emassiz"})
		return
	}

	if req.AnimeID <= 0 || req.EpisodeNumber <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Anime va qism raqami tanlanishi shart"})
		return
	}

	if req.Title == "" {
		req.Title = fmt.Sprintf("%d-qism (%s)", req.EpisodeNumber, fandub.Name)
	}

	var existingOwnerID int
	var existingEpID int
	checkErr := fh.db.QueryRow("SELECT id, COALESCE(fandub_id, 1) FROM anivorm_episodes WHERE anime_id = $1 AND episode_number = $2", req.AnimeID, req.EpisodeNumber).Scan(&existingEpID, &existingOwnerID)
	if checkErr == nil {
		if existingOwnerID != fandub.ID && !fh.isFandubAdminOrOwner(tgID, role) {
			writeJSON(w, http.StatusConflict, map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("%d-qism allaqachon boshqa fandub tomonidan yuklangan! Iltimos, boshqa qism raqamini tanlang.", req.EpisodeNumber),
			})
			return
		}
	}

	// Safety check: Ensure any raw MP4 stored in B2 is automatically converted to HLS
	if strings.HasSuffix(strings.ToLower(req.B2Key), ".mp4") && strings.HasPrefix(strings.TrimPrefix(req.B2Key, "/"), "episodes/") {
		cleanKey := strings.TrimPrefix(req.B2Key, "/")
		remoteURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", cleanKey)
		b2Prefix := fmt.Sprintf("episodes/hls/anime_%d/ep_%d_%d", req.AnimeID, req.EpisodeNumber, time.Now().Unix())
		log.Printf("🎬 [Fandub Auto-HLS] Converting raw MP4 to HLS on upload: %s", cleanKey)
		if hlsKey, err := fh.hlsConverter.ConvertRemoteMP4ToHLS(remoteURL, b2Prefix); err == nil {
			go func(oldKey string) {
				_ = fh.b2Uploader.DeleteFile(oldKey)
			}(cleanKey)
			req.B2Key = hlsKey
			log.Printf("✅ [Fandub Auto-HLS] Successfully converted to: %s", hlsKey)
		} else {
			log.Printf("❌ [Fandub Auto-HLS] Conversion failed on upload: %v", err)
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Video HLS (.m3u8) ga o'tmadi: %v. Qism saqlanmadi!", err),
			})
			return
		}
	}

	if !strings.HasSuffix(strings.ToLower(req.B2Key), ".m3u8") {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Qat'iy talab: Qism faqat HLS (.m3u8) formatida saqlanishi shart!",
		})
		return
	}

	var epID int
	err = fh.db.QueryRow(`
		INSERT INTO anivorm_episodes (
			anime_id, episode_number, title, b2_key,
			thumbnail_url, duration, is_vip_only, has_uzbek_dub,
			has_subtitles, fandub_id
		) VALUES ($1, $2, $3, $4, $5, 1440, $6, TRUE, TRUE, $7)
		ON CONFLICT (anime_id, episode_number) DO UPDATE SET
			title = EXCLUDED.title,
			b2_key = CASE WHEN EXCLUDED.b2_key <> '' THEN EXCLUDED.b2_key ELSE anivorm_episodes.b2_key END,
			thumbnail_url = CASE WHEN EXCLUDED.thumbnail_url <> '' THEN EXCLUDED.thumbnail_url ELSE anivorm_episodes.thumbnail_url END,
			is_vip_only = EXCLUDED.is_vip_only,
			fandub_id = EXCLUDED.fandub_id
		RETURNING id
	`, req.AnimeID, req.EpisodeNumber, req.Title, req.B2Key, req.ThumbnailURL, req.IsVIPOnly, fandub.ID).Scan(&epID)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Epizodni saqlashda xatolik: " + err.Error()})
		return
	}

	// Update anime current_episode
	_, _ = fh.db.Exec("UPDATE anivorm_animes SET current_episode = GREATEST(current_episode, $1) WHERE id = $2", req.EpisodeNumber, req.AnimeID)

	actionMsg := "saqlandi"
	if existingEpID > 0 {
		actionMsg = "yangilandi (almashtirildi)"
	}
	_ = fh.db.CreateAuditLog(tgID, fandub.Name, "UPLOAD_EPISODE", "EPISODE", strconv.Itoa(epID), fmt.Sprintf("Fandub %s tomonidan %d-qism %s", fandub.Name, req.EpisodeNumber, actionMsg))
	cache.GlobalCache.Flush()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"episode_id": epID,
		"message":    fmt.Sprintf("%d-qism muvaffaqiyatli %s!", req.EpisodeNumber, actionMsg),
	})
}

// HandleStudioEpisode handles editing and deleting an episode strictly verifying fandub ownership
func (fh *FandubHandler) HandleStudioEpisode(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiya talab qilinadi"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))

	if r.Method == http.MethodPut {
		var req struct {
			ID            int    `json:"id"`
			EpisodeNumber int    `json:"episode_number"`
			Title         string `json:"title"`
			B2Key         string `json:"b2_key"`
			VideoURL      string `json:"video_url"`
			IsVIPOnly     bool   `json:"is_vip_only"`
			FandubID      int    `json:"fandub_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON"})
			return
		}

		if targetFandubID <= 0 && req.FandubID > 0 {
			targetFandubID = req.FandubID
		}

		fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
		if err != nil || fandub == nil || (!fh.isFandubAdminOrOwner(tgID, role) && role != "UPLOADER") {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Amalni bajarish uchun ruxsat yo'q"})
			return
		}

		// Security Check: Verify this episode actually belongs to this fandub
		var ownerFandubID int
		err = fh.db.QueryRow("SELECT COALESCE(fandub_id, 1) FROM anivorm_episodes WHERE id = $1", req.ID).Scan(&ownerFandubID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Epizod topilmadi"})
			return
		}
		if ownerFandubID != fandub.ID {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Qat'iy taqiq: Boshqa fandub studiyasining qismini tahrirlash huquqingiz yo'q!",
			})
			return
		}

		_, err = fh.db.Exec(`
			UPDATE anivorm_episodes
			SET title = $1, episode_number = $2, is_vip_only = $3,
			    b2_key = CASE WHEN $4 <> '' THEN $4 ELSE b2_key END
			WHERE id = $5 AND fandub_id = $6
		`, req.Title, req.EpisodeNumber, req.IsVIPOnly, req.B2Key, req.ID, fandub.ID)

		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Tahrirlashda xatolik: " + err.Error()})
			return
		}

		_ = fh.db.CreateAuditLog(tgID, fandub.Name, "UPDATE_EPISODE", "EPISODE", strconv.Itoa(req.ID), fmt.Sprintf("Epizod %d tahrirlandi", req.ID))
		cache.GlobalCache.Flush()

		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "Epizod yangilandi"})
		return
	}

	if r.Method == http.MethodDelete {
		fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
		if err != nil || fandub == nil || !fh.isFandubAdminOrOwner(tgID, role) {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Qismni o'chirish faqat Fandub Rahbari (Admin) ga ruxsat etilgan!",
			})
			return
		}

		epID, _ := strconv.Atoi(r.URL.Query().Get("id"))
		if epID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "ID talab qilinadi"})
			return
		}

		// Security Check: Verify this episode belongs to this fandub
		var ownerFandubID int
		var b2Key string
		err = fh.db.QueryRow("SELECT COALESCE(fandub_id, 1), COALESCE(b2_key, '') FROM anivorm_episodes WHERE id = $1", epID).Scan(&ownerFandubID, &b2Key)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Epizod topilmadi"})
			return
		}
		if ownerFandubID != fandub.ID {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Qat'iy taqiq: Boshqa fandub studiyasining qismini o'chirish huquqingiz yo'q!",
			})
			return
		}

		// 1. Delete video file from Backblaze B2 cloud storage and local server storage
		if b2Key != "" && fh.b2Uploader != nil {
			go func(key string) {
				_ = fh.b2Uploader.DeleteEpisodeFiles(key)
			}(b2Key)
		}

		_, err = fh.db.Exec("DELETE FROM anivorm_episodes WHERE id = $1 AND fandub_id = $2", epID, fandub.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "O'chirishda xatolik: " + err.Error()})
			return
		}

		_ = fh.db.CreateAuditLog(tgID, fandub.Name, "DELETE_EPISODE", "EPISODE", strconv.Itoa(epID), fmt.Sprintf("Epizod %d o'chirildi", epID))
		cache.GlobalCache.Flush()

		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "Epizod o'chirildi"})
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

// GetB2UploadTicket provides a direct pre-signed B2 upload ticket for authenticated fandub uploaders
func (fh *FandubHandler) GetB2UploadTicket(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiya talab qilinadi"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, _, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Epizod yuklash uchun ruxsat yo'q"})
		return
	}

	if fh.b2Uploader == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "B2 Uploader tizimi sozlanmagan"})
		return
	}

	uploadURL, token, err := fh.b2Uploader.GetUploadURL()
	if err != nil {
		log.Printf("❌ Failed to get B2 upload URL for fandub: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": fmt.Sprintf("B2 upload URL olishda xatolik: %v", err)})
		return
	}

	animeIDStr := r.URL.Query().Get("anime_id")
	epNumberStr := r.URL.Query().Get("episode_number")
	fileName := r.URL.Query().Get("file_name")

	slug := "staged"
	if animeIDStr != "" && animeIDStr != "0" {
		slug = "anime_" + animeIDStr
	}

	epNum := 1
	if n, err := strconv.Atoi(epNumberStr); err == nil && n > 0 {
		epNum = n
	}

	ext := filepath.Ext(fileName)
	if ext == "" {
		ext = ".mp4"
	}

	b2Key := fmt.Sprintf("episodes/fandub_%d/%s/ep_%d_%d%s", fandub.ID, slug, epNum, time.Now().Unix(), ext)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":             true,
		"upload_url":          uploadURL,
		"authorization_token": token,
		"b2_key":              b2Key,
	})
}


// HandleFandubSettings handles GET and POST for fandub studio settings
func (fh *FandubHandler) HandleFandubSettings(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiya talab etiladi"})
		return
	}
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Fandub topilmadi"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		settings, err := fh.db.GetFandubSettings(fandub.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":  true,
			"settings": settings,
		})

	case http.MethodPost, http.MethodPut:
		if !fh.isFandubAdminOrOwner(tgID, role) {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Faqat Fandub Admini sozlamalarni o'zgartira oladi"})
			return
		}
		var req struct {
			CardNumber string `json:"card_number"`
			CardHolder string `json:"card_holder"`
			VIPPrice   int    `json:"vip_price"`
			ContactURL string `json:"contact_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON formati"})
			return
		}
		if err := fh.db.SaveFandubSettings(fandub.ID, req.CardNumber, req.CardHolder, req.VIPPrice, req.ContactURL); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Fandub VIP va to'lov sozlamalari muvaffaqiyatli saqlandi!",
		})
	}
}

// HandleFandubVIPUsers returns VIP users of this fandub
func (fh *FandubHandler) HandleFandubVIPUsers(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, _, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Fandub topilmadi"})
		return
	}
	users, err := fh.db.GetFandubVIPUsers(fandub.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"users":   users,
	})
}

// HandleGrantFandubVIP grants VIP status to a user for this fandub
func (fh *FandubHandler) HandleGrantFandubVIP(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))

	var req struct {
		TelegramID       int64  `json:"telegram_id"`
		TargetTelegramID int64  `json:"target_telegram_id"`
		Days             int    `json:"days"`
		FullName         string `json:"full_name"`
		Username         string `json:"username"`
		FandubID         int    `json:"fandub_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON"})
		return
	}
	if req.TelegramID <= 0 && req.TargetTelegramID > 0 {
		req.TelegramID = req.TargetTelegramID
	}
	if req.TelegramID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "telegram_id required"})
		return
	}
	if targetFandubID <= 0 && req.FandubID > 0 {
		targetFandubID = req.FandubID
	}

	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Fandub topilmadi"})
		return
	}
	if !fh.isFandubAdminOrOwner(tgID, role) {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Faqat Fandub Admini VIP bera oladi"})
		return
	}
	if req.Days <= 0 {
		req.Days = 30
	}

	if err := fh.db.GrantFandubVIP(fandub.ID, req.TelegramID, req.Days, req.FullName, req.Username); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("%d kunlik [%s] VIP obunasi muvaffaqiyatli biriktirildi!", req.Days, fandub.Name),
	})
}

// HandleRevokeFandubVIP revokes VIP from user in this fandub
func (fh *FandubHandler) HandleRevokeFandubVIP(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))

	var req struct {
		TelegramID       int64 `json:"telegram_id"`
		TargetTelegramID int64 `json:"target_telegram_id"`
		FandubID         int   `json:"fandub_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON"})
		return
	}
	if req.TelegramID <= 0 && req.TargetTelegramID > 0 {
		req.TelegramID = req.TargetTelegramID
	}
	if req.TelegramID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "telegram_id required"})
		return
	}
	if targetFandubID <= 0 && req.FandubID > 0 {
		targetFandubID = req.FandubID
	}

	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Fandub topilmadi"})
		return
	}
	if !fh.isFandubAdminOrOwner(tgID, role) {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Ruxsat yo'q"})
		return
	}

	if err := fh.db.RevokeFandubVIP(fandub.ID, req.TelegramID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Foydalanuvchining Fandub VIP maqomi bekor qilindi",
	})
}

// HandleFandubReceipts returns receipts submitted to this fandub
func (fh *FandubHandler) HandleFandubReceipts(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, _, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Fandub topilmadi"})
		return
	}
	receipts, err := fh.db.GetFandubReceipts(fandub.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"receipts": receipts,
	})
}

// HandleApproveFandubReceipt approves receipt
func (fh *FandubHandler) HandleApproveFandubReceipt(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))

	var req struct {
		ReceiptID int `json:"receipt_id"`
		Days      int `json:"days"`
		FandubID  int `json:"fandub_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ReceiptID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "receipt_id required"})
		return
	}
	if targetFandubID <= 0 && req.FandubID > 0 {
		targetFandubID = req.FandubID
	}

	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil || !fh.isFandubAdminOrOwner(tgID, role) {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Ruxsat yo'q"})
		return
	}
	if req.Days <= 0 {
		req.Days = 30
	}
	if err := fh.db.ApproveFandubReceipt(req.ReceiptID, fandub.ID, req.Days); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "To'lov cheki tasdiqlandi va VIP berildi!"})
}

// HandleRejectFandubReceipt rejects receipt
func (fh *FandubHandler) HandleRejectFandubReceipt(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))

	var req struct {
		ReceiptID int    `json:"receipt_id"`
		Note      string `json:"note"`
		AdminNote string `json:"admin_note"`
		FandubID  int    `json:"fandub_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ReceiptID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "receipt_id required"})
		return
	}
	if req.Note == "" && req.AdminNote != "" {
		req.Note = req.AdminNote
	}
	if targetFandubID <= 0 && req.FandubID > 0 {
		targetFandubID = req.FandubID
	}

	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil || !fh.isFandubAdminOrOwner(tgID, role) {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Ruxsat yo'q"})
		return
	}

	if err := fh.db.RejectFandubReceipt(req.ReceiptID, fandub.ID, req.Note); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "To'lov cheki rad etildi"})
}

// HandleCheckFandubVIP (Public check for Player)
func (fh *FandubHandler) HandleCheckFandubVIP(w http.ResponseWriter, r *http.Request) {
	fandubIDStr := r.URL.Query().Get("fandub_id")
	tgIDStr := r.URL.Query().Get("telegram_id")
	fandubID, _ := strconv.Atoi(fandubIDStr)
	tgID, _ := strconv.ParseInt(tgIDStr, 10, 64)

	isVIP := fh.db.CheckUserFandubVIP(fandubID, tgID)
	settings, _ := fh.db.GetFandubSettings(fandubID)
	fDub, _ := fh.db.GetFandubByID(fandubID)

	name := "Fandub"
	if fDub != nil {
		name = fDub.Name
	}
	contactURL := "https://t.me/iskurama"
	vipPrice := 10000
	if settings != nil {
		if settings.ContactURL != "" {
			contactURL = settings.ContactURL
		}
		if settings.VIPPrice > 0 {
			vipPrice = settings.VIPPrice
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":     true,
		"is_vip":      isVIP,
		"fandub_id":   fandubID,
		"fandub_name": name,
		"contact_url": contactURL,
		"vip_price":   vipPrice,
	})
}

// ConvertHLS converts an uploaded MP4 in B2 to HLS (.m3u8 + .ts) using stream copy (-c copy)
func (fh *FandubHandler) ConvertHLS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiya talab qilinadi"})
		return
	}

	var req struct {
		B2Key         string `json:"b2_key"`
		AnimeID       int    `json:"anime_id"`
		EpisodeNumber int    `json:"episode_number"`
		FandubID      int    `json:"fandub_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	if targetFandubID <= 0 && req.FandubID > 0 {
		targetFandubID = req.FandubID
	}

	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil || (!fh.isFandubAdminOrOwner(tgID, role) && role != "UPLOADER") {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Amalni bajarish uchun ruxsat yo'q"})
		return
	}

	req.B2Key = strings.TrimPrefix(strings.TrimSpace(req.B2Key), "/")
	if req.B2Key == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "b2_key talab qilinadi"})
		return
	}
	if req.EpisodeNumber <= 0 {
		req.EpisodeNumber = 1
	}

	// If already HLS, return directly
	if strings.HasSuffix(strings.ToLower(req.B2Key), ".m3u8") {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"b2_key":  req.B2Key,
			"message": "Fayl allaqachon HLS formatida",
		})
		return
	}

	b2Prefix := fmt.Sprintf("episodes/hls/anime_%d/ep_%d_%d", req.AnimeID, req.EpisodeNumber, time.Now().Unix())
	if req.AnimeID <= 0 {
		b2Prefix = fmt.Sprintf("episodes/hls/fandub_%d/staged/ep_%d_%d", fandub.ID, req.EpisodeNumber, time.Now().Unix())
	}

	hlsManager := service.GetHLSJobManager()
	job := hlsManager.CreateJob(req.B2Key, req.AnimeID, req.EpisodeNumber)

	go func() {
		log.Printf("🎬 [Fandub Async HLS] Starting conversion job %s for anime %d, ep %d from key: %s", job.ID, req.AnimeID, req.EpisodeNumber, req.B2Key)
		hlsManager.UpdateJob(job.ID, "downloading", 5, "📥 B2 dan video tezkor olinmoqda...", "", "")

		hlsKey, err := fh.hlsConverter.ConvertRemoteMP4ToHLSWithProgress(req.B2Key, b2Prefix, func(status string, progress int, msg string) {
			hlsManager.UpdateJob(job.ID, status, progress, msg, "", "")
		})

		if err != nil {
			log.Printf("❌ [Fandub Async HLS] Conversion error for job %s: %v", job.ID, err)
			hlsManager.UpdateJob(job.ID, "failed", 0, fmt.Sprintf("HLS ga o'tkazishda xatolik: %v", err), "", err.Error())
			return
		}

		log.Printf("✅ [Fandub Async HLS] Conversion succeeded for job %s! Result: %s", job.ID, hlsKey)
		hlsManager.UpdateJob(job.ID, "completed", 100, "🎉 Video muvaffaqiyatli HLS formatiga o'tkazildi!", hlsKey, "")

		// Purge original raw MP4 from B2 to save storage
		_ = fh.b2Uploader.DeleteFile(req.B2Key)
	}()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"job_id":  job.ID,
		"status":  "queued",
		"message": "HLS konvertatsiyasi orqa fonda boshlandi",
	})
}

// GET /api/v1/fandub/convert-hls/status?job_id=...
func (fh *FandubHandler) GetHLSJobStatus(w http.ResponseWriter, r *http.Request) {
	jobID := strings.TrimSpace(r.URL.Query().Get("job_id"))
	if jobID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "job_id talab qilinadi"})
		return
	}

	job, exists := service.GetHLSJobManager().GetJob(jobID)
	if !exists {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "HLS vazifasi topilmadi"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"job":     job,
	})
}

// HandleCustomProfile handles GET and POST/PUT for /api/v1/fandub/custom-profile
func (fh *FandubHandler) HandleCustomProfile(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error":   "Avtorizatsiyadan o'tilmagan yoki Telegram ID topilmadi",
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
		fandub, _, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
		if err != nil || fandub == nil {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Fandub studiyasiga kirish huquqingiz yo'q",
			})
			return
		}

		profile, err := fh.db.GetFandubCustomProfile(fandub.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error":   "Sozlamalarni yuklashda xatolik",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"profile": profile,
		})

	case http.MethodPost, http.MethodPut:
		var req struct {
			database.FandubCustomProfile
			LogoURL string `json:"logo_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Noto'g'ri so'rov formati",
			})
			return
		}

		if req.FandubID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "fandub_id kiritilishi shart",
			})
			return
		}

		_, role, err := fh.db.GetUserFandubInfo(tgID, req.FandubID)
		if err != nil || !fh.isFandubAdminOrOwner(tgID, role) {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Faqat studiya rahbari yoki admini dizayn va aloqa sozlamalarini o'zgartira oladi",
			})
			return
		}

		if req.LogoURL != "" {
			_, _ = fh.db.Exec(`UPDATE anivorm_fandubs SET logo_url = $1 WHERE id = $2`, req.LogoURL, req.FandubID)
		}

		if err := fh.db.SaveFandubCustomProfile(req.FandubCustomProfile); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error":   "Sozlamalarni saqlashda xatolik: " + err.Error(),
			})
			return
		}

		// Invalidate public fandub detail cache so changes appear immediately
		cache.GlobalCache.Delete(fmt.Sprintf("fandub:public:%d", req.FandubID))
		cache.GlobalCache.Delete("fandubs:public:list")

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Studiya dizayn va aloqa sozlamalari muvaffaqiyatli saqlandi",
			"profile": req.FandubCustomProfile,
		})

	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{
			"success": false,
			"error":   "Metod qo'llab-quvvatlanmaydi",
		})
	}
}

// Helper to check if a user is an admin or owner of a fandub studio
func (fh *FandubHandler) isFandubAdminOrOwner(tgID int64, role string) bool {
	if tgID == 5415350162 || tgID == 6149114216 {
		return true
	}
	r := strings.ToUpper(strings.TrimSpace(role))
	if r == "ADMIN" || r == "OWNER" || r == "RAHBAR" {
		return true
	}
	if fh.db.CheckIsAdmin(tgID) {
		return true
	}
	return false
}

// GET, POST, DELETE /api/v1/fandub/members
func (fh *FandubHandler) HandleFandubMembers(w http.ResponseWriter, r *http.Request) {
	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiyadan o'tilmagan"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Fandub studiyasiga kirish huquqingiz yo'q"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		users, err := fh.db.GetFandubUsers(fandub.ID)
		if err != nil {
			users = []database.FandubUser{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"members": users,
		})

	case http.MethodPost:
		if !fh.isFandubAdminOrOwner(tgID, role) {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Faqat studiya admini yangi jamoadosh qo'sha oladi"})
			return
		}

		var body struct {
			TelegramID int64  `json:"telegram_id"`
			Username   string `json:"username"`
			Role       string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON formati"})
			return
		}

		cleanUsername := strings.TrimSpace(strings.TrimPrefix(body.Username, "@"))
		resolvedTgID := body.TelegramID

		if resolvedTgID <= 0 && cleanUsername != "" {
			_ = fh.db.QueryRow(`
				SELECT telegram_id FROM anivorm_users
				WHERE LOWER(username) = LOWER($1)
				LIMIT 1
			`, cleanUsername).Scan(&resolvedTgID)
		}

		if resolvedTgID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   "Foydalanuvchining to'g'ri Telegram ID yoki tizimda ro'yxatdan o'tgan @username'ini kiriting",
			})
			return
		}

		cleanRole := strings.ToUpper(strings.TrimSpace(body.Role))
		if cleanRole == "" {
			cleanRole = "VOICE"
		}

		// Insert or update member role
		_, err = fh.db.Exec(`
			INSERT INTO anivorm_fandub_users (fandub_id, telegram_id, role)
			VALUES ($1, $2, $3)
			ON CONFLICT (fandub_id, telegram_id) DO UPDATE SET role = EXCLUDED.role
		`, fandub.ID, resolvedTgID, cleanRole)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Jamoadoshni saqlashda xatolik: " + err.Error()})
			return
		}

		cache.GlobalCache.Delete(fmt.Sprintf("fandub:public:%d", fandub.ID))

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "🎉 Jamoadosh muvaffaqiyatli qo'shildi!",
		})

	case http.MethodDelete:
		if !fh.isFandubAdminOrOwner(tgID, role) {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Faqat studiya admini jamoadoshni o'chira oladi"})
			return
		}

		targetID, _ := strconv.Atoi(r.URL.Query().Get("id"))
		targetTgID, _ := strconv.ParseInt(r.URL.Query().Get("telegram_id"), 10, 64)

		if targetID <= 0 && targetTgID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "O'chirilishi kerak bo'lgan a'zo ID ko'rsatilmadi"})
			return
		}

		if targetTgID == tgID {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "O'zingizni jamoa adminligidan chiqara olmaysiz"})
			return
		}

		var query string
		var arg interface{}
		if targetID > 0 {
			query = `DELETE FROM anivorm_fandub_users WHERE id = $1 AND fandub_id = $2`
			arg = targetID
		} else {
			query = `DELETE FROM anivorm_fandub_users WHERE telegram_id = $1 AND fandub_id = $2`
			arg = targetTgID
		}

		res, err := fh.db.Exec(query, arg, fandub.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Jamoadoshni o'chirishda xatolik: " + err.Error()})
			return
		}

		rowsAff, _ := res.RowsAffected()
		if rowsAff == 0 {
			writeJSON(w, http.StatusNotFound, map[string]interface{}{"success": false, "error": "Bunday jamoadosh topilmadi"})
			return
		}

		cache.GlobalCache.Delete(fmt.Sprintf("fandub:public:%d", fandub.ID))

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Jamoadosh studiyadan chiqarildi",
		})

	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "Metod qo'llab-quvvatlanmaydi"})
	}
}

// POST /api/v1/fandub/upload-image (Uploads Logo or Banner, deletes old file from B2/storage)
func (fh *FandubHandler) HandleUploadFandubImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "Method not allowed"})
		return
	}

	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiyadan o'tilmagan"})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 15<<20)
	if err := r.ParseMultipartForm(15 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Rasm hajmi juda katta (maks 15MB)"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.FormValue("fandub_id"))
	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Fandub studiyasiga kirish huquqingiz yo'q"})
		return
	}
	if !fh.isFandubAdminOrOwner(tgID, role) {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Faqat studiya admini rasmlarni o'zgartira oladi"})
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		file, header, err = r.FormFile("file")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Rasm fayli yuklanmadi"})
			return
		}
	}
	defer file.Close()

	imgType := strings.ToLower(strings.TrimSpace(r.FormValue("type")))
	if imgType != "banner" {
		imgType = "logo"
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" || (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif") {
		ext = ".jpg"
	}

	tempDir := "/tmp/anivorm_fandub_images"
	_ = os.MkdirAll(tempDir, 0755)
	tempFile := filepath.Join(tempDir, fmt.Sprintf("upload_%d%s", time.Now().UnixNano(), ext))

	outFile, err := os.Create(tempFile)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Vaqtinchalik fayl yaratib bo'lmadi"})
		return
	}
	if _, err := io.Copy(outFile, file); err != nil {
		outFile.Close()
		_ = os.Remove(tempFile)
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Faylni saqlab bo'lmadi"})
		return
	}
	outFile.Close()
	defer os.Remove(tempFile)

	// Clean old file if exists
	var oldURL string
	if imgType == "logo" {
		oldURL = fandub.LogoURL
	} else {
		prof, _ := fh.db.GetFandubCustomProfile(fandub.ID)
		if prof != nil {
			oldURL = prof.BannerURL
		}
	}

	if oldURL != "" && strings.Contains(oldURL, "cdn.hikaku.uz/") {
		oldKey := strings.TrimPrefix(oldURL, "https://cdn.hikaku.uz/")
		oldKey = strings.TrimPrefix(oldKey, "http://cdn.hikaku.uz/")
		if oldKey != "" {
			go func(k string) {
				_ = fh.b2Uploader.DeleteFile(k)
			}(oldKey)
		}
	}

	b2Key := fmt.Sprintf("images/fandub_%s/%s_%d%s", imgType, fandub.Slug, time.Now().Unix(), ext)
	uploadedKey, err := fh.b2Uploader.UploadFile(tempFile, b2Key)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": "Storagega yuklab bo'lmadi: " + err.Error()})
		return
	}

	publicURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", uploadedKey)

	// Update DB
	if imgType == "logo" {
		_, _ = fh.db.Exec(`UPDATE anivorm_fandubs SET logo_url = $1 WHERE id = $2`, publicURL, fandub.ID)
	} else {
		_, _ = fh.db.Exec(`
			INSERT INTO anivorm_fandub_custom_profiles (fandub_id, banner_url, updated_at)
			VALUES ($1, $2, CURRENT_TIMESTAMP)
			ON CONFLICT (fandub_id) DO UPDATE SET banner_url = EXCLUDED.banner_url, updated_at = CURRENT_TIMESTAMP
		`, fandub.ID, publicURL)
	}

	cache.GlobalCache.Delete(fmt.Sprintf("fandub:public:%d", fandub.ID))
	cache.GlobalCache.Delete("fandubs:public:list")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"url":     publicURL,
		"key":     uploadedKey,
		"message": "Rasm muvaffaqiyatli saqlandi",
	})
}

// DELETE /api/v1/fandub/delete-image?type=logo|banner
func (fh *FandubHandler) HandleDeleteFandubImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{"success": false, "error": "Method not allowed"})
		return
	}

	tgID := parseTelegramID(r)
	if tgID == 0 {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{"success": false, "error": "Avtorizatsiyadan o'tilmagan"})
		return
	}

	targetFandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
	fandub, role, err := fh.db.GetUserFandubInfo(tgID, targetFandubID)
	if err != nil || fandub == nil {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Fandub studiyasiga kirish huquqingiz yo'q"})
		return
	}
	if !fh.isFandubAdminOrOwner(tgID, role) {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Faqat studiya admini rasmni o'chira oladi"})
		return
	}

	imgType := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("type")))
	if imgType != "banner" {
		imgType = "logo"
	}

	var oldURL string
	if imgType == "logo" {
		oldURL = fandub.LogoURL
		_, _ = fh.db.Exec(`UPDATE anivorm_fandubs SET logo_url = '' WHERE id = $1`, fandub.ID)
	} else {
		prof, _ := fh.db.GetFandubCustomProfile(fandub.ID)
		if prof != nil {
			oldURL = prof.BannerURL
		}
		_, _ = fh.db.Exec(`UPDATE anivorm_fandub_custom_profiles SET banner_url = '' WHERE fandub_id = $1`, fandub.ID)
	}

	if oldURL != "" && strings.Contains(oldURL, "cdn.hikaku.uz/") {
		oldKey := strings.TrimPrefix(oldURL, "https://cdn.hikaku.uz/")
		oldKey = strings.TrimPrefix(oldKey, "http://cdn.hikaku.uz/")
		if oldKey != "" {
			go func(k string) {
				_ = fh.b2Uploader.DeleteFile(k)
			}(oldKey)
		}
	}

	cache.GlobalCache.Delete(fmt.Sprintf("fandub:public:%d", fandub.ID))
	cache.GlobalCache.Delete("fandubs:public:list")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Rasm storage va profildan muvaffaqiyatli o'chirildi",
	})
}

