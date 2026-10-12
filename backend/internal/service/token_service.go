package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"time"
)

type TokenService struct {
	secret []byte
}

func NewTokenService() *TokenService {
	sec := os.Getenv("STREAM_SECRET")
	if sec == "" {
		sec = "hikaku_default_stream_secret_key_change_in_production"
	}
	return &TokenService{
		secret: []byte(sec),
	}
}

// GenerateToken generates an HMAC-SHA256 signature valid for a duration
func (ts *TokenService) GenerateToken(episodeID int, isVIP bool, duration time.Duration) (string, int64) {
	exp := time.Now().Add(duration).Unix()
	vipFlag := "0"
	if isVIP {
		vipFlag = "1"
	}

	payload := fmt.Sprintf("%d:%s:%d", episodeID, vipFlag, exp)
	mac := hmac.New(sha256.New, ts.secret)
	mac.Write([]byte(payload))
	token := hex.EncodeToString(mac.Sum(nil))

	return token, exp
}

// VerifyToken validates the token signature and expiration
func (ts *TokenService) VerifyToken(episodeID int, token string, exp int64, isVIP bool) bool {
	if time.Now().Unix() > exp {
		return false
	}

	vipFlag := "0"
	if isVIP {
		vipFlag = "1"
	}

	payload := fmt.Sprintf("%d:%s:%d", episodeID, vipFlag, exp)
	mac := hmac.New(sha256.New, ts.secret)
	mac.Write([]byte(payload))
	expectedToken := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(token), []byte(expectedToken))
}

func ParseExp(expStr string) int64 {
	exp, err := strconv.ParseInt(expStr, 10, 64)
	if err != nil {
		return 0
	}
	return exp
}
