package database

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"os"
	"database/sql"
	"strconv"
	"strings"
	"fmt"
	"log"
	"time"

	"anivorm/internal/config"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func InitDB(cfg *config.Config) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		log.Printf("⚠️ PostgreSQL ping notice (%v). Continuing safely.", err)
	}

	// Production Connection Pool limits (Zero-Exhaustion Protection)
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	schema := `
	CREATE TABLE IF NOT EXISTS anivorm_animes (
		id SERIAL PRIMARY KEY,
		mal_id INT UNIQUE,
		title_uz TEXT NOT NULL,
		title_en TEXT,
		title_jp TEXT,
		slug TEXT UNIQUE NOT NULL,
		synopsis TEXT,
		poster_url TEXT,
		banner_url TEXT,
		score NUMERIC(3, 2) DEFAULT 0.0,
		episodes_count INT DEFAULT 12,
		current_episode INT DEFAULT 1,
		status TEXT DEFAULT 'Ongoing',
		season TEXT DEFAULT 'Winter 2026',
		year INT DEFAULT 2026,
		studio TEXT DEFAULT 'Mappa',
		genres TEXT[] DEFAULT '{}',
		is_trending BOOLEAN DEFAULT FALSE,
		is_featured BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS anivorm_episodes (
		id SERIAL PRIMARY KEY,
		anime_id INT REFERENCES anivorm_animes(id) ON DELETE CASCADE,
		episode_number INT NOT NULL,
		title TEXT NOT NULL,
		b2_key TEXT NOT NULL,
		thumbnail_url TEXT,
		duration INT DEFAULT 1440,
		is_vip_only BOOLEAN DEFAULT FALSE,
		has_uzbek_dub BOOLEAN DEFAULT TRUE,
		has_subtitles BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(anime_id, episode_number)
	);

	CREATE TABLE IF NOT EXISTS anivorm_users (
		id SERIAL PRIMARY KEY,
		telegram_id BIGINT UNIQUE,
		email TEXT UNIQUE,
		username TEXT,
		full_name TEXT,
		is_vip BOOLEAN DEFAULT FALSE,
		vip_expires_at TIMESTAMP WITH TIME ZONE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS anivorm_receipts (
		id SERIAL PRIMARY KEY,
		user_id INT REFERENCES anivorm_users(id),
		telegram_id BIGINT NOT NULL,
		image_file_id TEXT NOT NULL,
		amount INT DEFAULT 1000,
		status TEXT DEFAULT 'pending',
		admin_note TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS anivorm_comments (
		id SERIAL PRIMARY KEY,
		anime_slug TEXT NOT NULL,
		user_name TEXT NOT NULL,
		user_photo TEXT,
		content TEXT NOT NULL,
		rating INT DEFAULT 10,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS anivorm_settings (
		id INT PRIMARY KEY DEFAULT 1,
		card_number TEXT DEFAULT '8600 0000 0000 0000',
		card_holder TEXT DEFAULT 'Ibrohim M.',
		vip_price INT DEFAULT 1000,
		support_bot TEXT DEFAULT '@anivormsupportbot',
		announcement_text TEXT DEFAULT 'Anivorm platformasiga xush kelibsiz!',
		announcement_active BOOLEAN DEFAULT TRUE,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	INSERT INTO anivorm_settings (id, card_number, card_holder, vip_price, support_bot, announcement_text, announcement_active)
	VALUES (1, '8600 0000 0000 0000', 'Ibrohim M.', 1000, '@anivormsupportbot', 'Anivorm platformasiga xush kelibsiz!', TRUE)
	ON CONFLICT (id) DO NOTHING;
	CREATE TABLE IF NOT EXISTS anivorm_auth_sessions (
		token TEXT PRIMARY KEY,
		telegram_id BIGINT,
		username TEXT,
		first_name TEXT,
		last_name TEXT,
		photo_url TEXT,
		is_admin BOOLEAN DEFAULT FALSE,
		is_vip BOOLEAN DEFAULT FALSE,
		is_verified BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`

	if err == nil {
		_, _ = db.Exec(schema)
	}

	return &DB{db}, nil
}

// GetSettings gets dynamic settings
func (db *DB) GetSettings() PlatformSettings {
	var s PlatformSettings
	query := `
		SELECT card_number, card_holder, vip_price, support_bot, announcement_text, announcement_active
		FROM anivorm_settings WHERE id = 1 LIMIT 1
	`
	err := db.QueryRow(query).Scan(&s.CardNumber, &s.CardHolder, &s.VIPPrice, &s.SupportBot, &s.AnnouncementText, &s.AnnouncementActive)
	if err != nil {
		return PlatformSettings{
			CardNumber:         "8600 0000 0000 0000",
			CardHolder:         "Ibrohim M.",
			VIPPrice:           1000,
			SupportBot:         "@anivormsupportbot",
			AnnouncementText:   "Anivorm platformasiga xush kelibsiz!",
			AnnouncementActive: true,
		}
	}
	return s
}

// SaveSettings updates dynamic settings
func (db *DB) SaveSettings(s PlatformSettings) error {
	query := `
		UPDATE anivorm_settings SET
			card_number = $1,
			card_holder = $2,
			vip_price = $3,
			support_bot = $4,
			announcement_text = $5,
			announcement_active = $6,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = 1;
	`
	_, err := db.Exec(query, s.CardNumber, s.CardHolder, s.VIPPrice, s.SupportBot, s.AnnouncementText, s.AnnouncementActive)
	return err
}

// GetCommentsBySlug gets comments
func (db *DB) GetCommentsBySlug(slug string) ([]Comment, error) {
	rows, err := db.Query(`
		SELECT id, anime_slug, user_name, COALESCE(user_photo, ''), content, rating, created_at
		FROM anivorm_comments WHERE anime_slug = $1 ORDER BY id DESC LIMIT 50
	`, slug)
	if err != nil {
		return []Comment{}, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		err := rows.Scan(&c.ID, &c.AnimeSlug, &c.UserName, &c.UserPhoto, &c.Content, &c.Rating, &c.CreatedAt)
		if err == nil {
			comments = append(comments, c)
		}
	}
	if comments == nil {
		comments = []Comment{}
	}
	return comments, nil
}

// AddComment saves a comment
func (db *DB) AddComment(c *Comment) error {
	query := `
		INSERT INTO anivorm_comments (anime_slug, user_name, user_photo, content, rating)
		VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at;
	`
	return db.QueryRow(query, c.AnimeSlug, c.UserName, c.UserPhoto, c.Content, c.Rating).Scan(&c.ID, &c.CreatedAt)
}

// GetAnimes gets all animes including actual uploaded episode counts
func (db *DB) GetAnimes() ([]Anime, error) {
	rows, err := db.Query(`
		SELECT id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''), slug,
		       COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
		       score, episodes_count,
		       (SELECT COUNT(*) FROM anivorm_episodes e WHERE e.anime_id = anivorm_animes.id) as current_episode,
		       status, season, year, studio, genres, is_trending, is_featured, created_at
		FROM anivorm_animes ORDER BY id DESC
	`)
	if err != nil {
		return []Anime{}, err
	}
	defer rows.Close()

	var animes []Anime
	for rows.Next() {
		var a Anime
		var score float64
		err := rows.Scan(
			&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
			&a.Synopsis, &a.PosterURL, &a.BannerURL,
			&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
		)
		if err == nil {
			a.Score = score
			a.TelegramURL = a.Studio
			animes = append(animes, a)
		}
	}
	if animes == nil {
		animes = []Anime{}
	}
	return animes, nil
}

