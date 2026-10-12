package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"anivorm/internal/database"
	"anivorm/internal/service"
	"anivorm/internal/transcoder"
	"anivorm/internal/cache"
)

// transcodeQueueSemaphore strictly limits concurrent FFmpeg conversions to 1 at a time.
// Prevents CPU starvation and crashes when multiple fandubs upload videos concurrently.
var transcodeQueueSemaphore = make(chan struct{}, 1)

type AdminHandler struct {
	*Handler
	b2Uploader   *service.B2Uploader
	hlsConverter *service.HLSConverter
	jobManager   *service.JobManager
}

func NewAdminHandler(h *Handler, uploader *service.B2Uploader, hlsConverter *service.HLSConverter) *AdminHandler {
	return &AdminHandler{
		Handler:      h,
		b2Uploader:   uploader,
		hlsConverter: hlsConverter,
		jobManager:   service.GetJobManager(),
	}
}

// GET /api/v1/admin/stats
func (ah *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats := ah.db.GetStats()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"stats":   stats,
	})
}

// GET /api/v1/admin/settings
func (ah *AdminHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings := ah.db.GetSettings()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"settings": settings,
	})
}

// POST /api/v1/admin/settings
func (ah *AdminHandler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	var s database.PlatformSettings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, `{"error":"Invalid request JSON"}`, http.StatusBadRequest)
		return
	}

	if err := ah.db.SaveSettings(s); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Failed to save settings: %v"}`, err), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"message":  "To'lov va platforma sozlamalari muvaffaqiyatli saqlandi!",
		"settings": s,
	})
}

// GET /api/v1/admin/animes
func (ah *AdminHandler) GetAllAnimes(w http.ResponseWriter, r *http.Request) {
	animes, err := ah.db.GetAnimes()
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

// DELETE /api/v1/admin/anime
func (ah *AdminHandler) DeleteAnime(w http.ResponseWriter, r *http.Request) {
	actorTgID := extractActorTgID(r)
	_, role := ah.db.GetUserAdminRole(actorTgID)
	if role != "FOUNDER" && role != "SUPERADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"error":   "Animeni o'chirish huquqingiz yo'q! Bu faqat SuperAdmin yoki Asoschi (Founder) vakolatida.",
		})
		return
	}

	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"Invalid anime ID"}`, http.StatusBadRequest)
		return
	}

	// 1. Episode Guard: If anime has any episodes, strictly prevent deletion!
	if episodes, err := ah.db.GetEpisodesByAnimeID(id); err == nil && len(episodes) > 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Qat'iy taqiq: Ushbu animeda %d ta qism (fandub dublyajlari) mavjud! Animeni o'chirishdan oldin uning barcha qismlarini o'chirib chiqishingiz shart.", len(episodes)),
		})
		return
	}

	// 2. Delete anime record from database (only allowed if 0 episodes)
	if err := ah.db.DeleteAnime(id); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Animeni o'chirishda xatolik: %v", err),
		})
		return
	}

	// Cache Flush & Audit Log
	cache.GlobalCache.Flush()
	ah.db.CreateAuditLog(actorTgID, "Admin", "ANIME_DELETE", "ANIME", strconv.Itoa(id), fmt.Sprintf(`{"deleted_anime_id":%d}`, id))

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Anime muvaffaqiyatli o'chirildi!",
	})
}

// POST /api/v1/admin/anime/toggle-trending
func (ah *AdminHandler) ToggleTrending(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	_ = ah.db.ToggleAnimeTrending(body.ID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Trend statusi o'zgartirildi!",
	})
}

// GET /api/v1/admin/episodes
func (ah *AdminHandler) GetAllEpisodes(w http.ResponseWriter, r *http.Request) {
	episodes, err := ah.db.GetAllEpisodes()
	if err != nil {
		episodes = []database.Episode{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    episodes,
	})
}

// DELETE /api/v1/admin/episode
func (ah *AdminHandler) DeleteEpisode(w http.ResponseWriter, r *http.Request) {
	actorTgID := extractActorTgID(r)
	_, role := ah.db.GetUserAdminRole(actorTgID)
	if role != "FOUNDER" && role != "SUPERADMIN" {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{
			"success": false,
			"error":   "Qismlarni o'chirish huquqingiz yo'q! Bu faqat SuperAdmin yoki Asoschi (Founder) vakolatida.",
		})
		return
	}

	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"Invalid episode ID"}`, http.StatusBadRequest)
		return
	}

	// 1. Delete video file from Backblaze B2 cloud storage
	if ep, err := ah.db.GetEpisodeByID(id); err == nil && ep != nil && ep.B2Key != "" {
		go func(key string) {
			_ = ah.b2Uploader.DeleteEpisodeFiles(key)
		}(ep.B2Key)
	}

	// 2. Delete episode record from DB
	if err := ah.db.DeleteEpisode(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to delete episode: %v", err),
		})
		return
	}

	// Cache Flush & Audit Log
	cache.GlobalCache.Flush()
	ah.db.CreateAuditLog(actorTgID, "Admin", "EPISODE_DELETE", "EPISODE", strconv.Itoa(id), fmt.Sprintf(`{"deleted_id":%d}`, id))

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Qism va uning bulutdagi video fayli muvaffaqiyatli o'chirildi!",
	})
}

// GET /api/v1/admin/users
func (ah *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := ah.db.GetUsers()
	if err != nil {
		users = []database.User{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    users,
	})
}

// POST /api/v1/admin/users/grant-vip
func (ah *AdminHandler) GrantVIP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID     int64  `json:"user_id"`
		TelegramID *int64 `json:"telegram_id"`
		Days       int    `json:"days"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}
	if body.Days <= 0 {
		body.Days = 30
	}

	err := ah.db.GrantVIP(body.UserID, body.TelegramID, body.Days)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Failed to grant VIP: %v"}`, err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("%d kunlik VIP maqomi muvaffaqiyatli berildi!", body.Days),
	})
}

// POST /api/v1/admin/users/revoke-vip
func (ah *AdminHandler) RevokeVIP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID     int64  `json:"user_id"`
		TelegramID *int64 `json:"telegram_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	err := ah.db.RevokeVIP(body.UserID, body.TelegramID)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Failed to revoke VIP: %v"}`, err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "VIP maqomi bekor qilindi!",
	})
}

// GET /api/v1/admin/receipts
func (ah *AdminHandler) GetReceipts(w http.ResponseWriter, r *http.Request) {
	receipts, err := ah.db.GetReceipts()
	if err != nil {
		receipts = []database.Receipt{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    receipts,
	})
}

// POST /api/v1/admin/receipts/approve
func (ah *AdminHandler) ApproveReceipt(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	_ = ah.db.ApproveReceipt(body.ID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Chek tasdiqlandi va foydalanuvchiga 30 kunlik VIP berildi!",
	})
}

