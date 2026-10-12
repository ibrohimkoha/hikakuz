package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"anivorm/internal/config"
	"anivorm/internal/database"
	"anivorm/internal/handler"
	"anivorm/internal/service"
)

func panicRecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("🔥 [PANIC RECOVERED] on %s %s: %v", r.Method, r.URL.Path, err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"success": false,
					"error":   "Ichki server xatoligi yuz berdi",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Range, X-Telegram-Id, X-Admin-Token")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg := config.LoadConfig()

	log.Printf("🚀 Starting Anivorm High-Security API Backend...")
	log.Printf("📡 Configuration: Port=%s, DB=%s@%s:%s", cfg.Port, cfg.DBName, cfg.DBHost, cfg.DBPort)
	log.Printf("☁️ Backblaze B2: Bucket=%s, Endpoint=%s", cfg.B2BucketName, cfg.B2Endpoint)

	db, err := database.InitDB(cfg)
	if err != nil {
		log.Printf("⚠️ Database connection notice: %v", err)
	}

	jikanService := service.NewJikanService()
	b2Streamer := service.NewB2Streamer(cfg)
	b2Uploader := service.NewB2Uploader(cfg)
	hlsConverter := service.NewHLSConverter(b2Uploader)

	h := handler.NewHandler(cfg, db, jikanService, b2Streamer)
	ah := handler.NewAdminHandler(h, b2Uploader, hlsConverter)

	mux := http.NewServeMux()

	// Public API Endpoints
	mux.HandleFunc("/api/v1/anime/genres", h.GetGenres)
	mux.HandleFunc("/api/v1/anime/catalog", h.GetCatalog)
	mux.HandleFunc("/api/v1/anime/trending", h.GetTrending)
	mux.HandleFunc("/api/v1/anime/recent", h.GetRecent)
	mux.HandleFunc("/api/v1/anime/search", h.SearchAnime)
	mux.HandleFunc("/api/v1/anime/search-external", h.SearchExternalAnime)
	mux.HandleFunc("/api/v1/anime/detail-external", h.GetExternalAnimeDetail)
	mux.HandleFunc("/api/v1/anime/detail", h.GetAnimeDetail)
	mux.HandleFunc("/api/v1/anime/related", h.GetRelated)
	mux.HandleFunc("/api/v1/translate", h.TranslateText)
	mux.HandleFunc("/api/v1/config/info", h.GetConfigInfo)
	mux.HandleFunc("/api/v1/fandubs", h.GetFandubs)
	mux.HandleFunc("/api/v1/fandub/public-detail", h.GetFandubPublicDetail)
	mux.HandleFunc("/api/v1/fandub/follow", h.ToggleFandubFollow)

	// Fandub Studio API Endpoints
	fh := handler.NewFandubHandler(h, b2Uploader, hlsConverter)
	mux.HandleFunc("/api/v1/fandub/my-studio", fh.HandleMyStudio)
	mux.HandleFunc("/api/v1/fandub/episodes", fh.GetStudioEpisodes)
	mux.HandleFunc("/api/v1/fandub/upload-episode", fh.UploadStudioEpisode)
	mux.HandleFunc("/api/v1/fandub/convert-hls", fh.ConvertHLS)
	mux.HandleFunc("/api/v1/fandub/convert-hls/status", fh.GetHLSJobStatus)
	mux.HandleFunc("/api/v1/fandub/episode", fh.HandleStudioEpisode)
	mux.HandleFunc("/api/v1/fandub/b2-upload-ticket", fh.GetB2UploadTicket)
	mux.HandleFunc("/api/v1/fandub/settings", fh.HandleFandubSettings)
	mux.HandleFunc("/api/v1/fandub/vip-users", fh.HandleFandubVIPUsers)
	mux.HandleFunc("/api/v1/fandub/vip-users/grant", fh.HandleGrantFandubVIP)
	mux.HandleFunc("/api/v1/fandub/vip-users/revoke", fh.HandleRevokeFandubVIP)
	mux.HandleFunc("/api/v1/fandub/receipts", fh.HandleFandubReceipts)
	mux.HandleFunc("/api/v1/fandub/receipts/approve", fh.HandleApproveFandubReceipt)
	mux.HandleFunc("/api/v1/fandub/receipts/reject", fh.HandleRejectFandubReceipt)
	mux.HandleFunc("/api/v1/fandub/check-vip", fh.HandleCheckFandubVIP)
	mux.HandleFunc("/api/v1/fandub/custom-profile", fh.HandleCustomProfile)
	mux.HandleFunc("/api/v1/fandub/members", fh.HandleFandubMembers)
	mux.HandleFunc("/api/v1/fandub/upload-image", fh.HandleUploadFandubImage)
	mux.HandleFunc("/api/v1/fandub/delete-image", fh.HandleDeleteFandubImage)
	mux.HandleFunc("/api/v1/fandub/animes", fh.GetStudioAnimes)

	// Auth Endpoints (1-Click Telegram Login)
	mux.HandleFunc("/api/v1/auth/role", h.GetUserRole)
	mux.HandleFunc("/api/v1/auth/telegram/token", h.CreateAuthTelegramToken)
	mux.HandleFunc("/api/v1/auth/telegram/check", h.CheckAuthTelegramSession)

	// Stream Security Tokens
	mux.HandleFunc("/api/v1/stream/token", h.GetStreamToken)

	// Comments API
	mux.HandleFunc("/api/v1/anime/comments", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			h.AddComment(w, r)
		} else {
			h.GetComments(w, r)
		}
	})

	// Stream Video Proxy (Registered for both /stream/episode/ and /api/v1/stream/episode/)
	mux.HandleFunc("/stream/episode/", h.StreamEpisode)
	mux.HandleFunc("/api/v1/stream/episode/", h.StreamEpisode)

	// Stealth Mode Admin Guard: Unauthenticated requests get 404 Not Found
	adminGuard := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			token := ""
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
			}
			if token == "" {
				token = r.URL.Query().Get("token")
			}
			if token == "" {
				token = r.Header.Get("X-Admin-Token")
			}
			if token == "" {
				if c, err := r.Cookie("anivorm_token"); err == nil {
					token = c.Value
				}
			}

			isValid := false
			if token != "" {
				if db.VerifyAdminToken(token) {
					isValid = true
				}
			}

			if !isValid {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error": "page not found",
				})
				return
			}
			next(w, r)
		}
	}

	// Admin & Management API Endpoints (All Protected by Stealth Guard)
	mux.HandleFunc("/api/v1/admin/stats", adminGuard(ah.GetStats))

	mux.HandleFunc("/api/v1/admin/settings", adminGuard(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			ah.SaveSettings(w, r)
		} else {
			ah.GetSettings(w, r)
		}
	}))

	mux.HandleFunc("/api/v1/admin/anime", adminGuard(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			ah.DeleteAnime(w, r)
		} else if r.Method == http.MethodPost {
			ah.SaveAnime(w, r)
		} else if r.Method == http.MethodGet {
			ah.GetAllAnimes(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/api/v1/admin/animes", adminGuard(ah.GetAllAnimes))
	mux.HandleFunc("/api/v1/admin/anime/toggle-trending", adminGuard(ah.ToggleTrending))
	mux.HandleFunc("/api/v1/admin/episodes", adminGuard(ah.GetAllEpisodes))

	mux.HandleFunc("/api/v1/admin/episode", adminGuard(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			ah.DeleteEpisode(w, r)
		} else if r.Method == http.MethodPost || r.Method == http.MethodPut {
			ah.SaveEpisode(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/api/v1/admin/upload-episode", adminGuard(ah.UploadEpisode))
	mux.HandleFunc("/api/v1/admin/convert-hls", adminGuard(ah.ConvertHLS))
	mux.HandleFunc("/api/v1/admin/convert-hls/status", adminGuard(ah.GetHLSJobStatus))
	mux.HandleFunc("/api/v1/admin/upload-image", adminGuard(ah.UploadImage))
	mux.HandleFunc("/api/v1/admin/translate", adminGuard(ah.TranslateText))
	mux.HandleFunc("/api/v1/admin/b2-upload-ticket", adminGuard(ah.GetB2UploadTicket))
	mux.HandleFunc("/api/v1/admin/staged-videos", adminGuard(ah.GetStagedVideos))
	mux.HandleFunc("/api/v1/admin/staged-video", adminGuard(ah.DeleteStagedVideo))
	mux.HandleFunc("/api/v1/admin/upload-status", adminGuard(ah.GetUploadStatus))
	mux.HandleFunc("/api/v1/admin/users", adminGuard(ah.GetUsers))
	mux.HandleFunc("/api/v1/admin/users/grant-vip", adminGuard(ah.GrantVIP))
	mux.HandleFunc("/api/v1/admin/users/revoke-vip", adminGuard(ah.RevokeVIP))
	mux.HandleFunc("/api/v1/admin/receipts", adminGuard(ah.GetReceipts))
	mux.HandleFunc("/api/v1/admin/receipts/approve", adminGuard(ah.ApproveReceipt))
	mux.HandleFunc("/api/v1/admin/receipts/reject", adminGuard(ah.RejectReceipt))
	mux.HandleFunc("/api/v1/admin/admins", adminGuard(ah.HandleAdmins))
	mux.HandleFunc("/api/v1/admin/fandubs", adminGuard(ah.HandleAdminFandubs))
	mux.HandleFunc("/api/v1/admin/fandubs/users", adminGuard(ah.HandleAdminFandubUsers))
	mux.HandleFunc("/api/v1/admin/fandubs/settings", adminGuard(ah.HandleAdminFandubSettings))
	mux.HandleFunc("/api/v1/admin/audit-logs", adminGuard(ah.GetAuditLogs))

	// Required Channels (Majburiy kanallar) & VIP Claim Endpoints
	mux.HandleFunc("/api/v1/admin/channels", adminGuard(ah.GetChannels))
	mux.HandleFunc("/api/v1/admin/channel", adminGuard(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			ah.DeleteChannel(w, r)
		} else if r.Method == http.MethodPost {
			ah.SaveChannel(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/api/v1/anime/claim-vip/start", ah.StartVIPClaim)
	mux.HandleFunc("/api/v1/anime/claim-vip/status", ah.CheckVIPClaimStatus)

	// Wrap with logging & CORS
	handlerWithCORS := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/stream/") && !strings.Contains(r.URL.Path, "/stream/episode/") {
			log.Printf("➡️ %s %s", r.Method, r.URL.Path)
		}
		mux.ServeHTTP(w, r)
	}))

	serverAddr := ":" + cfg.Port
	log.Printf("✅ Anivorm Backend HTTP Server listening on %s", serverAddr)
	if err := http.ListenAndServe(serverAddr, panicRecoveryMiddleware(handlerWithCORS)); err != nil {
		log.Fatalf("Fatal server error: %v", err)
	}
}
