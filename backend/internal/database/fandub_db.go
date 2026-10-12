package database

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/lib/pq"
)

// GetFandubByID retrieves a fandub studio by ID
func (db *DB) GetFandubByID(id int) (*Fandub, error) {
	var f Fandub
	err := db.QueryRow(`
		SELECT id, name, slug, COALESCE(logo_url, ''), COALESCE(description, ''), created_at
		FROM anivorm_fandubs
		WHERE id = $1
	`, id).Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// UpdateFandub updates fandub studio profile
func (db *DB) UpdateFandub(id int, name, logoURL, description string) error {
	_, err := db.Exec(`
		UPDATE anivorm_fandubs
		SET name = COALESCE(NULLIF($1, ''), name),
		    logo_url = $2,
		    description = $3
		WHERE id = $4
	`, name, logoURL, description, id)
	return err
}

// GetUserFandubInfo returns the fandub and role for a given telegram ID (supports optional target fandub ID)
func (db *DB) GetUserFandubInfo(telegramID int64, targetFandubID ...int) (*Fandub, string, error) {
	targetID := 0
	if len(targetFandubID) > 0 {
		targetID = targetFandubID[0]
	}

	isAdmin := telegramID == 5415350162 || telegramID == 6149114216 || db.CheckIsAdmin(telegramID)

	// If a specific target fandub is requested
	if targetID > 0 {
		if isAdmin {
			fDub, err := db.GetFandubByID(targetID)
			if err == nil {
				return fDub, "ADMIN", nil
			}
		}

		var f Fandub
		var role string
		err := db.QueryRow(`
			SELECT f.id, f.name, f.slug, COALESCE(f.logo_url, ''), COALESCE(f.description, ''), f.created_at, fu.role
			FROM anivorm_fandubs f
			JOIN anivorm_fandub_users fu ON f.id = fu.fandub_id
			WHERE fu.telegram_id = $1 AND f.id = $2
			LIMIT 1
		`, telegramID, targetID).Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt, &role)
		if err == nil {
			return &f, role, nil
		}
	}

	// Default fallback: Check assigned fandubs first
	var f Fandub
	var role string
	err := db.QueryRow(`
		SELECT f.id, f.name, f.slug, COALESCE(f.logo_url, ''), COALESCE(f.description, ''), f.created_at, fu.role
		FROM anivorm_fandubs f
		JOIN anivorm_fandub_users fu ON f.id = fu.fandub_id
		WHERE fu.telegram_id = $1
		ORDER BY fu.id ASC LIMIT 1
	`, telegramID).Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt, &role)
	if err == nil {
		return &f, role, nil
	}

	// Superadmin fallback to Hikaku Dub
	if isAdmin {
		fDub, err2 := db.GetFandubByID(1)
		if err2 == nil {
			return fDub, "ADMIN", nil
		}
	}

	return nil, "", err
}

// GetFandubStats returns count of episodes and unique animes uploaded by this fandub
func (db *DB) GetFandubStats(fandubID int) (int, int, error) {
	var epCount, animeCount int
	err := db.QueryRow(`
		SELECT COUNT(*), COUNT(DISTINCT anime_id)
		FROM anivorm_episodes
		WHERE fandub_id = $1
	`, fandubID).Scan(&epCount, &animeCount)
	if err != nil {
		return 0, 0, err
	}
	return epCount, animeCount, nil
}

// GetFandubEpisodes returns all episodes belonging to a specific fandub
func (db *DB) GetFandubEpisodes(fandubID int) ([]Episode, error) {
	rows, err := db.Query(`
		SELECT 
			e.id, e.anime_id, COALESCE(a.title_uz, ''), e.episode_number, e.title,
			e.b2_key, COALESCE(e.thumbnail_url, ''),
			e.duration, e.is_vip_only, e.has_uzbek_dub, e.has_subtitles,
			COALESCE(e.fandub_id, 1), COALESCE(f.name, 'Hikaku Dub'), e.created_at
		FROM anivorm_episodes e
		LEFT JOIN anivorm_animes a ON e.anime_id = a.id
		LEFT JOIN anivorm_fandubs f ON e.fandub_id = f.id
		WHERE e.fandub_id = $1
		ORDER BY e.anime_id DESC, e.episode_number ASC, e.id DESC
	`, fandubID)
	if err != nil {
		return []Episode{}, err
	}
	defer rows.Close()

	var list []Episode
	for rows.Next() {
		var ep Episode
		err := rows.Scan(
			&ep.ID, &ep.AnimeID, &ep.AnimeTitle, &ep.EpisodeNumber, &ep.Title,
			&ep.B2Key, &ep.ThumbnailURL,
			&ep.Duration, &ep.IsVIPOnly, &ep.HasUzbekDub, &ep.HasSubtitles,
			&ep.FandubID, &ep.FandubName, &ep.CreatedAt,
		)
		if err == nil {
			if strings.HasSuffix(ep.B2Key, ".m3u8") {
				ep.StreamURL = fmt.Sprintf("/stream/episode/%d.m3u8", ep.ID)
			} else {
				ep.StreamURL = fmt.Sprintf("/stream/episode/%d", ep.ID)
			}
			ep.VideoURL = ep.B2Key
			list = append(list, ep)
		}
	}
	if list == nil {
		list = []Episode{}
	}
	return list, nil
}