// POST /api/v1/admin/receipts/reject
func (ah *AdminHandler) RejectReceipt(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID   int    `json:"id"`
		Note string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	_ = ah.db.RejectReceipt(body.ID, body.Note)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Chek rad etildi!",
	})
}

// POST /api/v1/admin/anime
func (ah *AdminHandler) SaveAnime(w http.ResponseWriter, r *http.Request) {
	var anime database.Anime
	if err := json.NewDecoder(r.Body).Decode(&anime); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if anime.Slug == "" {
		anime.Slug = service.Slugify(anime.TitleUz)
	}

	// Auto-mirror external poster and banner to B2 (cdn.hikaku.uz)
	if anime.PosterURL != "" && !strings.HasPrefix(anime.PosterURL, "https://cdn.hikaku.uz/") {
		anime.PosterURL = ah.MirrorExternalImageToB2(anime.PosterURL, "posters", anime.Slug)
	}
	if anime.BannerURL != "" && !strings.HasPrefix(anime.BannerURL, "https://cdn.hikaku.uz/") {
		anime.BannerURL = ah.MirrorExternalImageToB2(anime.BannerURL, "banners", anime.Slug)
	}

	if err := ah.db.SaveAnime(&anime); err != nil {
		log.Printf("SaveAnime DB error: %v", err)
		http.Error(w, fmt.Sprintf(`{"error":"Failed to save anime in database: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Cache Flush & Audit Log
	cache.GlobalCache.Flush()
	tgID, _ := strconv.ParseInt(r.Header.Get("X-Telegram-Id"), 10, 64)
	ah.db.CreateAuditLog(tgID, "Admin", "ANIME_SAVE", "ANIME", strconv.Itoa(anime.ID), fmt.Sprintf(`{"title":%q,"slug":%q}`, anime.TitleUz, anime.Slug))

	// Pre-warm Next.js image cache in background
	go func(pURL string) {
		if pURL == "" {
			return
		}
		c := &http.Client{Timeout: 8 * time.Second}
		for _, w := range []int{240, 360, 480} {
			warmURL := fmt.Sprintf("http://127.0.0.1:3008/_next/image?url=%s&w=%d&q=70", url.QueryEscape(pURL), w)
			req, _ := http.NewRequest("GET", warmURL, nil)
			req.Header.Set("Accept", "image/avif,image/webp,*/*")
			if res, err := c.Do(req); err == nil {
				res.Body.Close()
			}
		}
	}(anime.PosterURL)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Anime muvaffaqiyatli saqlandi!",
		"anime":   anime,
	})
}

// POST /api/v1/admin/upload-episode (Asynchronous Background Job Processor)
func (ah *AdminHandler) UploadEpisode(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10240 << 20)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Fayl hajmi juda katta yoki xato: %v"}`, err), http.StatusBadRequest)
		return
	}

	animeIDStr := r.FormValue("anime_id")
	epNumberStr := r.FormValue("episode_number")
	title := r.FormValue("title")
	isVIPStr := r.FormValue("is_vip_only")
	animeSlug := r.FormValue("anime_slug")
	dubStudio := r.FormValue("dub_studio")
	crfStr := r.FormValue("crf")
	resolution := r.FormValue("resolution")
	skipCompression := r.FormValue("skip_compression") == "true" || r.FormValue("mode") == "direct"

	animeID, _ := strconv.Atoi(animeIDStr)
	epNumber, _ := strconv.Atoi(epNumberStr)
	isVIP := isVIPStr == "true" || isVIPStr == "1"
	crf, _ := strconv.Atoi(crfStr)
	if crf <= 0 {
		crf = 26
	}

	if title == "" {
		title = fmt.Sprintf("%d-qism", epNumber)
	}
	if dubStudio != "" {
		title = fmt.Sprintf("%s (%s)", title, dubStudio)
	}
	if animeSlug == "" || animeSlug == "anime_0" {
		animeSlug = "staged"
	}

	file, header, err := r.FormFile("video_file")
	if err != nil {
		http.Error(w, `{"error":"Video fayl topilmadi"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	tempDir := "/tmp/anivorm_uploads"
	_ = os.MkdirAll(tempDir, 0755)

	jobID := fmt.Sprintf("job_%d_%d_%d", animeID, epNumber, time.Now().UnixNano())
	tempInputPath := filepath.Join(tempDir, fmt.Sprintf("raw_%s_%s", jobID, header.Filename))
	tempOutputFile := filepath.Join(tempDir, fmt.Sprintf("compressed_%s.mp4", jobID))
	tempThumbFile := filepath.Join(tempDir, fmt.Sprintf("thumb_%s.jpg", jobID))

	outRaw, err := os.Create(tempInputPath)
	if err != nil {
		http.Error(w, `{"error":"Serverda vaqtinchalik fayl yaratib bo'lmadi"}`, http.StatusInternalServerError)
		return
	}
	_, _ = io.Copy(outRaw, file)
	outRaw.Close()

	// Register Job in Global Job Manager
	service.GetJobManager().CreateJob(jobID, "📤 Video qabul qilindi, tayyorlanmoqda...")
	log.Printf("📌 Registered Upload Job: %s (DirectSkip=%v)", jobID, skipCompression)

	// Spawn Background Worker Goroutine
	go func() {
		defer func() {
			_ = os.Remove(tempInputPath)
			_ = os.Remove(tempOutputFile)
			_ = os.Remove(tempThumbFile)
		}()

		var finalUploadPath string
		thumbnailURL := ""

		if skipCompression {
			service.GetJobManager().UpdateJob(jobID, "uploading_b2", 40, "☁️ Backblaze B2 ('iskurama') bulutiga to'g'ridan-to'g'ri yuklanmoqda...", "", nil)
			log.Printf("⚡ [Job %s] Direct B2 upload without compression for Anime ID %d Ep %d", jobID, animeID, epNumber)
			finalUploadPath = tempInputPath

			// Fast 1-second thumbnail extraction using ffmpeg
			thumbArgs := []string{
				"-y", "-ss", "00:00:15", "-i", tempInputPath, "-vframes", "1", "-q:v", "2", tempThumbFile,
			}
			if err := exec.Command("ffmpeg", thumbArgs...).Run(); err == nil {
				b2ThumbKey := fmt.Sprintf("thumbnails/%s/ep_%d_%d.jpg", animeSlug, epNumber, time.Now().Unix())
				if thumbKey, err := ah.b2Uploader.UploadFile(tempThumbFile, b2ThumbKey); err == nil {
					thumbnailURL = thumbKey
				}
			}
		} else {
			service.GetJobManager().UpdateJob(jobID, "queued", 15, "⏳ Konvertatsiya navbatida kutilmoqda (server barqarorligi uchun 1 tadan ishlanadi)...", "", nil)
			log.Printf("⏳ [Job %s] Waiting in queue for FFmpeg lock (Anime ID %d Ep %d)...", jobID, animeID, epNumber)

			// Concurrency: 1 Queue lock
			transcodeQueueSemaphore <- struct{}{}

			service.GetJobManager().UpdateJob(jobID, "transcoding", 30, fmt.Sprintf("⚙️ Anime FFmpeg siqilmoqda (-tune animation, CRF %d)...", crf), "", nil)
			log.Printf("⚙️ [Job %s] Fast Transcoding Anime ID %d Ep %d (CRF=%d)...", jobID, animeID, epNumber, crf)

			transcodeErr := transcoder.CompressAnimeVideo(transcoder.TranscoderOptions{
				InputPath:     tempInputPath,
				OutputPath:    tempOutputFile,
				ThumbnailPath: tempThumbFile,
				CRF:           crf,
				Preset:        "veryfast",
				AudioBitrate:  "128k",
				Resolution:    resolution,
				TuneAnimation: true,
			})

			// Release lock immediately after FFmpeg completes
			<-transcodeQueueSemaphore

			finalUploadPath = tempOutputFile
			if transcodeErr != nil {
				log.Printf("⚠️ [Job %s] FFmpeg notice (%v). Uploading original file.", jobID, transcodeErr)
				finalUploadPath = tempInputPath
			}

			if _, err := os.Stat(tempThumbFile); err == nil {
				b2ThumbKey := fmt.Sprintf("thumbnails/%s/ep_%d_%d.jpg", animeSlug, epNumber, time.Now().Unix())
				if thumbKey, err := ah.b2Uploader.UploadFile(tempThumbFile, b2ThumbKey); err == nil {
					thumbnailURL = thumbKey
				}
			}
		}

		service.GetJobManager().UpdateJob(jobID, "converting_hls", 70, "⚙️ HLS (.m3u8) formatiga o'tkazilmoqda va B2 ga yuklanmoqda...", "", nil)

		b2Prefix := fmt.Sprintf("episodes/hls/anime_%d/ep_%d_%d", animeID, epNumber, time.Now().Unix())
		if animeID <= 0 {
			b2Prefix = fmt.Sprintf("episodes/hls/staged/ep_%d_%d", epNumber, time.Now().Unix())
		}
		log.Printf("☁️ [Job %s] Converting to HLS and uploading to Backblaze B2: %s", jobID, b2Prefix)

		uploadedKey, err := ah.hlsConverter.ConvertLocalMP4ToHLS(finalUploadPath, b2Prefix)
		if err != nil {
			log.Printf("❌ [Job %s] B2 HLS conversion error: %v", jobID, err)
			service.GetJobManager().UpdateJob(jobID, "failed", 0, "Yuklashda xatolik yuz berdi", fmt.Sprintf("HLS ga o'tkazib B2 bulutiga yuklab bo'lmadi: %v", err), nil)
			return
		}

		service.GetJobManager().SetJobVideo(jobID, uploadedKey, thumbnailURL)

		if animeID > 0 {
			ep := database.Episode{
				AnimeID:       animeID,
				EpisodeNumber: epNumber,
				Title:         title,
				B2Key:         uploadedKey,
				ThumbnailURL:  thumbnailURL,
				Duration:      1440,
				IsVIPOnly:     isVIP,
				HasUzbekDub:   true,
				HasSubtitles:  true,
				StreamURL:     fmt.Sprintf("/stream/episode/%d", epNumber),
			}
			if err := ah.db.SaveEpisode(&ep); err != nil {
				log.Printf("❌ [Job %s] Database SaveEpisode error: %v", jobID, err)
				service.GetJobManager().UpdateJob(jobID, "failed", 0, "Bazada qismni saqlashda xatolik", err.Error(), nil)
				return
			}
			service.GetJobManager().UpdateJob(jobID, "completed", 100, "🎉 Qism muvaffaqiyatli yuklandi va HLS formatida saqlandi!", "", &ep)
			log.Printf("✅ [Job %s] Transcoding & HLS Upload Completed for Anime ID %d Ep %d", jobID, animeID, epNumber)
		} else {
			service.GetJobManager().UpdateJob(jobID, "completed", 100, "🎉 Video HLS formatida B2 bulutiga muvaffaqiyatli yuklandi!", "", nil)
			log.Printf("✅ [Job %s] HLS Video Uploaded to B2: %s", jobID, uploadedKey)
		}
	}()

	// Return instantly with job_id
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"job_id":  jobID,
		"message": "Video serverga yuklandi va qayta ishlash boshlandi.",
	})
}

// POST /api/v1/admin/convert-hls
// Converts an uploaded MP4 in B2 to HLS (.m3u8 + .ts) asynchronously
func (ah *AdminHandler) ConvertHLS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		B2Key         string `json:"b2_key"`
		AnimeID       int    `json:"anime_id"`
		EpisodeNumber int    `json:"episode_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "Noto'g'ri JSON"})
		return
	}

	req.B2Key = strings.TrimPrefix(strings.TrimSpace(req.B2Key), "/")
	if req.B2Key == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "b2_key talab qilinadi"})
		return
	}

	// If already HLS, return directly
	if strings.HasSuffix(strings.ToLower(req.B2Key), ".m3u8") {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":    true,
			"b2_key":     req.B2Key,
			"result_key": req.B2Key,
			"status":     "completed",
			"message":    "Fayl allaqachon HLS formatida",
		})
		return
	}

	b2Prefix := fmt.Sprintf("episodes/hls/anime_%d/ep_%d_%d", req.AnimeID, req.EpisodeNumber, time.Now().Unix())
	if req.AnimeID <= 0 {
		b2Prefix = fmt.Sprintf("episodes/hls/staged/ep_%d_%d", req.EpisodeNumber, time.Now().Unix())
	}

	hlsManager := service.GetHLSJobManager()
	job := hlsManager.CreateJob(req.B2Key, req.AnimeID, req.EpisodeNumber)

	go func() {
		log.Printf("🎬 [Admin Async HLS] Starting conversion job %s for anime %d, ep %d from key: %s", job.ID, req.AnimeID, req.EpisodeNumber, req.B2Key)
		hlsManager.UpdateJob(job.ID, "downloading", 5, "📥 B2 dan video tezkor olinmoqda...", "", "")

		hlsKey, err := ah.hlsConverter.ConvertRemoteMP4ToHLSWithProgress(req.B2Key, b2Prefix, func(status string, progress int, msg string) {
			hlsManager.UpdateJob(job.ID, status, progress, msg, "", "")
		})

		if err != nil {
			log.Printf("❌ [Admin Async HLS] Conversion error for job %s: %v", job.ID, err)
			hlsManager.UpdateJob(job.ID, "failed", 0, fmt.Sprintf("HLS ga o'tkazishda xatolik: %v", err), "", err.Error())
			return
		}

		log.Printf("✅ [Admin Async HLS] Conversion succeeded for job %s! Result: %s", job.ID, hlsKey)
		hlsManager.UpdateJob(job.ID, "completed", 100, "🎉 Video muvaffaqiyatli HLS formatiga o'tkazildi!", hlsKey, "")

		// Purge original raw MP4 from B2 to save storage
		_ = ah.b2Uploader.DeleteFile(req.B2Key)
	}()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"job_id":  job.ID,
		"status":  "queued",
		"message": "HLS konvertatsiyasi orqa fonda boshlandi",
	})
}

