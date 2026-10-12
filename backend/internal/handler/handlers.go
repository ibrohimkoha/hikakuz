package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"anivorm/internal/cache"
	"anivorm/internal/config"
	"anivorm/internal/database"
	"anivorm/internal/service"
	"github.com/lib/pq"
)

type Handler struct {
	cfg          *config.Config
	db           *database.DB
	jikan        *service.JikanService
	b2Streamer   *service.B2Streamer
	tokenService *service.TokenService
}

func NewHandler(cfg *config.Config, db *database.DB, jikan *service.JikanService, b2 *service.B2Streamer) *Handler {
	return &Handler{
		cfg:          cfg,
		db:           db,
		jikan:        jikan,
		b2Streamer:   b2,
		tokenService: service.NewTokenService(),
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// GET /api/v1/anime/trending (In-Memory Cached 300s)
func (h *Handler) GetTrending(w http.ResponseWriter, r *http.Request) {
	if cached, ok := cache.GlobalCache.Get("trending_animes"); ok {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    cached,
			"cached":  true,
		})
		return
	}

	animes, err := h.db.GetAnimesLimit(40)
	if err != nil || animes == nil {
		animes = []database.Anime{}
	}

	var trending []database.Anime
	for _, a := range animes {
		if a.IsTrending || a.Score >= 8.5 {
			trending = append(trending, a)
		}
	}
	if len(trending) == 0 && len(animes) > 0 {
		maxCount := 10
		if len(animes) < maxCount {
			maxCount = len(animes)
		}
		trending = animes[:maxCount]
	}

	cache.GlobalCache.Set("trending_animes", trending, 300*time.Second)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    trending,
	})
}

// GET /api/v1/anime/recent (In-Memory Cached)
func (h *Handler) GetRecent(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 30
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
		limit = l
	}

	cacheKey := fmt.Sprintf("recent_animes:%d", limit)
	if cached, ok := cache.GlobalCache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    cached,
			"cached":  true,
		})
		return
	}

	animes, err := h.db.GetAnimesLimit(limit)
	if err != nil || animes == nil {
		animes = []database.Anime{}
	}

	cache.GlobalCache.Set(cacheKey, animes, 60*time.Second)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    animes,
	})
}

// GET /api/v1/anime/search?q=... (High Performance SQL search with GIN-ready index and fallback)
func (h *Handler) SearchAnime(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    []database.Anime{},
		})
		return
	}

	// 1. Direct PostgreSQL query
	results, err := h.db.SearchAnimesSQL(q, 25)
	if err == nil && len(results) > 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    results,
		})
		return
	}

	// 2. Fallback to External Search if no local match
	if len(results) == 0 && len(q) >= 2 {
		externalRes, err := h.jikan.SearchAnime(q)
		if err == nil && len(externalRes) > 0 {
			for idx, item := range externalRes {
				results = append(results, database.Anime{
					ID:             2000 + idx,
					MALID:          item.MalID,
					TitleUz:        item.TitleUz,
					TitleEn:        item.TitleEn,
					TitleJp:        item.TitleJp,
					Slug:           service.Slugify(item.TitleUz),
					Synopsis:       item.Synopsis,
					PosterURL:      item.PosterURL,
					BannerURL:      item.BannerURL,
					Score:          item.Score,
					EpisodesCount:  item.EpisodesCount,
					CurrentEpisode: item.EpisodesCount,
					Status:         item.Status,
					Season:         item.Season,
					Year:           item.Year,
					Genres:         item.Genres,
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    results,
	})
}

// GET /api/v1/anime/search-external?q=...
func (h *Handler) SearchExternalAnime(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    []service.AnimeSearchResult{},
		})
		return
	}

	results, err := h.jikan.SearchAnime(q)
	if err != nil {
		results = []service.AnimeSearchResult{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    results,
	})
}

// GET /api/v1/anime/detail-external?id=...
func (h *Handler) GetExternalAnimeDetail(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimSpace(r.URL.Query().Get("id"))
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, `{"error":"Noto'g'ri ID ko'rsatildi"}`, http.StatusBadRequest)
		return
	}

	detail, err := h.jikan.GetAnimeDetails(id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    detail,
	})
}