// formatCleanTelegramURL formats @username or username into full https://t.me/username
func formatCleanTelegramURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "https://t.me/iskurama"
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	clean := strings.TrimPrefix(raw, "@")
	clean = strings.TrimPrefix(clean, "t.me/")
	return "https://t.me/" + clean
}

// GetFandubSettings retrieves settings for a specific fandub with smart fallback
func (db *DB) GetFandubSettings(fandubID int) (*FandubSettings, error) {
	var s FandubSettings
	err := db.QueryRow(`
		SELECT id, fandub_id, COALESCE(card_number, ''), COALESCE(card_holder, ''),
		       COALESCE(vip_price, 10000), COALESCE(contact_url, ''), created_at, updated_at
		FROM anivorm_fandub_settings
		WHERE fandub_id = $1
	`, fandubID).Scan(&s.ID, &s.FandubID, &s.CardNumber, &s.CardHolder, &s.VIPPrice, &s.ContactURL, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		s = FandubSettings{
			FandubID:   fandubID,
			VIPPrice:   10000,
			ContactURL: "",
		}
	}

	// Auto-fallback: if contact_url is empty, check telegram_admin or telegram_channel from custom profile
	if strings.TrimSpace(s.ContactURL) == "" {
		var tgAdmin, tgChannel string
		_ = db.QueryRow(`
			SELECT COALESCE(telegram_admin, ''), COALESCE(telegram_channel, '')
			FROM anivorm_fandub_custom_profiles
			WHERE fandub_id = $1
		`, fandubID).Scan(&tgAdmin, &tgChannel)

		if strings.TrimSpace(tgAdmin) != "" {
			s.ContactURL = formatCleanTelegramURL(tgAdmin)
		} else if strings.TrimSpace(tgChannel) != "" {
			s.ContactURL = formatCleanTelegramURL(tgChannel)
		} else {
			s.ContactURL = "https://t.me/iskurama"
		}
	} else {
		s.ContactURL = formatCleanTelegramURL(s.ContactURL)
	}

	return &s, nil
}

// SaveFandubSettings saves or updates settings for a fandub
func (db *DB) SaveFandubSettings(fandubID int, cardNumber, cardHolder string, vipPrice int, contactURL string) error {
	if vipPrice <= 0 {
		vipPrice = 10000
	}
	_, err := db.Exec(`
		INSERT INTO anivorm_fandub_settings (fandub_id, card_number, card_holder, vip_price, contact_url, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (fandub_id) DO UPDATE
		SET card_number = EXCLUDED.card_number,
		    card_holder = EXCLUDED.card_holder,
		    vip_price = EXCLUDED.vip_price,
		    contact_url = EXCLUDED.contact_url,
		    updated_at = NOW()
	`, fandubID, cardNumber, cardHolder, vipPrice, contactURL)
	return err
}