// GET /api/v1/admin/convert-hls/status?job_id=...
func (ah *AdminHandler) GetHLSJobStatus(w http.ResponseWriter, r *http.Request) {
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

// GET /api/v1/admin/upload-status?job_id=...
func (ah *AdminHandler) GetUploadStatus(w http.ResponseWriter, r *http.Request) {
	jobID := strings.TrimSpace(r.URL.Query().Get("job_id"))
	if jobID == "" {
		http.Error(w, `{"error":"job_id required"}`, http.StatusBadRequest)
		return
	}

	job, exists := service.GetJobManager().GetJob(jobID)
	if !exists {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"error":   "Upload vazifasi topilmadi",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"job":     job,
	})
}

// GET /api/v1/admin/b2-upload-ticket
func (ah *AdminHandler) GetB2UploadTicket(w http.ResponseWriter, r *http.Request) {
	uploadURL, token, err := ah.b2Uploader.GetUploadURL()
	if err != nil {
		log.Printf("❌ Failed to get B2 upload URL: %v", err)
		http.Error(w, fmt.Sprintf(`{"error":"B2 upload URL olishda xatolik: %v"}`, err), http.StatusInternalServerError)
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

	b2Key := fmt.Sprintf("episodes/%s/ep_%d_%d%s", slug, epNum, time.Now().Unix(), ext)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":             true,
		"upload_url":          uploadURL,
		"authorization_token": token,
		"b2_key":              b2Key,
	})
}