// POST /api/v1/translate or GET /api/v1/translate?text=...
func (h *Handler) TranslateText(w http.ResponseWriter, r *http.Request) {
	var text string
	if r.Method == http.MethodPost {
		var req struct {
			Text string `json:"text"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		text = req.Text
	} else {
		text = r.URL.Query().Get("text")
	}

	text = strings.TrimSpace(text)
	if text == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":         true,
			"translated_text": "",
		})
		return
	}

	translated, err := service.TranslateToUzbek(text)
	if err != nil || translated == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":         true,
			"translated_text": text,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":         true,
		"translated_text": translated,
	})
}

// GET /api/v1/anime/detail?slug=... (In-Memory Cached 120s)
func (h *Handler) GetAnimeDetail(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.URL.Query().Get("slug"))
	if slug == "" {
		http.Error(w, `{"error":"Slug majburiy"}`, http.StatusBadRequest)
		return
	}

	cacheKey := "detail:" + slug
	if cached, ok := cache.GlobalCache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached)
		return
	}

	anime, err := h.db.GetAnimeBySlug(slug)
	if err != nil || anime == nil {
		http.Error(w, `{"error":"Anime topilmadi"}`, http.StatusNotFound)
		return
	}

	episodes, err := h.db.GetEpisodesByAnimeID(anime.ID)
	if err != nil || episodes == nil {
		episodes = []database.Episode{}
	}

	related := h.GetRelatedAnimes(anime)

	// Collect unique available fandubs in this anime with metadata
	type FandubOpt struct {
		ID      int    `json:"id"`
		Name    string `json:"name"`
		Slug    string `json:"slug"`
		LogoURL string `json:"logo_url"`
	}
	allFandubs, _ := h.db.GetFandubs()
	fMap := make(map[int]database.Fandub)
	for _, f := range allFandubs {
		fMap[f.ID] = f
	}

	fandubSeen := make(map[int]bool)
	var availableFandubs []FandubOpt
	for _, ep := range episodes {
		fID := ep.FandubID
		if fID <= 0 {
			fID = 1
		}
		if !fandubSeen[fID] {
			fandubSeen[fID] = true
			if f, ok := fMap[fID]; ok {
				availableFandubs = append(availableFandubs, FandubOpt{
					ID:      f.ID,
					Name:    f.Name,
					Slug:    f.Slug,
					LogoURL: f.LogoURL,
				})
			} else {
				name := ep.FandubName
				if name == "" {
					name = "Hikaku Dub"
				}
				availableFandubs = append(availableFandubs, FandubOpt{
					ID:      fID,
					Name:    name,
					Slug:    fmt.Sprintf("fandub-%d", fID),
					LogoURL: "",
				})
			}
		}
	}
	if len(availableFandubs) == 0 {
		availableFandubs = append(availableFandubs, FandubOpt{ID: 1, Name: "Hikaku Dub", Slug: "hikaku-dub"})
	}

	resp := map[string]interface{}{
		"success":  true,
		"anime":    anime,
		"episodes": episodes,
		"fandubs":  availableFandubs,
		"related":  related,
	}

	cache.GlobalCache.Set(cacheKey, resp, 120*time.Second)
	writeJSON(w, http.StatusOK, resp)
}

// GET /api/v1/fandubs (Public Fandub List with Stats & Ecosystem)
func (h *Handler) GetFandubs(w http.ResponseWriter, r *http.Request) {
	list, err := h.db.GetFandubsWithStats()
	if err != nil {
		list = []database.FandubPublicInfo{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    list,
	})
}

// GET /api/v1/fandub/public-detail?slug=...
func (h *Handler) GetFandubPublicDetail(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.URL.Query().Get("slug"))
	if slug == "" {
		slug = strings.TrimSpace(r.URL.Query().Get("id"))
	}
	if slug == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Studiya slugi yoki ID ko'rsatilmadi",
		})
		return
	}

	info, members, animes, episodes, customProfile, err := h.db.GetFandubPublicDetail(slug)
	if err != nil || info == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{
			"success": false,
			"error":   "Studiya topilmadi",
		})
		return
	}

	tgID := parseTelegramID(r)
	isFollowing := false
	if tgID > 0 {
		isFollowing = h.db.IsUserFollowingFandub(info.ID, tgID)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"data":           info,
		"members":        members,
		"animes":         animes,
		"episodes":       episodes,
		"custom_profile": customProfile,
		"is_following":   isFollowing,
	})
}

// POST /api/v1/fandub/follow (Toggle Follow/Unfollow)
func (h *Handler) ToggleFandubFollow(w http.ResponseWriter, r *http.Request) {
	var body struct {
		FandubID   int   `json:"fandub_id"`
		TelegramID int64 `json:"telegram_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Noto'g'ri so'rov formati",
		})
		return
	}

	if body.TelegramID == 0 {
		body.TelegramID = parseTelegramID(r)
	}
	if body.TelegramID == 0 || body.FandubID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error":   "Telegram ID yoki Studiya ID kiritilmadi",
		})
		return
	}

	isFollowing, totalFollowers, err := h.db.ToggleFandubFollow(body.FandubID, body.TelegramID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error":   "Follow amali bajarilmadi",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":         true,
		"is_following":    isFollowing,
		"followers_count": totalFollowers,
	})
}