// GetAnimesLimit gets recent animes with a limit to avoid loading entire database into memory.
// Prioritizes animes that have uploaded playable episodes in anivorm_episodes.
func (db *DB) GetAnimesLimit(limit int) ([]Anime, error) {
	if limit <= 0 {
		limit = 30
	}
	rows, err := db.Query(`
		SELECT id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''), slug,
		       COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
		       score, episodes_count, current_episode, status, season, year, studio, genres, is_trending, is_featured, created_at
		FROM anivorm_animes
		WHERE EXISTS (SELECT 1 FROM anivorm_episodes e WHERE e.anime_id = anivorm_animes.id)
		ORDER BY id DESC LIMIT $1
	`, limit)
	if err != nil {
		return []Anime{}, err
	}
	defer rows.Close()

	var animes []Anime
	for rows.Next() {
		var a Anime
		var score float64
		err := rows.Scan(
			&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
			&a.Synopsis, &a.PosterURL, &a.BannerURL,
			&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
		)
		if err == nil {
			a.Score = score
			a.TelegramURL = a.Studio
			animes = append(animes, a)
		}
	}

	// Fallback if no animes have episodes yet (e.g. dev database)
	if len(animes) == 0 {
		fallbackRows, err2 := db.Query(`
			SELECT id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''), slug,
			       COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
			       score, episodes_count, current_episode, status, season, year, studio, genres, is_trending, is_featured, created_at
			FROM anivorm_animes ORDER BY id DESC LIMIT $1
		`, limit)
		if err2 == nil {
			defer fallbackRows.Close()
			for fallbackRows.Next() {
				var a Anime
				var score float64
				err := fallbackRows.Scan(
					&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
					&a.Synopsis, &a.PosterURL, &a.BannerURL,
					&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
				)
				if err == nil {
					a.Score = score
					a.TelegramURL = a.Studio
					animes = append(animes, a)
				}
			}
		}
	}

	if animes == nil {
		animes = []Anime{}
	}
	return animes, nil
}