// GetFandubVIPUsers returns all VIP members of this fandub
func (db *DB) GetFandubVIPUsers(fandubID int) ([]FandubVIPUser, error) {
	rows, err := db.Query(`
		SELECT id, fandub_id, user_id, telegram_id, COALESCE(full_name, ''), COALESCE(username, ''),
		       days, expires_at, created_at, (expires_at > NOW()) as is_active
		FROM anivorm_fandub_vip_users
		WHERE fandub_id = $1
		ORDER BY expires_at DESC
	`, fandubID)
	if err != nil {
		return []FandubVIPUser{}, err
	}
	defer rows.Close()

	var list []FandubVIPUser
	for rows.Next() {
		var u FandubVIPUser
		if err := rows.Scan(&u.ID, &u.FandubID, &u.UserID, &u.TelegramID, &u.FullName, &u.Username, &u.Days, &u.ExpiresAt, &u.CreatedAt, &u.IsActive); err == nil {
			list = append(list, u)
		}
	}
	if list == nil {
		list = []FandubVIPUser{}
	}
	return list, nil
}

// GrantFandubVIP gives VIP status to a user for this specific fandub
func (db *DB) GrantFandubVIP(fandubID int, telegramID int64, days int, fullName, username string) error {
	if days <= 0 {
		days = 30
	}
	if fullName == "" {
		fullName = fmt.Sprintf("User_%d", telegramID)
	}

	_, err := db.Exec(`
		INSERT INTO anivorm_fandub_vip_users (fandub_id, user_id, telegram_id, full_name, username, days, expires_at, created_at)
		VALUES ($1, $2, $2, $3, $4, $5, NOW() + ($5 || ' days')::INTERVAL, NOW())
		ON CONFLICT (fandub_id, telegram_id) DO UPDATE
		SET days = EXCLUDED.days,
		    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), anivorm_fandub_vip_users.full_name),
		    username = COALESCE(NULLIF(EXCLUDED.username, ''), anivorm_fandub_vip_users.username),
		    expires_at = CASE 
		        WHEN anivorm_fandub_vip_users.expires_at > NOW() 
		        THEN anivorm_fandub_vip_users.expires_at + (EXCLUDED.days || ' days')::INTERVAL
		        ELSE NOW() + (EXCLUDED.days || ' days')::INTERVAL
		    END
	`, fandubID, telegramID, fullName, username, days)
	return err
}

// RevokeFandubVIP cancels VIP status for this user in this fandub
func (db *DB) RevokeFandubVIP(fandubID int, telegramID int64) error {
	_, err := db.Exec(`
		DELETE FROM anivorm_fandub_vip_users
		WHERE fandub_id = $1 AND telegram_id = $2
	`, fandubID, telegramID)
	return err
}

// CheckUserFandubVIP checks if a user has active VIP for this fandub
func (db *DB) CheckUserFandubVIP(fandubID int, telegramID int64) bool {
	if telegramID == 5415350162 || telegramID == 6149114216 {
		return true
	}
	if telegramID == 0 || fandubID == 0 {
		return false
	}
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) 
		FROM anivorm_fandub_vip_users
		WHERE fandub_id = $1 AND telegram_id = $2 AND expires_at > NOW()
	`, fandubID, telegramID).Scan(&count)
	return err == nil && count > 0
}

// GetFandubReceipts returns pending and historical payment receipts for a fandub
func (db *DB) GetFandubReceipts(fandubID int) ([]FandubReceipt, error) {
	rows, err := db.Query(`
		SELECT id, fandub_id, user_id, telegram_id, image_file_id, amount, status, COALESCE(admin_note, ''), created_at
		FROM anivorm_fandub_receipts
		WHERE fandub_id = $1
		ORDER BY id DESC LIMIT 50
	`, fandubID)
	if err != nil {
		return []FandubReceipt{}, err
	}
	defer rows.Close()

	var list []FandubReceipt
	for rows.Next() {
		var r FandubReceipt
		if err := rows.Scan(&r.ID, &r.FandubID, &r.UserID, &r.TelegramID, &r.ImageFileID, &r.Amount, &r.Status, &r.AdminNote, &r.CreatedAt); err == nil {
			list = append(list, r)
		}
	}
	if list == nil {
		list = []FandubReceipt{}
	}
	return list, nil
}

// ApproveFandubReceipt marks receipt approved and grants VIP
func (db *DB) ApproveFandubReceipt(receiptID int, fandubID int, days int) error {
	var telegramID int64
	err := db.QueryRow(`
		UPDATE anivorm_fandub_receipts
		SET status = 'APPROVED', admin_note = 'Tasdiqlandi'
		WHERE id = $1 AND fandub_id = $2
		RETURNING telegram_id
	`, receiptID, fandubID).Scan(&telegramID)
	if err != nil {
		return err
	}
	return db.GrantFandubVIP(fandubID, telegramID, days, "", "")
}

// RejectFandubReceipt marks receipt rejected with a note
func (db *DB) RejectFandubReceipt(receiptID int, fandubID int, note string) error {
	_, err := db.Exec(`
		UPDATE anivorm_fandub_receipts
		SET status = 'REJECTED', admin_note = $1
		WHERE id = $2 AND fandub_id = $3
	`, note, receiptID, fandubID)
	return err
}

// InitFandubFollowersTable creates the followers table safely (Zero-Migration)
func (db *DB) InitFandubFollowersTable() {
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS anivorm_fandub_followers (
			id SERIAL PRIMARY KEY,
			fandub_id INT NOT NULL,
			telegram_id BIGINT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(fandub_id, telegram_id)
		);
		CREATE INDEX IF NOT EXISTS idx_fandub_followers_fid ON anivorm_fandub_followers(fandub_id);
	`)
}

