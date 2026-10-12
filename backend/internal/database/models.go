package database

import (
	"time"
)

type Anime struct {
	ID             int       `json:"id"`
	MALID          int       `json:"mal_id"`
	TitleUz        string    `json:"title_uz"`
	TitleEn        string    `json:"title_en"`
	TitleJp        string    `json:"title_jp"`
	Slug           string    `json:"slug"`
	Synopsis       string    `json:"synopsis"`
	PosterURL      string    `json:"poster_url"`
	BannerURL      string    `json:"banner_url"`
	Score          float64   `json:"score"`
	EpisodesCount  int       `json:"episodes_count"`
	CurrentEpisode int       `json:"current_episode"`
	Status         string    `json:"status"`
	Season         string    `json:"season"`
	Year           int       `json:"year"`
	Studio         string    `json:"studio"`
	TelegramURL    string    `json:"telegram_url,omitempty"`
	Genres         []string  `json:"genres"`
	IsTrending     bool      `json:"is_trending"`
	IsFeatured     bool      `json:"is_featured"`
	CreatedAt      time.Time `json:"created_at"`
}

type Fandub struct {
	ID              int       `json:"id"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	LogoURL         string    `json:"logo_url"`
	Description     string    `json:"description"`
	AdminTelegramID int64     `json:"admin_telegram_id,omitempty"`
	AdminUsername   string    `json:"admin_username,omitempty"`
	AdminFullName   string    `json:"admin_full_name,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type FandubPublicInfo struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	LogoURL        string    `json:"logo_url"`
	Description    string    `json:"description"`
	EpisodesCount  int       `json:"episodes_count"`
	AnimesCount    int       `json:"animes_count"`
	FollowersCount int       `json:"followers_count"`
	VIPPrice       int       `json:"vip_price"`
	ContactURL     string    `json:"contact_url"`
	CreatedAt      time.Time `json:"created_at"`
}

type FandubCustomProfile struct {
	FandubID           int       `json:"fandub_id"`
	ThemeColor         string    `json:"theme_color"`
	BannerURL          string    `json:"banner_url"`
	TelegramChannel    string    `json:"telegram_channel"`
	TelegramAdmin      string    `json:"telegram_admin"`
	TelegramAds        string    `json:"telegram_ads"`
	InstagramURL       string    `json:"instagram_url"`
	AnnouncementText   string    `json:"announcement_text"`
	AnnouncementActive bool      `json:"announcement_active"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type FandubUser struct {
	ID         int       `json:"id"`
	FandubID   int       `json:"fandub_id"`
	FandubName string    `json:"fandub_name,omitempty"`
	TelegramID int64     `json:"telegram_id"`
	Role       string    `json:"role"`
	Username   string    `json:"username,omitempty"`
	FirstName  string    `json:"first_name,omitempty"`
	PhotoURL   string    `json:"photo_url,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type AuditLog struct {
	ID         int       `json:"id"`
	ActorID    int64     `json:"actor_id"`
	ActorName  string    `json:"actor_name"`
	Action     string    `json:"action"`      // CREATE, UPDATE, DELETE
	EntityType string    `json:"entity_type"` // EPISODE, ANIME, FANDUB, ADMIN
	EntityID   string    `json:"entity_id"`
	Details    string    `json:"details"`
	CreatedAt  time.Time `json:"created_at"`
}