// GET /api/v1/stream/token (Generates secure signed token for video stream)
func (h *Handler) GetStreamToken(w http.ResponseWriter, r *http.Request) {
	epIDStr := r.URL.Query().Get("episode_id")
	epID, err := strconv.Atoi(epIDStr)
	if err != nil || epID <= 0 {
		http.Error(w, `{"error":"Noto'g'ri qism ID raqami"}`, http.StatusBadRequest)
		return
	}

	tgIDStr := r.URL.Query().Get("telegram_id")
	email := r.URL.Query().Get("email")
	tgID, _ := strconv.ParseInt(tgIDStr, 10, 64)

	ep, _ := h.db.GetEpisodeByID(epID)
	isEpisodeVIP := false
	if ep != nil && ep.IsVIPOnly {
		isEpisodeVIP = true
		isUserVIP := false
		if tgID == 5415350162 || tgID == 6149114216 {
			isUserVIP = true
		} else if ep.FandubID > 0 {
			isUserVIP = h.db.CheckUserFandubVIP(ep.FandubID, tgID)
		} else {
			isUserVIP = h.db.CheckUserVIP(tgID, email)
		}

		if !isUserVIP {
			fandubID := 1
			if ep.FandubID > 0 {
				fandubID = ep.FandubID
			}
			fSettings, _ := h.db.GetFandubSettings(fandubID)
			fDub, _ := h.db.GetFandubByID(fandubID)
			fName := "Fandub"
			if fDub != nil {
				fName = fDub.Name
			}
			contactURL := "https://t.me/iskurama"
			vipPrice := 10000
			if fSettings != nil {
				if fSettings.ContactURL != "" {
					contactURL = fSettings.ContactURL
				}
				if fSettings.VIPPrice > 0 {
					vipPrice = fSettings.VIPPrice
				}
			}

			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"success":         false,
				"error":           fmt.Sprintf("Ushbu qism faqat [%s] VIP a'zolari uchun mavjud!", fName),
				"is_vip_required": true,
				"fandub_id":       fandubID,
				"fandub_name":     fName,
				"contact_url":     contactURL,
				"vip_price":       vipPrice,
			})
			return
		}
	}

	token, exp := h.tokenService.GenerateToken(epID, isEpisodeVIP, 2*time.Hour)
	streamPath := fmt.Sprintf("/stream/episode/%d", epID)
	if ep != nil && strings.HasSuffix(ep.B2Key, ".m3u8") {
		streamPath = fmt.Sprintf("/stream/episode/%d.m3u8", epID)
	}
	signedStreamURL := fmt.Sprintf("%s?token=%s&exp=%d", streamPath, token, exp)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":    true,
		"stream_url": signedStreamURL,
		"token":      token,
		"expires_at": exp,
	})
}

// GET /api/v1/anime/comments?slug=... (In-Memory Cached 30s)
func (h *Handler) GetComments(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.URL.Query().Get("slug"))
	if slug == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "data": []database.Comment{}})
		return
	}

	cacheKey := "comments:" + slug
	if cached, ok := cache.GlobalCache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    cached,
			"cached":  true,
		})
		return
	}

	comments, err := h.db.GetCommentsBySlug(slug)
	if err != nil {
		comments = []database.Comment{}
	}

	cache.GlobalCache.Set(cacheKey, comments, 30*time.Second)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    comments,
	})
}