// GetFandubBySlug retrieves a fandub studio by slug or numeric ID string
func (db *DB) GetFandubBySlug(slugOrID string) (*Fandub, error) {
	var f Fandub
	var err error
	if id, parseErr := strconv.Atoi(slugOrID); parseErr == nil && id > 0 {
		err = db.QueryRow(`
			SELECT id, name, slug, COALESCE(logo_url, ''), COALESCE(description, ''), created_at
			FROM anivorm_fandubs
			WHERE id = $1
		`, id).Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt)
	} else {
		err = db.QueryRow(`
			SELECT id, name, slug, COALESCE(logo_url, ''), COALESCE(description, ''), created_at
			FROM anivorm_fandubs
			WHERE slug = $1
		`, slugOrID).Scan(&f.ID, &f.Name, &f.Slug, &f.LogoURL, &f.Description, &f.CreatedAt)
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// GetFandubsWithStats returns all fandub studios enriched with episode, anime, follower counts and VIP price
func (db *DB) GetFandubsWithStats() ([]FandubPublicInfo, error) {
	db.InitFandubFollowersTable()

	query := `
		SELECT 
			f.id, f.name, f.slug, COALESCE(f.logo_url, ''), COALESCE(f.description, ''), f.created_at,
			COALESCE(e.ep_count, 0) AS episodes_count,
			COALESCE(e.anime_count, 0) AS animes_count,
			COALESCE(fl.followers_count, 0) AS followers_count,
			COALESCE(s.vip_price, 10000) AS vip_price,
			COALESCE(s.contact_url, '') AS contact_url
		FROM anivorm_fandubs f
		LEFT JOIN (
			SELECT fandub_id, COUNT(*) as ep_count, COUNT(DISTINCT anime_id) as anime_count
			FROM anivorm_episodes
			GROUP BY fandub_id
		) e ON f.id = e.fandub_id
		LEFT JOIN (
			SELECT fandub_id, COUNT(*) as followers_count
			FROM anivorm_fandub_followers
			GROUP BY fandub_id
		) fl ON f.id = fl.fandub_id
		LEFT JOIN anivorm_fandub_settings s ON f.id = s.fandub_id
		ORDER BY episodes_count DESC, f.id ASC
	`
	rows, err := db.Query(query)
	if err != nil {
		return []FandubPublicInfo{}, err
	}
	defer rows.Close()

	var list []FandubPublicInfo
	for rows.Next() {
		var info FandubPublicInfo
		if err := rows.Scan(
			&info.ID, &info.Name, &info.Slug, &info.LogoURL, &info.Description, &info.CreatedAt,
			&info.EpisodesCount, &info.AnimesCount, &info.FollowersCount,
			&info.VIPPrice, &info.ContactURL,
		); err == nil {
			list = append(list, info)
		}
	}
	if list == nil {
		list = []FandubPublicInfo{}
	}
	return list, nil
}

// GetFandubPublicDetail returns complete public ecosystem data for a fandub
func (db *DB) GetFandubPublicDetail(slugOrID string) (*FandubPublicInfo, []FandubUser, []Anime, []Episode, *FandubCustomProfile, error) {
	db.InitFandubFollowersTable()
	db.InitFandubCustomProfilesTable()

	f, err := db.GetFandubBySlug(slugOrID)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}

	// 1. Stats and VIP settings
	info := FandubPublicInfo{
		ID:          f.ID,
		Name:        f.Name,
		Slug:        f.Slug,
		LogoURL:     f.LogoURL,
		Description: f.Description,
		CreatedAt:   f.CreatedAt,
		VIPPrice:    10000,
		ContactURL:  "https://t.me/iskurama",
	}

	_ = db.QueryRow(`
		SELECT COUNT(*), COUNT(DISTINCT anime_id)
		FROM anivorm_episodes WHERE fandub_id = $1
	`, f.ID).Scan(&info.EpisodesCount, &info.AnimesCount)

	_ = db.QueryRow(`
		SELECT COUNT(*) FROM anivorm_fandub_followers WHERE fandub_id = $1
	`, f.ID).Scan(&info.FollowersCount)

	var dbContactURL string
	_ = db.QueryRow(`
		SELECT COALESCE(vip_price, 10000), COALESCE(contact_url, '')
		FROM anivorm_fandub_settings WHERE fandub_id = $1
	`, f.ID).Scan(&info.VIPPrice, &dbContactURL)
	if dbContactURL != "" {
		info.ContactURL = formatCleanTelegramURL(dbContactURL)
	} else {
		var tgAdmin, tgChannel string
		_ = db.QueryRow(`
			SELECT COALESCE(telegram_admin, ''), COALESCE(telegram_channel, '')
			FROM anivorm_fandub_custom_profiles WHERE fandub_id = $1
		`, f.ID).Scan(&tgAdmin, &tgChannel)
		if tgAdmin != "" {
			info.ContactURL = formatCleanTelegramURL(tgAdmin)
		} else if tgChannel != "" {
			info.ContactURL = formatCleanTelegramURL(tgChannel)
		}
	}

	// 2. Members with Telegram profile info
	members, _ := db.GetFandubUsers(f.ID)

	// 3. Animes voiced by this fandub
	animeRows, err := db.Query(`
		SELECT DISTINCT a.id, COALESCE(a.mal_id, 0), a.title_uz, COALESCE(a.title_en, ''), COALESCE(a.title_jp, ''), a.slug,
		       COALESCE(a.synopsis, ''), COALESCE(a.poster_url, ''), COALESCE(a.banner_url, ''),
		       a.score, a.episodes_count, a.current_episode, a.status, a.season, a.year, a.studio, a.genres, a.is_trending, a.is_featured, a.created_at
		FROM anivorm_animes a
		JOIN anivorm_episodes e ON a.id = e.anime_id
		WHERE e.fandub_id = $1
		ORDER BY a.id DESC
	`, f.ID)
	var animes []Anime
	if err == nil {
		defer animeRows.Close()
		for animeRows.Next() {
			var a Anime
			var score float64
			if scanErr := animeRows.Scan(
				&a.ID, &a.MALID, &a.TitleUz, &a.TitleEn, &a.TitleJp, &a.Slug,
				&a.Synopsis, &a.PosterURL, &a.BannerURL,
				&score, &a.EpisodesCount, &a.CurrentEpisode, &a.Status, &a.Season, &a.Year, &a.Studio, pq.Array(&a.Genres), &a.IsTrending, &a.IsFeatured, &a.CreatedAt,
			); scanErr == nil {
				a.Score = score
				animes = append(animes, a)
			}
		}
	}
	if animes == nil {
		animes = []Anime{}
	}

	// 4. Recent episodes released by this fandub
	episodes, _ := db.GetFandubEpisodes(f.ID)

	// 5. Custom Profile (theme, banner, socials, announcement)
	customProfile, _ := db.GetFandubCustomProfile(f.ID)

	return &info, members, animes, episodes, customProfile, nil
}