// GetCatalogAnimes executes a high-performance paginated SQL query with filters and optional episodes restriction
func (db *DB) GetCatalogAnimes(genre, yearStr, status, sortBy, q string, onlyWithEpisodes bool, page, limit int) ([]Anime, int, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 24
	} else if limit > 1000 {
		limit = 1000
	}
	offset := (page - 1) * limit

	var whereClauses []string
	var args []interface{}
	argIdx := 1

	if q != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(title_uz ILIKE $%d OR title_en ILIKE $%d OR title_jp ILIKE $%d OR slug ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+q+"%")
		argIdx++
	} else if onlyWithEpisodes {
		whereClauses = append(whereClauses, "EXISTS (SELECT 1 FROM anivorm_episodes e WHERE e.anime_id = anivorm_animes.id)")
	}

	if genre != "" && genre != "all" && genre != "barchasi" {
		whereClauses = append(whereClauses, fmt.Sprintf("EXISTS (SELECT 1 FROM unnest(genres) g WHERE g ILIKE $%d)", argIdx))
		args = append(args, "%"+genre+"%")
		argIdx++
	}

	if yearStr != "" && yearStr != "all" && yearStr != "barchasi" {
		if y, err := strconv.Atoi(yearStr); err == nil && y > 1900 {
			whereClauses = append(whereClauses, fmt.Sprintf("year = $%d", argIdx))
			args = append(args, y)
			argIdx++
		}
	}

	if status != "" && status != "all" && status != "barchasi" {
		whereClauses = append(whereClauses, fmt.Sprintf("status ILIKE $%d", argIdx))
		args = append(args, "%"+status+"%")
		argIdx++
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	orderSQL := "ORDER BY id DESC"
	switch sortBy {
	case "popular", "score":
		orderSQL = "ORDER BY score DESC, id DESC"
	case "title", "az":
		orderSQL = "ORDER BY title_uz ASC, id DESC"
	case "episodes":
		orderSQL = "ORDER BY episodes_count DESC, id DESC"
	case "oldest":
		orderSQL = "ORDER BY id ASC"
	default:
		orderSQL = "ORDER BY id DESC"
	}

	query := fmt.Sprintf(`
		SELECT id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''), slug,
		       COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
		       score, episodes_count, current_episode, status, season, year, studio, genres, is_trending, is_featured, created_at,
		       COUNT(*) OVER() AS full_count
		FROM anivorm_animes
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, whereSQL, orderSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return []Anime{}, 0, err
	}
	defer rows.Close()

	var animes []Anime
	totalCount := 0

	for rows.Next() {
		var a Anime
		var score float64
		var count int
		err := rows.Scan(
			&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
			&a.Synopsis, &a.PosterURL, &a.BannerURL,
			&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
			&count,
		)
		if err == nil {
			a.Score = score
			a.TelegramURL = a.Studio
			animes = append(animes, a)
			totalCount = count
		}
	}

	if animes == nil {
		animes = []Anime{}
	}

	return animes, totalCount, nil
}

// GetAnimeBySlug gets single anime by slug or id
func (db *DB) GetAnimeBySlug(slug string) (*Anime, error) {
	var a Anime
	var score float64
	query := `
		SELECT id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''), slug,
		       COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
		       score, episodes_count, current_episode, status, season, year, studio, genres, is_trending, is_featured, created_at
		FROM anivorm_animes WHERE slug = $1 OR id::text = $1 LIMIT 1
	`
	err := db.QueryRow(query, slug).Scan(
		&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
		&a.Synopsis, &a.PosterURL, &a.BannerURL,
		&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	a.Score = score
	a.TelegramURL = a.Studio
	return &a, nil
}

// GetEpisodesByAnimeID gets all episodes with Fandub info
func (db *DB) GetEpisodesByAnimeID(animeID int) ([]Episode, error) {
	rows, err := db.Query(`
		SELECT e.id, e.anime_id, e.episode_number, e.title, e.b2_key, COALESCE(e.thumbnail_url, ''), e.duration, e.is_vip_only, e.has_uzbek_dub, e.has_subtitles, COALESCE(e.fandub_id, 1), COALESCE(f.name, 'Hikaku Dub'), e.created_at
		FROM anivorm_episodes e
		LEFT JOIN anivorm_fandubs f ON e.fandub_id = f.id
		WHERE e.anime_id = $1 ORDER BY e.episode_number ASC
	`, animeID)
	if err != nil {
		return []Episode{}, err
	}
	defer rows.Close()

	var episodes []Episode
	for rows.Next() {
		var ep Episode
		err := rows.Scan(
			&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.Title, &ep.B2Key, &ep.ThumbnailURL, &ep.Duration, &ep.IsVIPOnly, &ep.HasUzbekDub, &ep.HasSubtitles, &ep.FandubID, &ep.FandubName, &ep.CreatedAt,
		)
		if err == nil {
			if strings.HasSuffix(ep.B2Key, ".m3u8") {
				ep.StreamURL = fmt.Sprintf("/stream/episode/%d.m3u8", ep.ID)
			} else {
				ep.StreamURL = fmt.Sprintf("/stream/episode/%d", ep.ID)
			}
			episodes = append(episodes, ep)
		}
	}
	if episodes == nil {
		episodes = []Episode{}
	}
	return episodes, nil
}

// GetEpisodeByID gets episode by id with Fandub info
func (db *DB) GetEpisodeByID(id int) (*Episode, error) {
	var ep Episode
	query := `
		SELECT e.id, e.anime_id, e.episode_number, e.title, e.b2_key, COALESCE(e.thumbnail_url, ''), e.duration, e.is_vip_only, e.has_uzbek_dub, e.has_subtitles, COALESCE(e.fandub_id, 1), COALESCE(f.name, 'Hikaku Dub'), e.created_at
		FROM anivorm_episodes e
		LEFT JOIN anivorm_fandubs f ON e.fandub_id = f.id
		WHERE e.id = $1 LIMIT 1
	`
	err := db.QueryRow(query, id).Scan(
		&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.Title, &ep.B2Key, &ep.ThumbnailURL, &ep.Duration, &ep.IsVIPOnly, &ep.HasUzbekDub, &ep.HasSubtitles, &ep.FandubID, &ep.FandubName, &ep.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if strings.HasSuffix(ep.B2Key, ".m3u8") {
		ep.StreamURL = fmt.Sprintf("/stream/episode/%d.m3u8", ep.ID)
	} else {
		ep.StreamURL = fmt.Sprintf("/stream/episode/%d", ep.ID)
	}
	return &ep, nil
}

// CheckUserVIP checks if user is active VIP across vip_users and anivorm_users
func (db *DB) CheckUserVIP(telegramID int64, email string) bool {
	// 1. Check in vip_users table first
	if telegramID > 0 {
		var count int
		err := db.QueryRow(`
			SELECT COUNT(*) FROM vip_users 
			WHERE telegram_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
		`, telegramID).Scan(&count)
		if err == nil && count > 0 {
			return true
		}
	}

	// 2. Check in anivorm_users table
	var isVIP bool
	var exp *time.Time
	query := `
		SELECT is_vip, vip_expires_at FROM anivorm_users
		WHERE (telegram_id = $1 AND $1 != 0) OR (username = $2 AND $2 != '')
		ORDER BY is_vip DESC, id DESC LIMIT 1
	`
	err := db.QueryRow(query, telegramID, email).Scan(&isVIP, &exp)
	if err == nil && isVIP {
		if exp == nil || exp.After(time.Now()) {
			return true
		}
	}
	return false
}

// GetAllEpisodes gets all episodes across all animes with anime title and fandub info
func (db *DB) GetAllEpisodes() ([]Episode, error) {
	rows, err := db.Query(`
		SELECT 
			e.id, e.anime_id, COALESCE(a.title_uz, a.title_en, 'Anime') AS anime_title,
			e.episode_number, e.title, e.b2_key, COALESCE(e.thumbnail_url, ''), 
			e.duration, e.is_vip_only, e.has_uzbek_dub, e.has_subtitles,
			COALESCE(e.fandub_id, 1), COALESCE(f.name, 'Hikaku Dub'), e.created_at
		FROM anivorm_episodes e
		LEFT JOIN anivorm_animes a ON e.anime_id = a.id
		LEFT JOIN anivorm_fandubs f ON e.fandub_id = f.id
		ORDER BY e.id DESC LIMIT 300
	`)
	if err != nil {
		return []Episode{}, err
	}
	defer rows.Close()

	var episodes []Episode
	for rows.Next() {
		var ep Episode
		err := rows.Scan(
			&ep.ID, &ep.AnimeID, &ep.AnimeTitle, &ep.EpisodeNumber, &ep.Title, &ep.B2Key, 
			&ep.ThumbnailURL, &ep.Duration, &ep.IsVIPOnly, &ep.HasUzbekDub, &ep.HasSubtitles,
			&ep.FandubID, &ep.FandubName, &ep.CreatedAt,
		)
		if err == nil {
			ep.VideoURL = ep.B2Key
			if strings.HasSuffix(ep.B2Key, ".m3u8") {
				ep.StreamURL = fmt.Sprintf("/stream/episode/%d.m3u8", ep.ID)
			} else {
				ep.StreamURL = fmt.Sprintf("/stream/episode/%d", ep.ID)
			}
			episodes = append(episodes, ep)
		}
	}
	if episodes == nil {
		episodes = []Episode{}
	}
	return episodes, nil
}

// SaveAnime inserts or updates anime
func (db *DB) SaveAnime(a *Anime) error {
	if a.Genres == nil {
		a.Genres = []string{"Anime"}
	}
	if a.TelegramURL != "" {
		a.Studio = a.TelegramURL
	} else if a.Studio != "" {
		a.TelegramURL = a.Studio
	}
	if a.ID > 0 {
		query := `
		UPDATE anivorm_animes SET
			title_uz = $1, title_en = $2, title_jp = $3, slug = $4, synopsis = $5,
			poster_url = $6, banner_url = $7, score = $8, episodes_count = $9,
			current_episode = $10, status = $11, season = $12, year = $13,
			studio = $14, genres = $15, is_trending = $16, is_featured = $17
		WHERE id = $18
		RETURNING id;
		`
		return db.QueryRow(
			query, a.TitleUz, a.TitleEn, a.TitleJp, a.Slug, a.Synopsis,
			a.PosterURL, a.BannerURL, a.Score, a.EpisodesCount,
			a.CurrentEpisode, a.Status, a.Season, a.Year,
			a.Studio, pq.Array(a.Genres), a.IsTrending, a.IsFeatured, a.ID,
		).Scan(&a.ID)
	}

	// 2. Check if already exists by MAL ID (if mal_id > 0)
	if a.MALID > 0 {
		var existingID int
		err := db.QueryRow("SELECT id FROM anivorm_animes WHERE mal_id = $1", a.MALID).Scan(&existingID)
		if err == nil && existingID > 0 {
			a.ID = existingID
			return db.SaveAnime(a)
		}
	}

	// 3. Check if already exists by Slug
	var existingID int
	err := db.QueryRow("SELECT id FROM anivorm_animes WHERE slug = $1", a.Slug).Scan(&existingID)
	if err == nil && existingID > 0 {
		a.ID = existingID
		return db.SaveAnime(a)
	}

	// 4. Clean mal_id: if <= 0, pass nil so PostgreSQL stores NULL (never violates unique constraint on 0)
	var malIDParam interface{}
	if a.MALID > 0 {
		malIDParam = a.MALID
	} else {
		malIDParam = nil
	}

	query := `
	INSERT INTO anivorm_animes (
		mal_id, title_uz, title_en, title_jp, slug, synopsis, poster_url, banner_url,
		score, episodes_count, current_episode, status, season, year, studio, genres, is_trending, is_featured
	) VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
	) RETURNING id;
	`
	return db.QueryRow(
		query, malIDParam, a.TitleUz, a.TitleEn, a.TitleJp, a.Slug, a.Synopsis, a.PosterURL, a.BannerURL,
		a.Score, a.EpisodesCount, a.CurrentEpisode, a.Status, a.Season, a.Year, a.Studio, pq.Array(a.Genres), a.IsTrending, a.IsFeatured,
	).Scan(&a.ID)
}

// DeleteAnime deletes anime if and only if it has zero episodes
func (db *DB) DeleteAnime(id int) error {
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM anivorm_episodes WHERE anime_id = $1", id).Scan(&count)
	if count > 0 {
		return fmt.Errorf("ushbu animeda %d ta qism mavjud. Animeni o'chirishdan oldin uning barcha qismlarini o'chirib chiqishingiz shart", count)
	}
	_, _ = db.Exec("DELETE FROM anivorm_danmaku WHERE anime_id = $1", id)
	_, err := db.Exec("DELETE FROM anivorm_animes WHERE id = $1", id)
	return err
}

// ToggleAnimeTrending toggles trending status
func (db *DB) ToggleAnimeTrending(id int) error {
	_, err := db.Exec("UPDATE anivorm_animes SET is_trending = NOT is_trending WHERE id = $1", id)
	return err
}

// SaveEpisode saves or updates an episode
func (db *DB) SaveEpisode(ep *Episode) error {
	if ep.FandubID <= 0 {
		ep.FandubID = 1
	}
	if ep.ID > 0 {
		query := `
		UPDATE anivorm_episodes SET
			anime_id = $1, episode_number = $2, title = $3, b2_key = $4,
			thumbnail_url = $5, duration = $6, is_vip_only = $7,
			has_uzbek_dub = $8, has_subtitles = $9, fandub_id = $10
		WHERE id = $11
		RETURNING id;
		`
		return db.QueryRow(
			query, ep.AnimeID, ep.EpisodeNumber, ep.Title, ep.B2Key, ep.ThumbnailURL, ep.Duration, ep.IsVIPOnly, ep.HasUzbekDub, ep.HasSubtitles, ep.FandubID, ep.ID,
		).Scan(&ep.ID)
	}

	query := `
	INSERT INTO anivorm_episodes (
		anime_id, episode_number, title, b2_key, thumbnail_url, duration, is_vip_only, has_uzbek_dub, has_subtitles, fandub_id
	) VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
	) ON CONFLICT (anime_id, episode_number) DO UPDATE SET
		title = EXCLUDED.title,
		b2_key = EXCLUDED.b2_key,
		thumbnail_url = EXCLUDED.thumbnail_url,
		is_vip_only = EXCLUDED.is_vip_only,
		fandub_id = EXCLUDED.fandub_id
	RETURNING id;
	`
	return db.QueryRow(
		query, ep.AnimeID, ep.EpisodeNumber, ep.Title, ep.B2Key, ep.ThumbnailURL, ep.Duration, ep.IsVIPOnly, ep.HasUzbekDub, ep.HasSubtitles, ep.FandubID,
	).Scan(&ep.ID)
}

// DeleteEpisode deletes an episode
func (db *DB) DeleteEpisode(id int) error {
	_, err := db.Exec("DELETE FROM anivorm_episodes WHERE id = $1", id)
	return err
}

// GetUsers lists all registered users (Telegram + Web) with deduplication
func (db *DB) GetUsers() ([]User, error) {
	rows, err := db.Query(`
		SELECT 
			u.id, 
			u.telegram_id, 
			COALESCE(u.username, '') AS username, 
			COALESCE(u.full_name, '') AS full_name, 
			(COALESCE(v.expires_at > NOW(), FALSE) OR COALESCE(au_sub.is_vip AND (au_sub.vip_expires_at IS NULL OR au_sub.vip_expires_at > NOW()), FALSE)) AS is_vip, 
			COALESCE(v.expires_at, au_sub.vip_expires_at) AS vip_expires_at, 
			u.created_at
		FROM users u
		LEFT JOIN vip_users v ON (u.telegram_id IS NOT NULL AND u.telegram_id = v.telegram_id) OR u.id = v.user_id
		LEFT JOIN anivorm_users au_sub ON (u.telegram_id IS NOT NULL AND u.telegram_id = au_sub.telegram_id)
		UNION ALL
		SELECT DISTINCT ON (au.username)
			au.id + 1000000 AS id,
			au.telegram_id,
			COALESCE(au.username, '') AS username,
			COALESCE(au.full_name, '') AS full_name,
			(au.is_vip AND (au.vip_expires_at IS NULL OR au.vip_expires_at > NOW())),
			au.vip_expires_at,
			au.created_at
		FROM anivorm_users au
		WHERE (au.telegram_id IS NULL OR au.telegram_id NOT IN (SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL))
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("❌ db.GetUsers() query error: %v", err)
		return []User{}, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var (
			id           int64
			tgID         *int64
			username     sql.NullString
			fullName     sql.NullString
			isVIP        bool
			vipExpiresAt *time.Time
			createdAt    time.Time
		)
		err := rows.Scan(&id, &tgID, &username, &fullName, &isVIP, &vipExpiresAt, &createdAt)
		if err != nil {
			log.Printf("❌ db.GetUsers() scan error: %v", err)
			continue
		}
		users = append(users, User{
			ID:           id,
			TelegramID:   tgID,
			Username:     username.String,
			FullName:     fullName.String,
			IsVIP:        isVIP,
			VIPExpiresAt: vipExpiresAt,
			CreatedAt:    createdAt,
		})
	}
	if users == nil {
		users = []User{}
	}
	return users, nil
}