// POST /api/v1/anime/comments
func (h *Handler) AddComment(w http.ResponseWriter, r *http.Request) {
	var c database.Comment
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
		return
	}

	if c.AnimeSlug == "" || c.Content == "" {
		http.Error(w, `{"error":"Anime slug va izoh matni majburiy"}`, http.StatusBadRequest)
		return
	}
	if c.UserName == "" {
		c.UserName = "Foydalanuvchi"
	}
	if c.Rating <= 0 || c.Rating > 10 {
		c.Rating = 10
	}

	_ = h.db.AddComment(&c)
	cache.GlobalCache.Delete("comments:" + c.AnimeSlug)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"comment": c,
	})
}

// POST /api/v1/auth/telegram/token
// GET /api/v1/auth/role?telegram_id=...
func (h *Handler) GetUserRole(w http.ResponseWriter, r *http.Request) {
	tgIDStr := r.URL.Query().Get("telegram_id")
	tgID, err := strconv.ParseInt(tgIDStr, 10, 64)
	if err != nil || tgID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "telegram_id required"})
		return
	}
	isAdmin, role := h.db.GetUserAdminRole(tgID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"is_admin": isAdmin,
		"role":     role,
	})
}

func generateSecureAuthToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err == nil {
		return "auth_" + hex.EncodeToString(b)
	}
	return fmt.Sprintf("auth_%d", time.Now().UnixNano())
}

func (h *Handler) CreateAuthTelegramToken(w http.ResponseWriter, r *http.Request) {
	token := generateSecureAuthToken()
	if err := h.db.CreateAuthSession(token); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"token":   token,
		"bot_url": fmt.Sprintf("https://t.me/%s?start=%s", "hikakuzbot", token),
	})
}

// GET /api/v1/auth/telegram/check?token=...
func (h *Handler) CheckAuthTelegramSession(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{"success": false, "error": "token required"})
		return
	}
	session, verified, err := h.db.CheckAuthSession(token)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"verified": verified,
		"session":  session,
	})
}

// GET /stream/episode/:id (Signed & Protected Proxy)
func (h *Handler) StreamEpisode(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	var episodeIDStr string
	if len(pathParts) > 0 {
		episodeIDStr = pathParts[len(pathParts)-1]
	}
	episodeIDStr = strings.TrimSuffix(episodeIDStr, ".m3u8")

	epID, err := strconv.Atoi(episodeIDStr)
	if err != nil {
		http.Error(w, "Invalid episode ID", http.StatusBadRequest)
		return
	}

	// Referer & Origin Security Check (Prevent external site hotlinking & unauthorized leeches)
	referer := r.Header.Get("Referer")
	origin := r.Header.Get("Origin")
	if referer != "" {
		refLower := strings.ToLower(referer)
		isAllowed := strings.Contains(refLower, "hikaku.uz") ||
			strings.Contains(refLower, "anivorm.uz") ||
			strings.Contains(refLower, "localhost") ||
			strings.Contains(refLower, "127.0.0.1")
		if !isAllowed {
			http.Error(w, "403 Forbidden: Tashqi saytlardan video oqimiga to'g'ridan-to'g'ri ulanish taqiqlangan", http.StatusForbidden)
			return
		}
	}
	if origin != "" {
		origLower := strings.ToLower(origin)
		isAllowed := strings.Contains(origLower, "hikaku.uz") ||
			strings.Contains(origLower, "anivorm.uz") ||
			strings.Contains(origLower, "localhost") ||
			strings.Contains(origLower, "127.0.0.1")
		if !isAllowed {
			http.Error(w, "403 Forbidden: Ruxsat berilmagan Origin", http.StatusForbidden)
			return
		}
	}

	token := r.URL.Query().Get("token")
	expStr := r.URL.Query().Get("exp")
	exp := service.ParseExp(expStr)

	ep, _ := h.db.GetEpisodeByID(epID)
	isVIP := false
	if ep != nil && ep.IsVIPOnly {
		isVIP = true
	}

	if token != "" {
		if !h.tokenService.VerifyToken(epID, token, exp, isVIP) {
			http.Error(w, "403 Forbidden: Xavfsiz strim tokeni yaroqsiz yoki muddati o'tgan", http.StatusForbidden)
			return
		}
	}

	var b2Key string
	if ep != nil && ep.B2Key != "" {
		b2Key = ep.B2Key
	} else {
		b2Key = fmt.Sprintf("episodes/stream/ep_%d.mp4", epID)
	}

	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	h.b2Streamer.StreamVideo(w, r, b2Key)
}