// GET /api/v1/admin/staged-videos
func (ah *AdminHandler) GetStagedVideos(w http.ResponseWriter, r *http.Request) {
	files, err := ah.b2Uploader.ListStagedFiles()
	if err != nil {
		log.Printf("⚠️ ListStagedFiles error: %v", err)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"files":   []service.B2StagedFile{},
		})
		return
	}

	episodes, _ := ah.db.GetAllEpisodes()
	linkedMap := make(map[string]bool)
	for _, ep := range episodes {
		if ep.B2Key != "" {
			linkedMap[ep.B2Key] = true
		}
	}

	var unlinked []service.B2StagedFile
	for _, f := range files {
		if !linkedMap[f.FileName] {
			unlinked = append(unlinked, f)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"files":   unlinked,
		"data":    unlinked,
	})
}

// DELETE /api/v1/admin/staged-video?file_name=...
func (ah *AdminHandler) DeleteStagedVideo(w http.ResponseWriter, r *http.Request) {
	fileName := strings.TrimSpace(r.URL.Query().Get("file_name"))
	if fileName == "" {
		http.Error(w, `{"error":"file_name required"}`, http.StatusBadRequest)
		return
	}

	if err := ah.b2Uploader.DeleteFile(fileName); err != nil {
		log.Printf("❌ DeleteStagedVideo error: %v", err)
		http.Error(w, fmt.Sprintf(`{"error":"B2 dan o'chirib bo'lmadi: %v"}`, err), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Fayl B2 dan muvaffaqiyatli o'chirildi",
	})
}

// POST /api/v1/admin/episode (Direct Link or metadata save)
func (ah *AdminHandler) SaveEpisode(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID             int    `json:"id"`
		AnimeID        int    `json:"anime_id"`
		EpisodeNumber  int    `json:"episode_number"`
		Title          string `json:"title"`
		VideoURL       string `json:"video_url"`
		DirectURL      string `json:"direct_url"`
		StreamURL      string `json:"stream_url"`
		ThumbnailURL   string `json:"thumbnail_url"`
		Duration       int    `json:"duration"`
		IsVIPOnly      bool   `json:"is_vip_only"`
		DubStudio      string `json:"dub_studio"`
		FandubID       int    `json:"fandub_id"`
		PostToTelegram bool   `json:"post_to_telegram"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"Invalid request JSON"}`, http.StatusBadRequest)
		return
	}

	if body.AnimeID <= 0 || body.EpisodeNumber <= 0 {
		http.Error(w, `{"error":"Anime ID va qism raqami majburiy"}`, http.StatusBadRequest)
		return
	}

	if body.FandubID <= 0 {
		body.FandubID = 1
	}

	if body.DubStudio == "" && body.FandubID > 0 {
		var fName string
		_ = ah.db.QueryRow("SELECT name FROM anivorm_fandubs WHERE id = $1", body.FandubID).Scan(&fName)
		body.DubStudio = fName
	}

	if body.Title == "" {
		body.Title = fmt.Sprintf("%d-qism", body.EpisodeNumber)
	}
	if body.DubStudio != "" && !strings.Contains(body.Title, body.DubStudio) {
		body.Title = fmt.Sprintf("%s (%s)", body.Title, body.DubStudio)
	}

	videoLink := body.VideoURL
	if videoLink == "" {
		videoLink = body.DirectURL
	}
	if videoLink == "" {
		videoLink = body.StreamURL
	}
	if videoLink == "" {
		videoLink = fmt.Sprintf("episodes/anime_%d/ep_%d.mp4", body.AnimeID, body.EpisodeNumber)
	}

	// Safety check: Ensure any raw MP4 stored in B2 is automatically converted to HLS
	if strings.HasSuffix(strings.ToLower(videoLink), ".mp4") && strings.HasPrefix(strings.TrimPrefix(videoLink, "/"), "episodes/") {
		cleanKey := strings.TrimPrefix(videoLink, "/")
		remoteURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", cleanKey)
		b2Prefix := fmt.Sprintf("episodes/hls/anime_%d/ep_%d_%d", body.AnimeID, body.EpisodeNumber, time.Now().Unix())
		log.Printf("🎬 [Admin Auto-HLS] Converting raw MP4 to HLS on SaveEpisode: %s", cleanKey)
		if hlsKey, err := ah.hlsConverter.ConvertRemoteMP4ToHLS(remoteURL, b2Prefix); err == nil {
			go func(oldKey string) {
				_ = ah.b2Uploader.DeleteFile(oldKey)
			}(cleanKey)
			videoLink = hlsKey
			log.Printf("✅ [Admin Auto-HLS] Successfully converted to: %s", hlsKey)
		} else {
			log.Printf("❌ [Admin Auto-HLS] Conversion failed on save: %v", err)
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Video HLS (.m3u8) ga o'tmadi: %v. Qism saqlanmadi!", err),
			})
			return
		}
	}

	if !strings.HasSuffix(strings.ToLower(videoLink), ".m3u8") {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Qat'iy talab: Qism faqat HLS (.m3u8) formatida saqlanishi shart!",
		})
		return
	}

	if body.Duration <= 0 {
		body.Duration = 1440
	}

	if body.FandubID <= 0 {
		body.FandubID = 1
	}

	ep := database.Episode{
		ID:            body.ID,
		AnimeID:       body.AnimeID,
		EpisodeNumber: body.EpisodeNumber,
		Title:         body.Title,
		B2Key:         videoLink,
		ThumbnailURL:  body.ThumbnailURL,
		Duration:      body.Duration,
		IsVIPOnly:     body.IsVIPOnly,
		FandubID:      body.FandubID,
		HasUzbekDub:   true,
		HasSubtitles:  true,
		StreamURL:     fmt.Sprintf("/stream/episode/%d", body.EpisodeNumber),
	}

	if err := ah.db.SaveEpisode(&ep); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Bazada qismni saqlab bo'lmadi: %v"}`, err), http.StatusInternalServerError)
		return
	}

	if body.PostToTelegram {
		go ah.PostEpisodeToTelegramChannel(&ep, body.DubStudio)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "🎉 Qism muvaffaqiyatli saqlandi!",
		"episode": ep,
	})
}