// GrantVIP grants VIP status to user in both vip_users and anivorm_users
func (db *DB) GrantVIP(userID int64, tgID *int64, days int) error {
	expiresAt := time.Now().AddDate(0, 0, days)

	// If tgID is missing, resolve it from users or anivorm_users
	if tgID == nil || *tgID == 0 {
		if userID < 1000000 {
			_ = db.QueryRow("SELECT telegram_id FROM users WHERE id = $1", userID).Scan(&tgID)
		} else {
			realID := userID - 1000000
			_ = db.QueryRow("SELECT telegram_id FROM anivorm_users WHERE id = $1", realID).Scan(&tgID)
		}
	}

	if tgID != nil && *tgID != 0 {
		_, _ = db.Exec("DELETE FROM vip_users WHERE telegram_id = $1 OR user_id = $2", *tgID, userID)
		_, _ = db.Exec(`
			INSERT INTO vip_users (telegram_id, user_id, created_at, expires_at)
			VALUES ($1, $2, NOW(), $3)
		`, *tgID, userID, expiresAt)
	}

	realWebID := userID
	if userID >= 1000000 {
		realWebID = userID - 1000000
	}
	_, err := db.Exec(`
		UPDATE anivorm_users 
		SET is_vip = TRUE, vip_expires_at = $1 
		WHERE id = $2 OR (telegram_id IS NOT NULL AND telegram_id = $3)
	`, expiresAt, realWebID, tgID)
	return err
}

// RevokeVIP revokes VIP status
func (db *DB) RevokeVIP(userID int64, tgID *int64) error {
	if tgID == nil || *tgID == 0 {
		if userID < 1000000 {
			_ = db.QueryRow("SELECT telegram_id FROM users WHERE id = $1", userID).Scan(&tgID)
		} else {
			realID := userID - 1000000
			_ = db.QueryRow("SELECT telegram_id FROM anivorm_users WHERE id = $1", realID).Scan(&tgID)
		}
	}

	if tgID != nil && *tgID != 0 {
		_, _ = db.Exec("DELETE FROM vip_users WHERE telegram_id = $1 OR user_id = $2", *tgID, userID)
	}

	realWebID := userID
	if userID >= 1000000 {
		realWebID = userID - 1000000
	}
	_, err := db.Exec(`
		UPDATE anivorm_users 
		SET is_vip = FALSE, vip_expires_at = NULL 
		WHERE id = $2 OR (telegram_id IS NOT NULL AND telegram_id = $3)
	`, realWebID, tgID)
	return err
}