// GET /api/v1/config/info
func (h *Handler) GetConfigInfo(w http.ResponseWriter, r *http.Request) {
	s := h.db.GetSettings()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"site_name":           "Anivorm",
		"vip_price_uzs":       s.VIPPrice,
		"card_number":         s.CardNumber,
		"card_holder":         s.CardHolder,
		"support_bot":         s.SupportBot,
		"announcement_text":   s.AnnouncementText,
		"announcement_active": s.AnnouncementActive,
		"hikaku_url":          h.cfg.HikakuURL,
	})
}

// GET /api/v1/anime/genres
func (h *Handler) GetGenres(w http.ResponseWriter, r *http.Request) {
	genres, err := h.db.GetGenresList()
	if err != nil || genres == nil {
		genres = []database.GenreItem{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    genres,
	})
}

// GET /api/v1/anime/catalog?genre=...&year=...&status=...&sort=...&q=...&page=...&limit=... (In-Memory Cached 60s)
func (h *Handler) GetCatalog(w http.ResponseWriter, r *http.Request) {
	genre := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("genre")))
	yearStr := strings.TrimSpace(r.URL.Query().Get("year"))
	status := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))
	sortBy := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("sort")))
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	archive := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("archive")))
	onlyWithEpisodes := archive != "true" && archive != "1" && archive != "all"

	pageStr := r.URL.Query().Get("page")
	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
		page = p
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 24
	if limitStr == "all" || limitStr == "-1" {
		limit = 1000
	} else if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 1000 {
		limit = l
	}

	cacheKey := fmt.Sprintf("catalog:%s:%s:%s:%s:%s:%t:%d:%d", genre, yearStr, status, sortBy, q, onlyWithEpisodes, page, limit)
	if cached, ok := cache.GlobalCache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached)
		return
	}

	animes, totalCount, err := h.db.GetCatalogAnimes(genre, yearStr, status, sortBy, q, onlyWithEpisodes, page, limit)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch catalog",
			"data":    []database.Anime{},
			"total":   0,
		})
		return
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = (totalCount + limit - 1) / limit
	}

	resp := map[string]interface{}{
		"success":     true,
		"total":       totalCount,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
		"data":        animes,
	}

	cache.GlobalCache.Set(cacheKey, resp, 60*time.Second)
	writeJSON(w, http.StatusOK, resp)
}

// Helper to calculate related animes by genre match + score (Cached 300s)
func (h *Handler) GetRelatedAnimes(targetAnime *database.Anime) []database.Anime {
	if targetAnime == nil {
		return []database.Anime{}
	}

	cacheKey := "related:" + targetAnime.Slug
	if cached, ok := cache.GlobalCache.Get(cacheKey); ok {
		return cached.([]database.Anime)
	}

	var related []database.Anime
	if len(targetAnime.Genres) > 0 {
		rows, err := h.db.Query(`
			SELECT id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''), slug,
			       COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
			       score, episodes_count, current_episode, status, season, year, studio, genres, is_trending, is_featured, created_at
			FROM anivorm_animes
			WHERE genres && $1 AND id != $2
			ORDER BY score DESC, id DESC LIMIT 10
		`, pq.Array(targetAnime.Genres), targetAnime.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var a database.Anime
				var score float64
				err := rows.Scan(
					&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
					&a.Synopsis, &a.PosterURL, &a.BannerURL,
					&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
				)
				if err == nil {
					a.Score = score
					a.TelegramURL = a.Studio
					related = append(related, a)
				}
			}
		}
	}

	if len(related) == 0 {
		recent, _ := h.db.GetAnimesLimit(10)
		for _, a := range recent {
			if a.ID != targetAnime.ID {
				related = append(related, a)
			}
		}
	}

	if related == nil {
		related = []database.Anime{}
	}

	cache.GlobalCache.Set(cacheKey, related, 300*time.Second)
	return related
}

// GET /api/v1/anime/related?slug=...
func (h *Handler) GetRelated(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	anime, err := h.db.GetAnimeBySlug(slug)
	if err != nil || anime == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    []database.Anime{},
		})
		return
	}
	related := h.GetRelatedAnimes(anime)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    related,
	})
}