// ToggleFandubFollow toggles a user's follow status for a fandub
func (db *DB) ToggleFandubFollow(fandubID int, telegramID int64) (bool, int, error) {
	db.InitFandubFollowersTable()
	if fandubID <= 0 || telegramID <= 0 {
		return false, 0, fmt.Errorf("invalid IDs")
	}

	var exists bool
	_ = db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM anivorm_fandub_followers WHERE fandub_id = $1 AND telegram_id = $2)
	`, fandubID, telegramID).Scan(&exists)

	if exists {
		_, err := db.Exec(`DELETE FROM anivorm_fandub_followers WHERE fandub_id = $1 AND telegram_id = $2`, fandubID, telegramID)
		if err != nil {
			return true, 0, err
		}
		var total int
		_ = db.QueryRow(`SELECT COUNT(*) FROM anivorm_fandub_followers WHERE fandub_id = $1`, fandubID).Scan(&total)
		return false, total, nil
	}

	_, err := db.Exec(`
		INSERT INTO anivorm_fandub_followers (fandub_id, telegram_id)
		VALUES ($1, $2)
		ON CONFLICT (fandub_id, telegram_id) DO NOTHING
	`, fandubID, telegramID)
	if err != nil {
		return false, 0, err
	}

	var total int
	_ = db.QueryRow(`SELECT COUNT(*) FROM anivorm_fandub_followers WHERE fandub_id = $1`, fandubID).Scan(&total)
	return true, total, nil
}

// IsUserFollowingFandub checks if user is following this fandub
func (db *DB) IsUserFollowingFandub(fandubID int, telegramID int64) bool {
	if fandubID <= 0 || telegramID <= 0 {
		return false
	}
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM anivorm_fandub_followers WHERE fandub_id = $1 AND telegram_id = $2)
	`, fandubID, telegramID).Scan(&exists)
	return err == nil && exists
}