// SetUserVIP sets 30 days VIP status by telegramID
func (db *DB) SetUserVIP(telegramID int64, username string, fullName string) error {
	expiresAt := time.Now().AddDate(0, 1, 0)
	// 1. Insert into vip_users
	_, _ = db.Exec(`
		INSERT INTO vip_users (telegram_id, expires_at)
		VALUES ($1, $2)
		ON CONFLICT (telegram_id) DO UPDATE SET expires_at = EXCLUDED.expires_at
	`, telegramID, expiresAt)

	// 2. Also record in anivorm_users
	query := `
	INSERT INTO anivorm_users (telegram_id, username, full_name, is_vip, vip_expires_at)
	VALUES ($1, $2, $3, TRUE, $4)
	ON CONFLICT (telegram_id) DO UPDATE SET
		is_vip = TRUE,
		vip_expires_at = EXCLUDED.vip_expires_at,
		username = COALESCE(NULLIF(EXCLUDED.username, ''), anivorm_users.username);
	`
	_, err := db.Exec(query, telegramID, username, fullName, expiresAt)
	return err
}

// SetUserOneHourVIP sets 1 hour VIP status for joining required channels
func (db *DB) SetUserOneHourVIP(telegramID int64, username string, fullName string) error {
	expiresAt := time.Now().Add(1 * time.Hour)
	_, _ = db.Exec(`
		INSERT INTO vip_users (telegram_id, expires_at)
		VALUES ($1, $2)
		ON CONFLICT (telegram_id) DO UPDATE SET expires_at = GREATEST(vip_users.expires_at, EXCLUDED.expires_at)
	`, telegramID, expiresAt)

	query := `
	INSERT INTO anivorm_users (telegram_id, username, full_name, is_vip, vip_expires_at)
	VALUES ($1, $2, $3, TRUE, $4)
	ON CONFLICT (telegram_id) DO UPDATE SET
		is_vip = TRUE,
		vip_expires_at = GREATEST(COALESCE(anivorm_users.vip_expires_at, NOW()), EXCLUDED.vip_expires_at),
		username = COALESCE(NULLIF(EXCLUDED.username, ''), anivorm_users.username);
	`
	_, err := db.Exec(query, telegramID, username, fullName, expiresAt)
	return err
}

// GetRequiredChannels gets all required channels
func (db *DB) GetRequiredChannels() ([]RequiredChannel, error) {
	rows, err := db.Query(`
		SELECT id, platform, channel_id, title, invite_link, is_request, is_active, created_at
		FROM required_channels ORDER BY id ASC
	`)
	if err != nil {
		return []RequiredChannel{}, err
	}
	defer rows.Close()

	var channels []RequiredChannel
	for rows.Next() {
		var c RequiredChannel
		err := rows.Scan(&c.ID, &c.Platform, &c.ChannelID, &c.Title, &c.InviteLink, &c.IsRequest, &c.IsActive, &c.CreatedAt)
		if err == nil {
			channels = append(channels, c)
		}
	}
	if channels == nil {
		channels = []RequiredChannel{}
	}
	return channels, nil
}

// GetActiveRequiredChannels gets active required channels for subscription checks
func (db *DB) GetActiveRequiredChannels() ([]RequiredChannel, error) {
	rows, err := db.Query(`
		SELECT id, platform, channel_id, title, invite_link, is_request, is_active, created_at
		FROM required_channels WHERE is_active = TRUE ORDER BY id ASC
	`)
	if err != nil {
		return []RequiredChannel{}, err
	}
	defer rows.Close()

	var channels []RequiredChannel
	for rows.Next() {
		var c RequiredChannel
		err := rows.Scan(&c.ID, &c.Platform, &c.ChannelID, &c.Title, &c.InviteLink, &c.IsRequest, &c.IsActive, &c.CreatedAt)
		if err == nil {
			channels = append(channels, c)
		}
	}
	if channels == nil {
		channels = []RequiredChannel{}
	}
	return channels, nil
}

// SaveRequiredChannel inserts or updates a required channel
func (db *DB) SaveRequiredChannel(c *RequiredChannel) error {
	if c.ID > 0 {
		_, err := db.Exec(`
			UPDATE required_channels 
			SET platform = $1, channel_id = $2, title = $3, invite_link = $4, is_request = $5, is_active = $6
			WHERE id = $7
		`, c.Platform, c.ChannelID, c.Title, c.InviteLink, c.IsRequest, c.IsActive, c.ID)
		return err
	}
	_, err := db.Exec(`
		INSERT INTO required_channels (platform, channel_id, title, invite_link, is_request, is_active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`, c.Platform, c.ChannelID, c.Title, c.InviteLink, c.IsRequest, c.IsActive)
	return err
}

// DeleteRequiredChannel removes a required channel
func (db *DB) DeleteRequiredChannel(id int) error {
	_, err := db.Exec("DELETE FROM required_channels WHERE id = $1", id)
	return err
}

// CreateVIPClaim creates a pending VIP claim token
func (db *DB) CreateVIPClaim(token string, email string) error {
	_, err := db.Exec(`
		INSERT INTO anivorm_vip_claims (token, email, is_verified, is_used, created_at)
		VALUES ($1, NULLIF($2, ''), FALSE, FALSE, NOW())
		ON CONFLICT (token) DO NOTHING
	`, token, email)
	return err
}

// VerifyVIPClaim verifies a claim and grants 1 hour VIP
func (db *DB) VerifyVIPClaim(token string, telegramID int64, username string, fullName string) error {
	var email sql.NullString
	_ = db.QueryRow("SELECT email FROM anivorm_vip_claims WHERE token = $1", token).Scan(&email)

	// Grant 1 hour VIP to telegramID
	_ = db.SetUserOneHourVIP(telegramID, username, fullName)

	// If email was provided on web, also update that email user
	if email.Valid && email.String != "" {
		expiresAt := time.Now().Add(1 * time.Hour)
		_, _ = db.Exec(`
			UPDATE anivorm_users 
			SET is_vip = TRUE, vip_expires_at = GREATEST(COALESCE(vip_expires_at, NOW()), $1)
			WHERE username = $2
		`, expiresAt, email.String)
	}

	_, err := db.Exec(`
		UPDATE anivorm_vip_claims 
		SET is_verified = TRUE, user_id = $1
		WHERE token = $2
	`, telegramID, token)
	return err
}

// CheckVIPClaim checks status of VIP claim
func (db *DB) CheckVIPClaim(token string) (bool, error) {
	var isVerified bool
	err := db.QueryRow("SELECT is_verified FROM anivorm_vip_claims WHERE token = $1", token).Scan(&isVerified)
	if err != nil {
		return false, err
	}
	return isVerified, nil
}

