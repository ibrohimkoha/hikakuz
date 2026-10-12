package config

import (
	"os"
)

type Config struct {
	Port               string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSSLMode          string
	B2KeyID            string
	B2AppKey           string
	B2BucketName       string
	B2Endpoint         string
	B2BucketID         string
	TelegramToken        string
	TelegramPostBotToken string
	TelegramChannel      string
	AdminChatID          int64
	HikakuURL            string
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8199"
	}

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "nokori_go"
	}
	dbSSL := os.Getenv("DB_SSLMODE")
	if dbSSL == "" {
		dbSSL = "disable"
	}

	b2KeyID := os.Getenv("B2_KEY_ID")
	b2AppKey := os.Getenv("B2_APPLICATION_KEY")
	b2BucketName := os.Getenv("B2_BUCKET_NAME")
	b2Endpoint := os.Getenv("B2_ENDPOINT")
	if b2Endpoint == "" {
		b2Endpoint = "s3.us-east-005.backblazeb2.com"
	}
	b2BucketID := os.Getenv("B2_BUCKET_ID")

	telegramToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	telegramPostBotToken := os.Getenv("TELEGRAM_POST_BOT_TOKEN")
	if telegramPostBotToken == "" {
		telegramPostBotToken = telegramToken
	}
	telegramChannel := os.Getenv("TELEGRAM_CHANNEL")
	if telegramChannel == "" {
		telegramChannel = "@hikakuz"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "hikaku_default_jwt_secret_change_in_production"
	}

	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")

	return &Config{
		Port:                 port,
		DBHost:               dbHost,
		DBPort:               dbPort,
		DBUser:               dbUser,
		DBPassword:           dbPass,
		DBName:               dbName,
		DBSSLMode:            dbSSL,
		B2KeyID:              b2KeyID,
		B2AppKey:             b2AppKey,
		B2BucketName:         b2BucketName,
		B2Endpoint:           b2Endpoint,
		B2BucketID:           b2BucketID,
		TelegramToken:        telegramToken,
		TelegramPostBotToken: telegramPostBotToken,
		TelegramChannel:      telegramChannel,
		AdminChatID:          5415350162,
		HikakuURL:            "https://hikaku.uz",
		JWTSecret:            jwtSecret,
		GoogleClientID:       googleClientID,
		GoogleClientSecret:   googleClientSecret,
	}
}