// GET /api/v1/admin/channels
func (ah *AdminHandler) GetChannels(w http.ResponseWriter, r *http.Request) {
	channels, err := ah.db.GetRequiredChannels()
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Kanallarni olishda xatolik: %v"}`, err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"channels": channels,
	})
}

// POST /api/v1/admin/channel
func (ah *AdminHandler) SaveChannel(w http.ResponseWriter, r *http.Request) {
	var c database.RequiredChannel
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, `{"error":"Noto'g'ri so'rov formati"}`, http.StatusBadRequest)
		return
	}
	if c.Platform == "" {
		c.Platform = "telegram"
	}
	if c.ChannelID == "" || c.Title == "" {
		http.Error(w, `{"error":"Kanal ID va Nomi to'ldirilishi shart"}`, http.StatusBadRequest)
		return
	}
	if err := ah.db.SaveRequiredChannel(&c); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Kanalni saqlashda xatolik: %v"}`, err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Majburiy kanal muvaffaqiyatli saqlandi!",
	})
}

// DELETE /api/v1/admin/channel
func (ah *AdminHandler) DeleteChannel(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, `{"error":"Noto'g'ri kanal ID"}`, http.StatusBadRequest)
		return
	}
	if err := ah.db.DeleteRequiredChannel(id); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Kanalni o'chirishda xatolik: %v"}`, err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Kanal o'chirildi!",
	})
}

// POST /api/v1/anime/claim-vip/start
func (ah *AdminHandler) StartVIPClaim(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	token := fmt.Sprintf("claim_%d", time.Now().UnixNano())
	if err := ah.db.CreateVIPClaim(token, body.Email); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Claim yaratishda xatolik: %v"}`, err), http.StatusInternalServerError)
		return
	}

	botUsername := "hikakuzbot"
	botURL := fmt.Sprintf("https://t.me/%s?start=%s", botUsername, token)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"token":     token,
		"bot_url":   botURL,
		"bot_name":  botUsername,
	})
}

// GET /api/v1/anime/claim-vip/status
func (ah *AdminHandler) CheckVIPClaimStatus(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, `{"error":"Token kiritilmadi"}`, http.StatusBadRequest)
		return
	}

	isVerified, err := ah.db.CheckVIPClaim(token)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":     false,
			"is_verified": false,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":     true,
		"is_verified": isVerified,
	})
}

// PostEpisodeToTelegramChannel posts announcement to Telegram channel
func (ah *AdminHandler) PostEpisodeToTelegramChannel(ep *database.Episode, dubStudio string) error {
	token := ah.cfg.TelegramPostBotToken
	channel := ah.cfg.TelegramChannel
	if token == "" || channel == "" {
		log.Printf("⚠️ [TelegramPost] Bot token or channel not configured")
		return nil
	}

	anime, _ := ah.db.GetAnimeBySlug(fmt.Sprintf("%d", ep.AnimeID))
	animeTitle := "Yangi Anime"
	animeSlug := fmt.Sprintf("%d", ep.AnimeID)
	var genres []string
	year := 0
	posterURL := ""

	if anime != nil {
		if anime.TitleUz != "" {
			animeTitle = anime.TitleUz
		} else if anime.TitleEn != "" {
			animeTitle = anime.TitleEn
		}
		if anime.Slug != "" {
			animeSlug = anime.Slug
		}
		genres = anime.Genres
		year = anime.Year
		posterURL = anime.PosterURL
	}

	dubText := dubStudio
	if dubText == "" {
		dubText = "Hikaku Dub"
	}

	watchURL := fmt.Sprintf("%s/watch/%s?ep=%d", ah.cfg.HikakuURL, animeSlug, ep.EpisodeNumber)
	cleanChannel := strings.TrimPrefix(channel, "@")

	caption := fmt.Sprintf("🎬 <b>%s</b>\n\n"+
		"🔢 <b>Qism:</b> %d-qism\n"+
		"🎙 <b>Ovoz:</b> %s\n",
		animeTitle, ep.EpisodeNumber, dubText)

	if year > 0 {
		caption += fmt.Sprintf("📅 <b>Yil:</b> %d\n", year)
	}
	if len(genres) > 0 {
		caption += fmt.Sprintf("⭐ <b>Janr:</b> %s\n", strings.Join(genres, ", "))
	}

	caption += fmt.Sprintf("\n🍿 Tomosha qilish uchun quyidagi tugmani bosing!\n\n"+
		"🌐 <a href=\"%s\">Hikaku.uz da ko'rish</a>\n"+
		"💬 Kanalimiz: @%s", watchURL, cleanChannel)

	replyMarkup := map[string]interface{}{
		"inline_keyboard": [][]map[string]string{
			{
				{"text": "🍿 Tomosha qilish", "url": watchURL},
				{"text": "📢 Kanalga a'zo bo'lish", "url": "https://t.me/" + cleanChannel},
			},
		},
	}

	log.Printf("📢 [TelegramPost] Posting episode %d of '%s' to %s via bot...", ep.EpisodeNumber, animeTitle, channel)

	// If posterURL is valid, try sendPhoto
	if posterURL != "" && (strings.HasPrefix(posterURL, "http://") || strings.HasPrefix(posterURL, "https://")) {
		err := sendTelegramPhoto(token, channel, posterURL, caption, replyMarkup)
		if err == nil {
			log.Printf("✅ [TelegramPost] Photo post sent to %s successfully!", channel)
			return nil
		}
		log.Printf("⚠️ [TelegramPost] sendPhoto notice (%v), attempting text fallback...", err)
	}

	// Fallback to text message
	err := sendTelegramMessage(token, channel, caption, replyMarkup)
	if err != nil {
		log.Printf("❌ [TelegramPost] Failed to post to Telegram channel %s: %v", channel, err)
		return err
	}
	log.Printf("✅ [TelegramPost] Text post sent to %s successfully!", channel)
	return nil
}