// CreateAuthSession creates a pending Telegram auth token
func (db *DB) CreateAuthSession(token string) error {
	_, err := db.Exec(`
		INSERT INTO anivorm_auth_sessions (token, is_verified, created_at)
		VALUES ($1, FALSE, NOW())
		ON CONFLICT (token) DO NOTHING
	`, token)
	return err
}

// VerifyAuthSession marks session verified from Telegram bot
func (db *DB) VerifyAuthSession(token string, tgID int64, username string, firstName string, lastName string, photoURL string) error {
	isAdmin := tgID == 5415350162 || tgID == 6149114216 || username == "iskurama" || db.CheckIsAdmin(tgID)
	isVIP := isAdmin
	if !isVIP {
		var count int
		_ = db.QueryRow("SELECT COUNT(*) FROM vip_users WHERE telegram_id = $1 AND (expires_at IS NULL OR expires_at > NOW())", tgID).Scan(&count)
		if count > 0 {
			isVIP = true
		}
	}

	// Update session only if not expired (3 minutes TTL)
	res, err := db.Exec(`
		UPDATE anivorm_auth_sessions
		SET telegram_id = $1, username = $2, first_name = $3, last_name = $4, photo_url = $5, is_admin = $6, is_vip = $7, is_verified = TRUE
		WHERE token = $8 AND created_at >= NOW() - INTERVAL '3 minutes'
	`, tgID, username, firstName, lastName, photoURL, isAdmin, isVIP, token)
	if err != nil {
		return err
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("kirish so'rovi topilmadi yoki 3 daqiqalik muddati o'tgan")
	}

	// Auto-register / update in anivorm_users
	fullName := strings.TrimSpace(firstName + " " + lastName)
	if fullName == "" {
		fullName = username
	}
	if fullName == "" {
		fullName = fmt.Sprintf("User_%d", tgID)
	}
	_, _ = db.Exec(`
		INSERT INTO anivorm_users (telegram_id, username, full_name, is_vip, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (telegram_id) DO UPDATE
		SET username = COALESCE(NULLIF(EXCLUDED.username, ''), anivorm_users.username),
		    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), anivorm_users.full_name),
		    is_vip = CASE WHEN EXCLUDED.is_vip THEN TRUE ELSE anivorm_users.is_vip END,
		    updated_at = NOW()
	`, tgID, username, fullName, isVIP)

	return nil
}

// CheckAuthSession checks if user authenticated via Telegram bot and consumes one-time token
func (db *DB) CheckAuthSession(token string) (map[string]interface{}, bool, error) {
	var tgID sql.NullInt64
	var username, firstName, lastName, photoURL sql.NullString
	var isAdmin, isVIP, isVerified bool
	var createdAt time.Time
	err := db.QueryRow(`
		SELECT telegram_id, COALESCE(username, ''), COALESCE(first_name, ''), COALESCE(last_name, ''), COALESCE(photo_url, ''), is_admin, is_vip, is_verified, created_at
		FROM anivorm_auth_sessions WHERE token = $1
	`, token).Scan(&tgID, &username, &firstName, &lastName, &photoURL, &isAdmin, &isVIP, &isVerified, &createdAt)
	if err != nil {
		return nil, false, nil
	}
	if !isVerified || !tgID.Valid {
		return nil, false, nil
	}
	// Check 3-minute expiration
	if time.Since(createdAt) > 3*time.Minute {
		_, _ = db.Exec("DELETE FROM anivorm_auth_sessions WHERE token = $1", token)
		return nil, false, nil
	}

	// Consume token immediately (one-time use security protection against replay attacks)
	_, _ = db.Exec("DELETE FROM anivorm_auth_sessions WHERE token = $1", token)

	sessionToken := fmt.Sprintf("auth_tg_%d_%d", tgID.Int64, time.Now().Unix())
	_, _ = db.Exec(`
		INSERT INTO anivorm_auth_sessions (token, telegram_id, username, first_name, last_name, photo_url, is_admin, is_vip, is_verified, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW())
	`, sessionToken, tgID.Int64, username.String, firstName.String, lastName.String, photoURL.String, isAdmin, isVIP)

	session := map[string]interface{}{
		"id":          tgID.Int64,
		"telegram_id": tgID.Int64,
		"username":    username.String,
		"first_name":  firstName.String,
		"last_name":   lastName.String,
		"photo_url":   photoURL.String,
		"is_admin":    isAdmin || tgID.Int64 == 5415350162 || tgID.Int64 == 6149114216 || db.CheckIsAdmin(tgID.Int64),
		"is_vip":      isVIP,
		"token":       sessionToken,
	}
	return session, true, nil
}

// GetReceipts gets payment receipts
func (db *DB) GetReceipts() ([]Receipt, error) {
	rows, err := db.Query(`
		SELECT id, user_id, telegram_id, image_file_id, amount, status, COALESCE(admin_note, ''), created_at
		FROM anivorm_receipts ORDER BY id DESC LIMIT 100
	`)
	if err != nil {
		return []Receipt{}, err
	}
	defer rows.Close()

	var receipts []Receipt
	for rows.Next() {
		var r Receipt
		err := rows.Scan(&r.ID, &r.UserID, &r.TelegramID, &r.ImageFileID, &r.Amount, &r.Status, &r.AdminNote, &r.CreatedAt)
		if err == nil {
			receipts = append(receipts, r)
		}
	}
	if receipts == nil {
		receipts = []Receipt{}
	}
	return receipts, nil
}

// ApproveReceipt marks receipt approved and grants 30 days VIP
func (db *DB) ApproveReceipt(receiptID int) error {
	var tgID int64
	err := db.QueryRow("UPDATE anivorm_receipts SET status = 'approved' WHERE id = $1 RETURNING telegram_id", receiptID).Scan(&tgID)
	if err != nil {
		return err
	}
	return db.SetUserVIP(tgID, "", "")
}

// RejectReceipt marks receipt rejected
func (db *DB) RejectReceipt(receiptID int, note string) error {
	_, err := db.Exec("UPDATE anivorm_receipts SET status = 'rejected', admin_note = $1 WHERE id = $2", note, receiptID)
	return err
}

// GetStats returns counts for Dashboard Overview
func (db *DB) GetStats() DashboardStats {
	var stats DashboardStats
	_ = db.QueryRow("SELECT COUNT(*) FROM anivorm_animes").Scan(&stats.TotalAnimes)
	_ = db.QueryRow("SELECT COUNT(*) FROM anivorm_episodes").Scan(&stats.TotalEpisodes)
	_ = db.QueryRow(`
		SELECT (SELECT COUNT(*) FROM users) + 
		       (SELECT COUNT(DISTINCT username) FROM anivorm_users WHERE telegram_id IS NULL OR telegram_id NOT IN (SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL))
	`).Scan(&stats.TotalUsers)
	_ = db.QueryRow(`
		SELECT COUNT(DISTINCT telegram_id) FROM vip_users WHERE expires_at IS NULL OR expires_at > NOW()
	`).Scan(&stats.TotalVIPUsers)
	_ = db.QueryRow("SELECT COUNT(*) FROM anivorm_receipts WHERE status = 'pending'").Scan(&stats.PendingChecks)
	return stats
}


// IsFounder checks if the user is the immutable platform founder
func (db *DB) IsFounder(telegramID int64) bool {
	return telegramID == 5415350162 || telegramID == 4351671
}