type Episode struct {
	ID            int       `json:"id"`
	AnimeID       int       `json:"anime_id"`
	AnimeTitle    string    `json:"anime_title,omitempty"`
	EpisodeNumber int       `json:"episode_number"`
	Title         string    `json:"title"`
	B2Key         string    `json:"b2_key"`
	VideoURL      string    `json:"video_url"`
	ThumbnailURL  string    `json:"thumbnail_url"`
	Duration      int       `json:"duration"`
	IsVIPOnly     bool      `json:"is_vip_only"`
	HasUzbekDub   bool      `json:"has_uzbek_dub"`
	HasSubtitles  bool      `json:"has_subtitles"`
	StreamURL     string    `json:"stream_url"`
	FandubID      int       `json:"fandub_id"`
	FandubName    string    `json:"fandub_name,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type User struct {
	ID           int64      `json:"id"`
	TelegramID   *int64     `json:"telegram_id"`
	Email        *string    `json:"email,omitempty"`
	Username     string     `json:"username"`
	FullName     string     `json:"full_name"`
	IsVIP        bool       `json:"is_vip"`
	VIPExpiresAt *time.Time `json:"vip_expires_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type Receipt struct {
	ID          int       `json:"id"`
	UserID      *int      `json:"user_id"`
	TelegramID  int64     `json:"telegram_id"`
	ImageFileID string    `json:"image_file_id"`
	Amount      int       `json:"amount"`
	Status      string    `json:"status"`
	AdminNote   string    `json:"admin_note"`
	CreatedAt   time.Time `json:"created_at"`
}

type Comment struct {
	ID        int       `json:"id"`
	AnimeSlug string    `json:"anime_slug"`
	UserName  string    `json:"user_name"`
	UserPhoto string    `json:"user_photo"`
	Content   string    `json:"content"`
	Rating    int       `json:"rating"`
	CreatedAt time.Time `json:"created_at"`
}

type PlatformSettings struct {
	CardNumber         string `json:"card_number"`
	CardHolder         string `json:"card_holder"`
	VIPPrice           int    `json:"vip_price"`
	SupportBot         string `json:"support_bot"`
	AnnouncementText   string `json:"announcement_text"`
	AnnouncementActive bool   `json:"announcement_active"`
}

type DashboardStats struct {
	TotalAnimes   int `json:"total_animes"`
	TotalEpisodes int `json:"total_episodes"`
	TotalUsers    int `json:"total_users"`
	TotalVIPUsers int `json:"total_vip_users"`
	TotalFandubs  int `json:"total_fandubs"`
	PendingChecks int `json:"pending_checks"`
}

type RequiredChannel struct {
	ID         int       `json:"id"`
	Platform   string    `json:"platform"`
	ChannelID  string    `json:"channel_id"`
	Title      string    `json:"title"`
	InviteLink string    `json:"invite_link"`
	IsRequest  bool      `json:"is_request"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

type VIPClaim struct {
	Token      string     `json:"token"`
	UserID     *int64     `json:"user_id"`
	Email      *string    `json:"email"`
	IsVerified bool       `json:"is_verified"`
	IsUsed     bool       `json:"is_used"`
	CreatedAt  time.Time  `json:"created_at"`
}

type AdminUser struct {
	ID         int64     `json:"id"`
	TelegramID int64     `json:"telegram_id"`
	FullName   string    `json:"full_name"`
	Role       string    `json:"role"`
	CreatedAt  time.Time `json:"created_at"`
}

type FandubSettings struct {
	ID         int       `json:"id"`
	FandubID   int       `json:"fandub_id"`
	CardNumber string    `json:"card_number"`
	CardHolder string    `json:"card_holder"`
	VIPPrice   int       `json:"vip_price"`
	ContactURL string    `json:"contact_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type FandubVIPUser struct {
	ID         int       `json:"id"`
	FandubID   int       `json:"fandub_id"`
	UserID     int64     `json:"user_id"`
	TelegramID int64     `json:"telegram_id"`
	FullName   string    `json:"full_name"`
	Username   string    `json:"username"`
	Days       int       `json:"days"`
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`
	IsActive   bool      `json:"is_active"`
}

type FandubReceipt struct {
	ID          int       `json:"id"`
	FandubID    int       `json:"fandub_id"`
	UserID      int64     `json:"user_id"`
	TelegramID  int64     `json:"telegram_id"`
	ImageFileID string    `json:"image_file_id"`
	Amount      int       `json:"amount"`
	Status      string    `json:"status"`
	AdminNote   string    `json:"admin_note"`
	CreatedAt   time.Time `json:"created_at"`
}
