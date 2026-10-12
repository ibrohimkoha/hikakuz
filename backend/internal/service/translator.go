package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// TranslateToUzbek translates any text (English, Russian, Japanese) to Uzbek automatically
func TranslateToUzbek(text string) (string, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return "", nil
	}

	// 1. Primary: Google Client Dictionary Translate (Ultra-fast, auto-detect language)
	apiURL := fmt.Sprintf("https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=uz&q=%s", url.QueryEscape(text))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err == nil {
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var raw []interface{}
			if err := json.NewDecoder(resp.Body).Decode(&raw); err == nil && len(raw) > 0 {
				var sb strings.Builder
				for _, item := range raw {
					if parts, ok := item.([]interface{}); ok && len(parts) > 0 {
						if str, ok := parts[0].(string); ok {
							sb.WriteString(str)
						}
					}
				}
				res := strings.TrimSpace(sb.String())
				if res != "" {
					return res, nil
				}
			}
		}
	}

	// 2. Fallback: MyMemory Translation API
	myMemURL := fmt.Sprintf("https://api.mymemory.translated.net/get?q=%s&langpair=autodetect|uz", url.QueryEscape(text))
	req2, err2 := http.NewRequest("GET", myMemURL, nil)
	if err2 == nil {
		client2 := &http.Client{Timeout: 5 * time.Second}
		resp2, err2 := client2.Do(req2)
		if err2 == nil && resp2.StatusCode == http.StatusOK {
			defer resp2.Body.Close()
			var res struct {
				ResponseData struct {
					TranslatedText string `json:"translatedText"`
				} `json:"responseData"`
			}
			if err := json.NewDecoder(resp2.Body).Decode(&res); err == nil && res.ResponseData.TranslatedText != "" {
				clean := strings.ReplaceAll(res.ResponseData.TranslatedText, "&#39;", "'")
				clean = strings.ReplaceAll(clean, "&quot;", "\"")
				clean = strings.ReplaceAll(clean, "&amp;", "&")
				return clean, nil
			}
		}
	}

	return text, nil
}