// InitFandubCustomProfilesTable creates the custom profiles table safely (Zero-Migration)
func (db *DB) InitFandubCustomProfilesTable() {
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS anivorm_fandub_custom_profiles (
			fandub_id INT PRIMARY KEY,
			theme_color TEXT DEFAULT 'amber',
			banner_url TEXT DEFAULT '',
			telegram_channel TEXT DEFAULT '',
			telegram_admin TEXT DEFAULT '',
			telegram_ads TEXT DEFAULT '',
			instagram_url TEXT DEFAULT '',
			announcement_text TEXT DEFAULT '',
			announcement_active BOOLEAN DEFAULT false,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
}

// GetFandubCustomProfile retrieves custom styling & socials for a fandub
func (db *DB) GetFandubCustomProfile(fandubID int) (*FandubCustomProfile, error) {
	db.InitFandubCustomProfilesTable()
	var p FandubCustomProfile
	err := db.QueryRow(`
		SELECT fandub_id, COALESCE(theme_color, 'amber'), COALESCE(banner_url, ''),
		       COALESCE(telegram_channel, ''), COALESCE(telegram_admin, ''), COALESCE(telegram_ads, ''),
		       COALESCE(instagram_url, ''), COALESCE(announcement_text, ''), COALESCE(announcement_active, false),
		       COALESCE(updated_at, NOW())
		FROM anivorm_fandub_custom_profiles
		WHERE fandub_id = $1
	`, fandubID).Scan(
		&p.FandubID, &p.ThemeColor, &p.BannerURL,
		&p.TelegramChannel, &p.TelegramAdmin, &p.TelegramAds,
		&p.InstagramURL, &p.AnnouncementText, &p.AnnouncementActive,
		&p.UpdatedAt,
	)
	if err != nil {
		return &FandubCustomProfile{
			FandubID:           fandubID,
			ThemeColor:         "amber",
			AnnouncementActive: false,
		}, nil
	}
	return &p, nil
}

// SaveFandubCustomProfile saves or updates custom styling & socials for a fandub
func (db *DB) SaveFandubCustomProfile(p FandubCustomProfile) error {
	db.InitFandubCustomProfilesTable()
	if p.ThemeColor == "" {
		p.ThemeColor = "amber"
	}
	_, err := db.Exec(`
		INSERT INTO anivorm_fandub_custom_profiles (
			fandub_id, theme_color, banner_url,
			telegram_channel, telegram_admin, telegram_ads,
			instagram_url, announcement_text, announcement_active, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		ON CONFLICT (fandub_id) DO UPDATE SET
			theme_color = EXCLUDED.theme_color,
			banner_url = EXCLUDED.banner_url,
			telegram_channel = EXCLUDED.telegram_channel,
			telegram_admin = EXCLUDED.telegram_admin,
			telegram_ads = EXCLUDED.telegram_ads,
			instagram_url = EXCLUDED.instagram_url,
			announcement_text = EXCLUDED.announcement_text,
			announcement_active = EXCLUDED.announcement_active,
			updated_at = NOW()
	`, p.FandubID, p.ThemeColor, p.BannerURL, p.TelegramChannel, p.TelegramAdmin, p.TelegramAds, p.InstagramURL, p.AnnouncementText, p.AnnouncementActive)
	return err
}
