package service

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"anivorm/internal/config"
)

type B2Streamer struct {
	cfg *config.Config
}

func NewB2Streamer(cfg *config.Config) *B2Streamer {
	return &B2Streamer{cfg: cfg}
}

// StreamVideo streams video chunks with Range support from local storage, direct URL, or Backblaze B2
func (s *B2Streamer) StreamVideo(w http.ResponseWriter, r *http.Request, b2Key string) {
	// If b2Key is a direct HTTP/HTTPS URL (e.g. external CDN, B2 URL, direct stream)
	if strings.HasPrefix(b2Key, "http://") || strings.HasPrefix(b2Key, "https://") {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Range, Authorization, Content-Type")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")
		http.Redirect(w, r, b2Key, http.StatusTemporaryRedirect)
		return
	}

	b2Key = strings.TrimPrefix(b2Key, "/")

	// 1. Check if file is cached/saved in local high-speed storage first
	baseName := filepath.Base(b2Key)
	localPaths := []string{
		filepath.Join("/root/anivorm/storage", baseName),
		filepath.Join("/root/anivorm/storage", b2Key),
		filepath.Join("/tmp/anivorm_uploads", baseName),
		filepath.Join("/home/iskurama/.gemini/antigravity/scratch/anivorm/storage", baseName),
	}

	for _, lp := range localPaths {
		if fi, err := os.Stat(lp); err == nil && !fi.IsDir() && fi.Size() > 0 {
			w.Header().Set("Cache-Control", "public, max-age=86400")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Access-Control-Allow-Origin", "*")
			http.ServeFile(w, r, lp)
			return
		}
	}

	// 2. High-speed Direct B2 Streaming Redirect via Cloudflare CDN (Bandwidth Alliance - $0 Egress)
	// Always append version/query to bypass stale Cloudflare Edge negative-cache (e.g. earlier 502)
	var redirectURL string
	if strings.Contains(b2Key, "?") {
		redirectURL = fmt.Sprintf("https://cdn.hikaku.uz/%s", b2Key)
	} else if r.URL.RawQuery != "" {
		redirectURL = fmt.Sprintf("https://cdn.hikaku.uz/%s?%s", b2Key, r.URL.RawQuery)
	} else {
		redirectURL = fmt.Sprintf("https://cdn.hikaku.uz/%s?v=1", b2Key)
	}

	if r.URL.Query().Get("proxy") != "1" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Range, Authorization, Content-Type")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")
		http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), "GET", redirectURL, nil)
	if err != nil {
		http.Error(w, "Failed to create upstream request", http.StatusInternalServerError)
		return
	}

	// Forward Range header
	if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
		req.Header.Set("Range", rangeHeader)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode == http.StatusNotFound {
		// Fallback to direct S3 endpoint if CDN fails
		s3URL := fmt.Sprintf("https://%s/%s/%s", s.cfg.B2Endpoint, s.cfg.B2BucketName, b2Key)
		fallbackReq, fErr := http.NewRequestWithContext(r.Context(), "GET", s3URL, nil)
		if fErr == nil {
			if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
				fallbackReq.Header.Set("Range", rangeHeader)
			}
			fallbackResp, fbErr := client.Do(fallbackReq)
			if fbErr == nil && fallbackResp.StatusCode != http.StatusNotFound {
				if resp != nil && resp.Body != nil {
					resp.Body.Close()
				}
				resp = fallbackResp
			}
		}
	}

	if resp == nil {
		http.Error(w, "Video upstream unavailable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 && resp.StatusCode != http.StatusPartialContent {
		http.Error(w, "Video file not found or unavailable", resp.StatusCode)
		return
	}

	// Forward response headers
	if cr := resp.Header.Get("Content-Range"); cr != "" {
		w.Header().Set("Content-Range", cr)
	}
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else if strings.HasSuffix(strings.ToLower(b2Key), ".m3u8") {
		w.Header().Set("Content-Type", "application/x-mpegURL")
	} else if strings.HasSuffix(strings.ToLower(b2Key), ".ts") {
		w.Header().Set("Content-Type", "video/mp2t")
	} else {
		w.Header().Set("Content-Type", "video/mp4")
	}

	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	w.WriteHeader(resp.StatusCode)
	buf := make([]byte, 256*1024)
	_, _ = io.CopyBuffer(w, resp.Body, buf)
}