func sendTelegramMessage(token string, channel string, text string, replyMarkup interface{}) error {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	payload := map[string]interface{}{
		"chat_id":    channel,
		"text":       text,
		"parse_mode": "HTML",
	}
	if replyMarkup != nil {
		payload["reply_markup"] = replyMarkup
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func sendTelegramPhoto(token string, channel string, photoURL string, caption string, replyMarkup interface{}) error {
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendPhoto", token)
	payload := map[string]interface{}{
		"chat_id":    channel,
		"photo":      photoURL,
		"caption":    caption,
		"parse_mode": "HTML",
	}
	if replyMarkup != nil {
		payload["reply_markup"] = replyMarkup
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}


// MirrorExternalImageToB2 automatically downloads an external image and uploads it to B2 under cdn.hikaku.uz
func (ah *AdminHandler) MirrorExternalImageToB2(externalURL string, imgType string, slug string) string {
	if externalURL == "" {
		return ""
	}
	if strings.HasPrefix(externalURL, "https://cdn.hikaku.uz/") {
		return externalURL
	}
	if !strings.HasPrefix(externalURL, "http://") && !strings.HasPrefix(externalURL, "https://") {
		return externalURL
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", externalURL, nil)
	if err != nil {
		return externalURL
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		log.Printf("⚠️ [Auto-Mirror] Failed to fetch external image %s (status: %v, err: %v)", externalURL, resp.StatusCode, err)
		return externalURL
	}
	defer resp.Body.Close()

	ext := ".jpg"
	ct := strings.ToLower(resp.Header.Get("Content-Type"))
	if strings.Contains(ct, "png") {
		ext = ".png"
	} else if strings.Contains(ct, "webp") {
		ext = ".webp"
	}

	cleanSlug := service.Slugify(slug)
	if cleanSlug == "" {
		cleanSlug = fmt.Sprintf("img_%d", time.Now().Unix())
	}
	if len(cleanSlug) > 28 {
		cleanSlug = cleanSlug[:28]
	}

	tempDir := "/tmp/anivorm_images"
	_ = os.MkdirAll(tempDir, 0755)
	tempFile := filepath.Join(tempDir, fmt.Sprintf("mirror_%d%s", time.Now().UnixNano(), ext))
	outFile, err := os.Create(tempFile)
	if err != nil {
		return externalURL
	}
	if _, err := io.Copy(outFile, resp.Body); err != nil {
		outFile.Close()
		_ = os.Remove(tempFile)
		return externalURL
	}
	outFile.Close()
	defer os.Remove(tempFile)

	b2Key := fmt.Sprintf("%s/%s_%d%s", imgType, cleanSlug, time.Now().Unix(), ext)
	uploadedKey, err := ah.b2Uploader.UploadFile(tempFile, b2Key)
	if err != nil {
		log.Printf("⚠️ [Auto-Mirror] B2 upload error for %s: %v", b2Key, err)
		return externalURL
	}

	mirroredURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", uploadedKey)
	log.Printf("🎉 [Auto-Mirror] Mirrored %s -> %s", externalURL, mirroredURL)
	return mirroredURL
}

// POST /api/v1/admin/upload-image (Upload Poster or Banner to B2)
func (ah *AdminHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 15<<20)
	if err := r.ParseMultipartForm(15 << 20); err != nil {
		http.Error(w, `{"error":"Rasm hajmi juda katta (maks 15MB)"}`, http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		file, header, err = r.FormFile("file")
		if err != nil {
			http.Error(w, `{"error":"Rasm fayli topilmadi"}`, http.StatusBadRequest)
			return
		}
	}
	defer file.Close()

	imgType := r.FormValue("type")
	if imgType == "" {
		imgType = "posters"
	}
	if !strings.HasSuffix(imgType, "s") {
		imgType = imgType + "s"
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" || (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif") {
		ext = ".jpg"
	}

	tempDir := "/tmp/anivorm_images"
	_ = os.MkdirAll(tempDir, 0755)
	tempFile := filepath.Join(tempDir, fmt.Sprintf("upload_%d%s", time.Now().UnixNano(), ext))

	outFile, err := os.Create(tempFile)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Vaqtinchalik fayl yaratib bo'lmadi: %v"}`, err), http.StatusInternalServerError)
		return
	}
	if _, err := io.Copy(outFile, file); err != nil {
		outFile.Close()
		_ = os.Remove(tempFile)
		http.Error(w, fmt.Sprintf(`{"error":"Faylni saqlab bo'lmadi: %v"}`, err), http.StatusInternalServerError)
		return
	}
	outFile.Close()
	defer os.Remove(tempFile)

	rawName := strings.TrimSuffix(filepath.Base(header.Filename), ext)
	reg := regexp.MustCompile("[^a-zA-Z0-9_-]+")
	cleanName := reg.ReplaceAllString(rawName, "_")
	cleanName = strings.Trim(cleanName, "_")
	if cleanName == "" {
		cleanName = "img"
	}
	if len(cleanName) > 24 {
		cleanName = cleanName[:24]
	}
	b2Key := fmt.Sprintf("%s/%s_%d%s", imgType, cleanName, time.Now().Unix(), ext)

	uploadedKey, err := ah.b2Uploader.UploadFile(tempFile, b2Key)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"B2 bulutiga yuklab bo'lmadi: %v"}`, err), http.StatusInternalServerError)
		return
	}

	publicURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", uploadedKey)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"key":     uploadedKey,
		"url":     publicURL,
		"message": "Rasm B2 bulutiga muvaffaqiyatli yuklandi",
	})
}

// POST /api/v1/admin/translate (Translate Synopsis to Uzbek)
func (ah *AdminHandler) TranslateText(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Text       string `json:"text"`
		TargetLang string `json:"target_lang"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Text) == "" {
		http.Error(w, `{"error":"Matn kiritilmadi"}`, http.StatusBadRequest)
		return
	}

	targetLang := body.TargetLang
	if targetLang == "" {
		targetLang = "uz"
	}

	translateURL := fmt.Sprintf("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=%s&dt=t&q=%s",
		url.QueryEscape(targetLang),
		url.QueryEscape(body.Text),
	)

	resp, err := http.Get(translateURL)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Tarjima servisiga bog'lanib bo'lmadi: %v"}`, err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf(`{"error":"Tarjima xizmati xatosi: %d"}`, resp.StatusCode), http.StatusInternalServerError)
		return
	}

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"Tarjima javobini o'qib bo'lmadi"}`, http.StatusInternalServerError)
		return
	}

	var result []interface{}
	if err := json.Unmarshal(respBytes, &result); err != nil || len(result) == 0 {
		http.Error(w, `{"error":"Tarjima javobini tahlil qilib bo'lmadi"}`, http.StatusInternalServerError)
		return
	}

	var sb strings.Builder
	if chunks, ok := result[0].([]interface{}); ok {
		for _, chunk := range chunks {
			if piece, ok := chunk.([]interface{}); ok && len(piece) > 0 {
				if str, ok := piece[0].(string); ok {
					sb.WriteString(str)
				}
			}
		}
	}

	translated := sb.String()
	if translated == "" {
		translated = body.Text
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":         true,
		"translated_text": translated,
	})
}




func extractActorTgID(r *http.Request) int64 {
	if id, err := strconv.ParseInt(r.Header.Get("X-Telegram-Id"), 10, 64); err == nil && id > 0 {
		return id
	}
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		parts := strings.Split(token, "_")
		if len(parts) >= 3 {
			if id, err := strconv.ParseInt(parts[2], 10, 64); err == nil && id > 0 {
				return id
			}
		}
	}
	if cookie, err := r.Cookie("anivorm_token"); err == nil && cookie.Value != "" {
		parts := strings.Split(cookie.Value, "_")
		if len(parts) >= 3 {
			if id, err := strconv.ParseInt(parts[2], 10, 64); err == nil && id > 0 {
				return id
			}
		}
	}
	return 0
}

// /api/v1/admin/admins
func (ah *AdminHandler) HandleAdmins(w http.ResponseWriter, r *http.Request) {
	actorTgID := extractActorTgID(r)

	switch r.Method {
	case http.MethodGet:
		admins, err := ah.db.GetAdmins()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":    true,
			"admins":     admins,
			"is_founder": ah.db.IsFounder(actorTgID),
		})

	case http.MethodPost:
		var req struct {
			TelegramID int64  `json:"telegram_id"`
			FullName   string `json:"full_name"`
			Role       string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TelegramID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "telegram_id required"})
			return
		}
		if req.FullName == "" {
			req.FullName = fmt.Sprintf("Admin_%d", req.TelegramID)
		}
		if req.Role == "" {
			req.Role = "ADMIN"
		}
		if err := ah.db.AddOrUpdateAdmin(req.TelegramID, req.FullName, req.Role, actorTgID); err != nil {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Admin muvaffaqiyatli saqlandi",
		})

	case http.MethodDelete:
		tgIDStr := r.URL.Query().Get("telegram_id")
		targetTgID, err := strconv.ParseInt(tgIDStr, 10, 64)
		if err != nil || targetTgID <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "valid telegram_id required"})
			return
		}
		if ah.db.IsFounder(targetTgID) {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": "Asoschi (Founder) daxlsiz, o'chirilishi mumkin emas"})
			return
		}
		if err := ah.db.RemoveAdmin(targetTgID, actorTgID); err != nil {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Admin muvaffaqiyatli chiqarib tashlandi",
		})

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// ==================== FANDUB & AUDIT LOG HANDLERS ====================

// GET, POST, DELETE /api/v1/admin/fandubs
func (ah *AdminHandler) HandleAdminFandubs(w http.ResponseWriter, r *http.Request) {
	tgID, _ := strconv.ParseInt(r.Header.Get("X-Telegram-Id"), 10, 64)

	switch r.Method {
	case http.MethodGet:
		list, err := ah.db.GetFandubs()
		if err != nil {
			list = []database.Fandub{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    list,
		})

	case http.MethodPost:
		var body struct {
			Name        string `json:"name"`
			Slug        string `json:"slug"`
			LogoURL     string `json:"logo_url"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
			return
		}
		if body.Name == "" {
			http.Error(w, `{"error":"Fandub nomi kiritilishi shart"}`, http.StatusBadRequest)
			return
		}
		if body.Slug == "" {
			body.Slug = service.Slugify(body.Name)
		}

		f, err := ah.db.CreateFandub(body.Name, body.Slug, body.LogoURL, body.Description)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Fandub yaratishda xato: %v"}`, err), http.StatusInternalServerError)
			return
		}

		ah.db.CreateAuditLog(tgID, "Admin", "FANDUB_CREATE", "FANDUB", strconv.Itoa(f.ID), fmt.Sprintf(`{"name":%q}`, f.Name))
		cache.GlobalCache.Flush()

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"fandub":  f,
		})

	case http.MethodDelete:
		actorTgID := extractActorTgID(r)
		_, role := ah.db.GetUserAdminRole(actorTgID)
		if role != "FOUNDER" && role != "SUPERADMIN" {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"error":   "Fandub studiyasini o'chirish huquqingiz yo'q! Bu faqat SuperAdmin yoki Asoschi (Founder) vakolatida.",
			})
			return
		}

		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil || id <= 0 {
			http.Error(w, `{"error":"Noto'g'ri Fandub ID"}`, http.StatusBadRequest)
			return
		}

		if err := ah.db.DeleteFandub(id); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Fandubni o'chirishda xato: %v", err),
			})
			return
		}

		ah.db.CreateAuditLog(actorTgID, "Admin", "FANDUB_DELETE", "FANDUB", strconv.Itoa(id), fmt.Sprintf(`{"deleted_fandub_id":%d}`, id))
		cache.GlobalCache.Flush()

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Fandub muvaffaqiyatli o'chirildi",
		})

	default:
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// HandleAdminFandubSettings handles GET and POST /api/v1/admin/fandubs/settings
func (ah *AdminHandler) HandleAdminFandubSettings(w http.ResponseWriter, r *http.Request) {
	tgID, _ := strconv.ParseInt(r.Header.Get("X-Telegram-Id"), 10, 64)

	switch r.Method {
	case http.MethodGet:
		fandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
		if fandubID <= 0 {
			http.Error(w, `{"error":"fandub_id is required"}`, http.StatusBadRequest)
			return
		}
		settings, err := ah.db.GetFandubSettings(fandubID)
		if err != nil {
			settings = &database.FandubSettings{FandubID: fandubID, VIPPrice: 10000, ContactURL: "https://t.me/iskurama"}
		}
		var tgAdmin, tgChannel string
		_ = ah.db.QueryRow(`
			SELECT COALESCE(telegram_admin, ''), COALESCE(telegram_channel, '')
			FROM anivorm_fandub_custom_profiles WHERE fandub_id = $1
		`, fandubID).Scan(&tgAdmin, &tgChannel)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":          true,
			"settings":         settings,
			"telegram_admin":   tgAdmin,
			"telegram_channel": tgChannel,
		})

	case http.MethodPost:
		var body struct {
			FandubID        int    `json:"fandub_id"`
			ContactURL      string `json:"contact_url"`
			VIPPrice        int    `json:"vip_price"`
			CardNumber      string `json:"card_number"`
			CardHolder      string `json:"card_holder"`
			TelegramChannel string `json:"telegram_channel"`
			TelegramAdmin   string `json:"telegram_admin"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
			return
		}
		if body.FandubID <= 0 {
			http.Error(w, `{"error":"Fandub ID majburiy"}`, http.StatusBadRequest)
			return
		}
		if body.VIPPrice <= 0 {
			body.VIPPrice = 10000
		}
		cleanContact := strings.TrimSpace(body.ContactURL)
		if cleanContact == "" && strings.TrimSpace(body.TelegramAdmin) != "" {
			cleanContact = strings.TrimSpace(body.TelegramAdmin)
		}
		if cleanContact == "" {
			cleanContact = "https://t.me/iskurama"
		}
		if !strings.HasPrefix(cleanContact, "http://") && !strings.HasPrefix(cleanContact, "https://") {
			cleanContact = "https://t.me/" + strings.TrimPrefix(strings.TrimPrefix(cleanContact, "@"), "t.me/")
		}

		err := ah.db.SaveFandubSettings(body.FandubID, body.CardNumber, body.CardHolder, body.VIPPrice, cleanContact)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Sozlamalarni saqlashda xato: %v"}`, err), http.StatusInternalServerError)
			return
		}

		cleanAdmin := strings.TrimSpace(body.TelegramAdmin)
		if cleanAdmin == "" {
			cleanAdmin = strings.TrimSpace(body.ContactURL)
		}
		cleanChannel := strings.TrimSpace(body.TelegramChannel)

		_, _ = ah.db.Exec(`
			INSERT INTO anivorm_fandub_custom_profiles (fandub_id, telegram_admin, telegram_channel, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (fandub_id) DO UPDATE
			SET telegram_admin = CASE WHEN $2 <> '' THEN $2 ELSE anivorm_fandub_custom_profiles.telegram_admin END,
			    telegram_channel = CASE WHEN $3 <> '' THEN $3 ELSE anivorm_fandub_custom_profiles.telegram_channel END,
			    updated_at = NOW()
		`, body.FandubID, cleanAdmin, cleanChannel)

		ah.db.CreateAuditLog(tgID, "Admin", "FANDUB_SETTINGS_UPDATE", "FANDUB", strconv.Itoa(body.FandubID), fmt.Sprintf(`{"contact_url":%q,"vip_price":%d}`, cleanContact, body.VIPPrice))
		cache.GlobalCache.Flush()

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":     true,
			"message":     "Fandub VIP va aloqa sozlamalari muvaffaqiyatli saqlandi!",
			"contact_url": cleanContact,
			"vip_price":   body.VIPPrice,
		})

	default:
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// GET, POST, DELETE /api/v1/admin/fandubs/users
func (ah *AdminHandler) HandleAdminFandubUsers(w http.ResponseWriter, r *http.Request) {
	tgID, _ := strconv.ParseInt(r.Header.Get("X-Telegram-Id"), 10, 64)

	switch r.Method {
	case http.MethodGet:
		fandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
		users, err := ah.db.GetFandubUsers(fandubID)
		if err != nil {
			users = []database.FandubUser{}
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    users,
		})

	case http.MethodPost:
		var body struct {
			FandubID   int    `json:"fandub_id"`
			TelegramID int64  `json:"telegram_id"`
			Username   string `json:"username"`
			Role       string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
			return
		}
		if body.FandubID <= 0 {
			http.Error(w, `{"error":"Fandub ID majburiy"}`, http.StatusBadRequest)
			return
		}

		cleanUsername := strings.TrimSpace(strings.TrimPrefix(body.Username, "@"))
		resolvedTgID := body.TelegramID

		// If telegram_id was not provided but username was provided, find user in anivorm_users
		if resolvedTgID <= 0 && cleanUsername != "" {
			_ = ah.db.QueryRow(`
				SELECT telegram_id FROM anivorm_users
				WHERE LOWER(username) = LOWER($1)
				LIMIT 1
			`, cleanUsername).Scan(&resolvedTgID)
		}

		if resolvedTgID <= 0 {
			http.Error(w, `{"error":"Foydalanuvchining to'g'ri Telegram ID yoki ro'yxatdan o'tgan Username'ini kiriting"}`, http.StatusBadRequest)
			return
		}

		if body.Role == "" {
			body.Role = "ADMIN"
		}

		// If setting primary ADMIN, demote previous ADMINs to MEMBER to maintain single clear studio leader
		if body.Role == "ADMIN" {
			_, _ = ah.db.Exec(`UPDATE anivorm_fandub_users SET role = 'MEMBER' WHERE fandub_id = $1 AND role = 'ADMIN'`, body.FandubID)

			// Also sync telegram_admin in custom profiles
			var uUsername string
			_ = ah.db.QueryRow(`SELECT COALESCE(username, '') FROM anivorm_users WHERE telegram_id = $1`, resolvedTgID).Scan(&uUsername)
			adminHandle := cleanUsername
			if adminHandle == "" && uUsername != "" {
				adminHandle = uUsername
			}
			if adminHandle != "" {
				if !strings.HasPrefix(adminHandle, "@") {
					adminHandle = "@" + adminHandle
				}
				_, _ = ah.db.Exec(`
					INSERT INTO anivorm_fandub_custom_profiles (fandub_id, telegram_admin, updated_at)
					VALUES ($1, $2, NOW())
					ON CONFLICT (fandub_id) DO UPDATE SET telegram_admin = $2, updated_at = NOW()
				`, body.FandubID, adminHandle)
			}
		}

		if err := ah.db.AddFandubUser(body.FandubID, resolvedTgID, body.Role); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Userni fandubga biriktirishda xato: %v"}`, err), http.StatusInternalServerError)
			return
		}

		cache.GlobalCache.Flush()
		ah.db.CreateAuditLog(tgID, "Admin", "FANDUB_USER_ADD", "FANDUB_USER", strconv.FormatInt(resolvedTgID, 10), fmt.Sprintf(`{"fandub_id":%d,"telegram_id":%d,"role":%q}`, body.FandubID, resolvedTgID, body.Role))

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":     true,
			"message":     "Foydalanuvchi muvaffaqiyatli biriktirildi",
			"telegram_id": resolvedTgID,
			"role":        body.Role,
		})

	case http.MethodDelete:
		fandubID, _ := strconv.Atoi(r.URL.Query().Get("fandub_id"))
		targetTelegramID, _ := strconv.ParseInt(r.URL.Query().Get("telegram_id"), 10, 64)

		if err := ah.db.RemoveFandubUser(fandubID, targetTelegramID); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Userni fandubdan chiqarishda xato: %v"}`, err), http.StatusInternalServerError)
			return
		}

		ah.db.CreateAuditLog(tgID, "Admin", "FANDUB_USER_REMOVE", "FANDUB_USER", strconv.FormatInt(targetTelegramID, 10), fmt.Sprintf(`{"fandub_id":%d,"telegram_id":%d}`, fandubID, targetTelegramID))

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Foydalanuvchi Fandubdan chiqarildi",
		})

	default:
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// GET /api/v1/admin/audit-logs
func (ah *AdminHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 50
	}

	logs, err := ah.db.GetAuditLogs(limit)
	if err != nil {
		logs = []database.AuditLog{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"logs":    logs,
	})
}