// GetAdmins returns all admins from admins table with Founder marked
func (db *DB) GetAdmins() ([]AdminUser, error) {
	rows, err := db.Query(`
		SELECT id, telegram_id, full_name, COALESCE(role, 'ADMIN'), COALESCE(created_at, NOW())
		FROM admins
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var admins []AdminUser
	for rows.Next() {
		var a AdminUser
		if err := rows.Scan(&a.ID, &a.TelegramID, &a.FullName, &a.Role, &a.CreatedAt); err != nil {
			continue
		}
		if db.IsFounder(a.TelegramID) {
			a.Role = "FOUNDER"
		}
		admins = append(admins, a)
	}
	return admins, nil
}

// AddOrUpdateAdmin adds or updates an admin with role hierarchy enforcement
func (db *DB) AddOrUpdateAdmin(telegramID int64, fullName string, role string, actorTgID int64) error {
	if db.IsFounder(telegramID) {
		role = "FOUNDER"
	} else if role == "FOUNDER" {
		return fmt.Errorf("FOUNDER maqomi faqat tizim asoschisiga tegishli")
	}

	// Only Founder can grant SUPERADMIN role
	if role == "SUPERADMIN" && !db.IsFounder(actorTgID) {
		return fmt.Errorf("SuperAdmin rolini faqat Asoschi (Founder) tayinlashi mumkin")
	}

	if role == "" {
		role = "ADMIN"
	}
	_, err := db.Exec(`
		INSERT INTO admins (telegram_id, full_name, role, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (telegram_id) DO UPDATE 
		SET full_name = EXCLUDED.full_name, role = EXCLUDED.role
	`, telegramID, fullName, role)
	if err == nil {
		_, _ = db.Exec("UPDATE anivorm_auth_sessions SET is_admin = true WHERE telegram_id = $1", telegramID)
	}
	return err
}

// RemoveAdmin deletes an admin with role hierarchy protection (Founder can remove SuperAdmin)
func (db *DB) RemoveAdmin(targetTgID int64, actorTgID int64) error {
	if db.IsFounder(targetTgID) {
		return fmt.Errorf("Asoschi (Founder) daxlsiz, o'chirilishi mumkin emas")
	}

	var targetRole string
	_ = db.QueryRow("SELECT role FROM admins WHERE telegram_id = $1", targetTgID).Scan(&targetRole)
	if targetRole == "" {
		targetRole = "ADMIN"
	}

	// Only Founder can remove or demote a SUPERADMIN
	if (targetRole == "SUPERADMIN" || targetTgID == 6149114216) && !db.IsFounder(actorTgID) {
		return fmt.Errorf("SuperAdmin faqat Asoschi (Founder) tomonidan chiqarilishi mumkin")
	}

	_, err := db.Exec(`
		DELETE FROM admins 
		WHERE telegram_id = $1 AND telegram_id NOT IN (5415350162, 4351671)
	`, targetTgID)
	if err == nil {
		_, _ = db.Exec("UPDATE anivorm_auth_sessions SET is_admin = false WHERE telegram_id = $1", targetTgID)
	}
	return err
}

// GetUserAdminRole returns whether the user is an admin and their specific role (FOUNDER, SUPERADMIN, ADMIN, MODERATOR)
func (db *DB) GetUserAdminRole(telegramID int64) (bool, string) {
	if db.IsFounder(telegramID) {
		return true, "FOUNDER"
	}
	if telegramID == 6149114216 {
		return true, "SUPERADMIN"
	}
	var role string
	err := db.QueryRow("SELECT role FROM admins WHERE telegram_id = $1", telegramID).Scan(&role)
	if err == nil {
		if role == "" {
			role = "ADMIN"
		}
		return true, role
	}
	return false, "USER"
}

// CheckIsAdmin checks if user is in admins table or hardcoded superadmins
func (db *DB) CheckIsAdmin(telegramID int64) bool {
	if db.IsFounder(telegramID) || telegramID == 6149114216 {
		return true
	}
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM admins WHERE telegram_id = $1", telegramID).Scan(&count)
	return count > 0
}

// VerifyAdminToken checks if the bearer token belongs to a verified admin session
func (db *DB) VerifyAdminToken(token string) bool {
	if token == "" {
		return false
	}
	// Optional constant-time secure SHA-256 check if master hash is provided in env
	masterHash := os.Getenv("SUPERADMIN_TOKEN_HASH")
	if masterHash != "" {
		h := sha256.Sum256([]byte(token))
		tokenHash := hex.EncodeToString(h[:])
		if subtle.ConstantTimeCompare([]byte(tokenHash), []byte(masterHash)) == 1 {
			return true
		}
	}

	var tgID sql.NullInt64
	var isAdmin, isVerified bool
	err := db.QueryRow(`
		SELECT telegram_id, is_admin, is_verified 
		FROM anivorm_auth_sessions 
		WHERE token = $1
	`, token).Scan(&tgID, &isAdmin, &isVerified)
	if err == nil && isVerified && tgID.Valid {
		if isAdmin || db.IsFounder(tgID.Int64) || tgID.Int64 == 6149114216 {
			return true
		}
		return db.CheckIsAdmin(tgID.Int64)
	}
	return false
}

type GenreItem struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (db *DB) GetGenresList() ([]GenreItem, error) {
	rows, err := db.Query("SELECT id, name, slug FROM genres ORDER BY name ASC")
	if err != nil {
		return []GenreItem{}, err
	}
	defer rows.Close()
	var items []GenreItem
	for rows.Next() {
		var g GenreItem
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug); err == nil {
			items = append(items, g)
		}
	}
	return items, nil
}

// =================== FANDUB FUNCTIONS ===================

// GetFandubs returns all fandub studios with primary admin info
func (db *DB) GetFandubs() ([]Fandub, error) {
	rows, err := db.Query(`
		SELECT f.id, f.name, f.slug, COALESCE(f.logo_url, ''), COALESCE(f.description, ''), f.created_at,
		       COALESCE(fu.telegram_id, 0), COALESCE(u.username, ''), COALESCE(u.full_name, '')
		FROM anivorm_fandubs f
		LEFT JOIN LATERAL (
			SELECT fu_inner.telegram_id
			FROM anivorm_fandub_users fu_inner
			WHERE fu_inner.fandub_id = f.id AND fu_inner.role = 'ADMIN'
			ORDER BY fu_inner.id ASC
			LIMIT 1
		) fu ON true
		LEFT JOIN anivorm_users u ON u.telegram_id = fu.telegram_id
		ORDER BY f.id ASC
	`)
	if err != nil {
		return []Fandub{}, err
	}
	defer rows.Close()

	var list []Fandub
	for rows.Next() {
		var f Fandub
		if err := rows.Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt, &f.AdminTelegramID, &f.AdminUsername, &f.AdminFullName); err == nil {
			list = append(list, f)
		}
	}
	if list == nil {
		list = []Fandub{}
	}
	return list, nil
}

// CreateFandub creates a new fandub studio
func (db *DB) CreateFandub(name, slug, logoURL, description string) (*Fandub, error) {
	var f Fandub
	err := db.QueryRow(`
		INSERT INTO anivorm_fandubs (name, slug, logo_url, description)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, slug, COALESCE(logo_url, ''), COALESCE(description, ''), created_at
	`, name, slug, logoURL, description).Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// DeleteFandub safely deletes a fandub studio if and only if it has zero episodes
func (db *DB) DeleteFandub(id int) error {
	if id == 1 {
		return fmt.Errorf("birlamchi 'Hikaku Dub' ni o'chirib bo'lmaydi")
	}
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM anivorm_episodes WHERE fandub_id = $1", id).Scan(&count)
	if count > 0 {
		return fmt.Errorf("ushbu fandub studiyasiga tegishli %d ta qism mavjud. Studiyani o'chirishdan oldin uning barcha qismlarini o'chirib chiqishingiz shart", count)
	}
	_, _ = db.Exec("DELETE FROM anivorm_fandub_users WHERE fandub_id = $1", id)
	_, _ = db.Exec("DELETE FROM anivorm_fandub_settings WHERE fandub_id = $1", id)
	_, _ = db.Exec("DELETE FROM anivorm_fandub_custom_profiles WHERE fandub_id = $1", id)
	_, err := db.Exec("DELETE FROM anivorm_fandubs WHERE id = $1", id)
	return err
}

// GetFandubUsers gets all users assigned to a fandub with Telegram user details
func (db *DB) GetFandubUsers(fandubID int) ([]FandubUser, error) {
	rows, err := db.Query(`
		SELECT fu.id, fu.fandub_id, f.name, fu.telegram_id, fu.role,
		       COALESCE(u.username, ''), COALESCE(u.full_name, ''), '', fu.created_at
		FROM anivorm_fandub_users fu
		JOIN anivorm_fandubs f ON fu.fandub_id = f.id
		LEFT JOIN anivorm_users u ON fu.telegram_id = u.telegram_id
		WHERE fu.fandub_id = $1
		ORDER BY fu.role = 'ADMIN' DESC, fu.id ASC
	`, fandubID)
	if err != nil {
		return []FandubUser{}, err
	}
	defer rows.Close()

	var list []FandubUser
	for rows.Next() {
		var u FandubUser
		if err := rows.Scan(
			&u.ID, &u.FandubID, &u.FandubName, &u.TelegramID, &u.Role,
			&u.Username, &u.FirstName, &u.PhotoURL, &u.CreatedAt,
		); err == nil {
			list = append(list, u)
		}
	}
	if list == nil {
		list = []FandubUser{}
	}
	return list, nil
}

// AddFandubUser assigns a user to a fandub
func (db *DB) AddFandubUser(fandubID int, telegramID int64, role string) error {
	if role == "" {
		role = "MEMBER"
	}
	_, err := db.Exec(`
		INSERT INTO anivorm_fandub_users (fandub_id, telegram_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (fandub_id, telegram_id) DO UPDATE SET role = EXCLUDED.role
	`, fandubID, telegramID, role)
	return err
}

// RemoveFandubUser unassigns a user from a fandub
func (db *DB) RemoveFandubUser(fandubID int, telegramID int64) error {
	_, err := db.Exec("DELETE FROM anivorm_fandub_users WHERE fandub_id = $1 AND telegram_id = $2", fandubID, telegramID)
	return err
}

// GetUserFandubs returns fandubs assigned to a specific telegram ID
func (db *DB) GetUserFandubs(telegramID int64) ([]Fandub, error) {
	rows, err := db.Query(`
		SELECT f.id, f.name, f.slug, COALESCE(f.logo_url, ''), COALESCE(f.description, ''), f.created_at
		FROM anivorm_fandubs f
		JOIN anivorm_fandub_users fu ON f.id = fu.fandub_id
		WHERE fu.telegram_id = $1
	`, telegramID)
	if err != nil {
		return []Fandub{}, err
	}
	defer rows.Close()

	var list []Fandub
	for rows.Next() {
		var f Fandub
		if err := rows.Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt); err == nil {
			list = append(list, f)
		}
	}
	if list == nil {
		list = []Fandub{}
	}
	return list, nil
}

// =================== AUDIT LOG FUNCTIONS ===================

// CreateAuditLog records an admin action
func (db *DB) CreateAuditLog(actorID int64, actorName, action, entityType, entityID, details string) error {
	_, err := db.Exec(`
		INSERT INTO anivorm_audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb)
	`, actorID, actorName, action, entityType, entityID, details)
	if err != nil {
		safeJSON := fmt.Sprintf("{\"info\": %q}", details)
		_, err = db.Exec(`
			INSERT INTO anivorm_audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
			VALUES ($1, $2, $3, $4, $5, $6::jsonb)
		`, actorID, actorName, action, entityType, entityID, safeJSON)
	}
	return err
}

// GetAuditLogs returns the most recent audit logs
func (db *DB) GetAuditLogs(limit int) ([]AuditLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := db.Query(`
		SELECT id, actor_id, actor_name, action, entity_type, COALESCE(entity_id, ''), COALESCE(details::text, ''), created_at
		FROM anivorm_audit_logs
		ORDER BY id DESC LIMIT $1
	`, limit)
	if err != nil {
		return []AuditLog{}, err
	}
	defer rows.Close()

	var list []AuditLog
	for rows.Next() {
		var a AuditLog
		if err := rows.Scan(&a.ID, &a.ActorID, &a.ActorName, &a.Action, &a.EntityType, &a.EntityID, &a.Details, &a.CreatedAt); err == nil {
			list = append(list, a)
		}
	}
	if list == nil {
		list = []AuditLog{}
	}
	return list, nil
}

// =================== SQL SEARCH FUNCTIONS ===================

// SearchAnimesSQL searches animes directly using PostgreSQL ILIKE
func (db *DB) SearchAnimesSQL(q string, limit int) ([]Anime, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	param := "%" + strings.TrimSpace(q) + "%"
	rows, err := db.Query(`
		SELECT 
			id, COALESCE(mal_id, 0), title_uz, COALESCE(title_en, ''), COALESCE(title_jp, ''),
			slug, COALESCE(synopsis, ''), COALESCE(poster_url, ''), COALESCE(banner_url, ''),
			COALESCE(score, 0.0), COALESCE(episodes_count, 0), COALESCE(current_episode, 0),
			COALESCE(status, 'Ongoing'), COALESCE(season, ''), COALESCE(year, 2026),
			COALESCE(studio, ''), COALESCE(genres, '{}'), COALESCE(is_trending, false),
			COALESCE(is_featured, false), created_at
		FROM anivorm_animes
		WHERE title_uz ILIKE $1 OR title_en ILIKE $1 OR title_jp ILIKE $1
		ORDER BY score DESC, id DESC LIMIT $2
	`, param, limit)
	if err != nil {
		return []Anime{}, err
	}
	defer rows.Close()

	var list []Anime
	for rows.Next() {
		var a Anime
		var score float64
		err := rows.Scan(
			&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp,
			&a.Slug, &a.Synopsis, &a.PosterURL, &a.BannerURL,
			&score, &a.EpisodesCount, &a.CurrentEpisode,
			&a.Status, &a.Season, &a.Year,
			&a.Studio, pq.Array(&a.Genres), &a.IsTrending,
			&a.IsFeatured, &a.CreatedAt,
		)
		if err == nil {
			a.Score = score
			a.TelegramURL = a.Studio
			list = append(list, a)
		}
	}
	if list == nil {
		list = []Anime{}
	}
	return list, nil
}
