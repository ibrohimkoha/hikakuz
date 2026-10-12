package service

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"anivorm/internal/config"
)

type B2Uploader struct {
	cfg         *config.Config
	client      *http.Client
	mu          sync.RWMutex
	authToken   string
	apiURL      string
	downloadURL string
	authExp     time.Time
}

type b2AuthResponse struct {
	AccountID           string `json:"accountId"`
	AuthorizationToken  string `json:"authorizationToken"`
	APIURL              string `json:"apiUrl"`
	DownloadURL         string `json:"downloadUrl"`
	RecommendedPartSize int64  `json:"recommendedPartSize"`
}

type b2GetUploadURLResponse struct {
	BucketID           string `json:"bucketId"`
	UploadURL          string `json:"uploadUrl"`
	AuthorizationToken string `json:"authorizationToken"`
}

func NewB2Uploader(cfg *config.Config) *B2Uploader {
	return &B2Uploader{
		cfg: cfg,
		client: &http.Client{
			Timeout: 30 * time.Minute,
		},
	}
}

// getAuth gets cached B2 auth credentials or requests fresh ones
func (u *B2Uploader) getAuth() (string, string, error) {
	u.mu.RLock()
	if u.authToken != "" && time.Now().Before(u.authExp) {
		token, api := u.authToken, u.apiURL
		u.mu.RUnlock()
		return token, api, nil
	}
	u.mu.RUnlock()

	u.mu.Lock()
	defer u.mu.Unlock()

	// Double check under write lock
	if u.authToken != "" && time.Now().Before(u.authExp) {
		return u.authToken, u.apiURL, nil
	}

	req, err := http.NewRequest("GET", "https://api.backblazeb2.com/b2api/v2/b2_authorize_account", nil)
	if err != nil {
		return "", "", fmt.Errorf("failed to create b2 auth request: %w", err)
	}
	req.SetBasicAuth(u.cfg.B2KeyID, u.cfg.B2AppKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("b2 auth http error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("b2 auth failed (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var authResp b2AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return "", "", fmt.Errorf("failed to decode b2 auth response: %w", err)
	}

	u.authToken = authResp.AuthorizationToken
	u.apiURL = authResp.APIURL
	u.downloadURL = authResp.DownloadURL
	u.authExp = time.Now().Add(20 * time.Hour)

	log.Printf("☁️ B2 Native API Authorized successfully (API: %s)", u.apiURL)
	return u.authToken, u.apiURL, nil
}

// GetUploadURL gets an upload URL and token for the configured bucket
func (u *B2Uploader) GetUploadURL() (string, string, error) {
	authToken, apiURL, err := u.getAuth()
	if err != nil {
		return "", "", err
	}

	payload, _ := json.Marshal(map[string]string{
		"bucketId": u.cfg.B2BucketID,
	})

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/b2api/v2/b2_get_upload_url", apiURL), bytes.NewReader(payload))
	if err != nil {
		return "", "", fmt.Errorf("failed to create get_upload_url request: %w", err)
	}
	req.Header.Set("Authorization", authToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("get_upload_url http error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("get_upload_url failed (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var uploadResp struct {
		UploadURL          string `json:"uploadUrl"`
		AuthorizationToken string `json:"authorizationToken"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&uploadResp); err != nil {
		return "", "", fmt.Errorf("failed to decode upload url response: %w", err)
	}

	return uploadResp.UploadURL, uploadResp.AuthorizationToken, nil
}

// GetDownloadAuth returns authToken, downloadURL, bucketName for direct parallel downloads
func (u *B2Uploader) GetDownloadAuth() (string, string, string, error) {
	authToken, _, err := u.getAuth()
	if err != nil {
		return "", "", "", err
	}
	u.mu.RLock()
	dlURL := u.downloadURL
	bucket := u.cfg.B2BucketName
	u.mu.RUnlock()
	return authToken, dlURL, bucket, nil
}

// UploadFile uploads a file to Backblaze B2 using Native API with SHA1 verification and automatic retry
func (u *B2Uploader) UploadFile(localFilePath string, b2Key string) (string, error) {
	fileInfo, err := os.Stat(localFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to stat file: %w", err)
	}
	fileSize := fileInfo.Size()

	// Calculate SHA1
	f, err := os.Open(localFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to open local file: %w", err)
	}
	hasher := sha1.New()
	if _, err := io.Copy(hasher, f); err != nil {
		f.Close()
		return "", fmt.Errorf("failed to calculate sha1: %w", err)
	}
	f.Close()
	sha1Hex := hex.EncodeToString(hasher.Sum(nil))

	b2Key = strings.TrimPrefix(b2Key, "/")
	contentType := "video/mp4"
	lowerKey := strings.ToLower(b2Key)
	if strings.HasSuffix(lowerKey, ".m3u8") {
		contentType = "application/x-mpegURL"
	} else if strings.HasSuffix(lowerKey, ".ts") {
		contentType = "video/mp2t"
	} else if strings.HasSuffix(lowerKey, ".jpg") || strings.HasSuffix(lowerKey, ".jpeg") {
		contentType = "image/jpeg"
	} else if strings.HasSuffix(lowerKey, ".png") {
		contentType = "image/png"
	} else if strings.HasSuffix(lowerKey, ".webp") {
		contentType = "image/webp"
	}

	var lastErr error
	maxRetries := 3

	for attempt := 1; attempt <= maxRetries; attempt++ {
		file, err := os.Open(localFilePath)
		if err != nil {
			lastErr = fmt.Errorf("failed to open file for attempt %d: %w", attempt, err)
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		uploadURL, uploadToken, err := u.GetUploadURL()
		if err != nil {
			file.Close()
			lastErr = fmt.Errorf("failed to get B2 upload URL: %w", err)
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		req, err := http.NewRequest("POST", uploadURL, file)
		if err != nil {
			file.Close()
			return "", fmt.Errorf("failed to create upload request: %w", err)
		}

		req.ContentLength = fileSize
		req.Header.Set("Authorization", uploadToken)
		req.Header.Set("X-Bz-File-Name", url.PathEscape(b2Key))
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Content-Length", fmt.Sprintf("%d", fileSize))
		req.Header.Set("X-Bz-Content-Sha1", sha1Hex)

		resp, err := u.client.Do(req)
		file.Close()
		if err != nil {
			lastErr = fmt.Errorf("b2 upload connection error: %w", err)
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastErr = fmt.Errorf("b2 upload rejected (HTTP %d): %s", resp.StatusCode, string(body))
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		resp.Body.Close()
		log.Printf("✅ [B2 Native API] File successfully uploaded: %s", b2Key)
		return b2Key, nil
	}

	return "", fmt.Errorf("b2 upload failed after %d attempts: %w", maxRetries, lastErr)
}

// DeleteFile deletes a single file from Backblaze B2 and local fallback storage
func (u *B2Uploader) DeleteFile(b2Key string) error {
	b2Key = strings.TrimPrefix(b2Key, "/")
	if b2Key == "" {
		return nil
	}

	// 1. Delete from local server storage if present
	localPath := filepath.Join("/root/anivorm/storage", filepath.Base(b2Key))
	_ = os.Remove(localPath)

	// 2. Delete from B2 via Native API (list versions then delete)
	authToken, apiURL, err := u.getAuth()
	if err != nil {
		return err
	}

	listPayload, _ := json.Marshal(map[string]interface{}{
		"bucketId":      u.cfg.B2BucketID,
		"startFileName": b2Key,
		"prefix":        b2Key,
		"maxFileCount":  10,
	})

	listReq, err := http.NewRequest("POST", fmt.Sprintf("%s/b2api/v2/b2_list_file_versions", apiURL), bytes.NewReader(listPayload))
	if err != nil {
		return err
	}
	listReq.Header.Set("Authorization", authToken)
	listReq.Header.Set("Content-Type", "application/json")

	listResp, err := http.DefaultClient.Do(listReq)
	if err != nil {
		return err
	}
	defer listResp.Body.Close()

	if listResp.StatusCode != http.StatusOK {
		return fmt.Errorf("b2_list_file_versions HTTP %d", listResp.StatusCode)
	}

	var listData struct {
		Files []struct {
			FileID   string `json:"fileId"`
			FileName string `json:"fileName"`
		} `json:"files"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&listData); err != nil {
		return err
	}

	for _, f := range listData.Files {
		if f.FileName == b2Key {
			delPayload, _ := json.Marshal(map[string]string{
				"fileId":   f.FileID,
				"fileName": f.FileName,
			})
			delReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/b2api/v2/b2_delete_file_version", apiURL), bytes.NewReader(delPayload))
			delReq.Header.Set("Authorization", authToken)
			delReq.Header.Set("Content-Type", "application/json")

			if delResp, err := http.DefaultClient.Do(delReq); err == nil {
				delResp.Body.Close()
				log.Printf("🗑️ [B2 Native API] Deleted %s (fileID: %s)", f.FileName, f.FileID)
			}
		}
	}

	return nil
}

// DeletePrefix deletes all files in B2 matching a prefix (e.g. episodes/hls/ep_14/)
func (u *B2Uploader) DeletePrefix(prefix string) error {
	prefix = strings.TrimPrefix(prefix, "/")
	if prefix == "" {
		return fmt.Errorf("prefix cannot be empty")
	}

	authToken, apiURL, err := u.getAuth()
	if err != nil {
		return err
	}

	startFileName := ""
	for {
		payloadMap := map[string]interface{}{
			"bucketId":     u.cfg.B2BucketID,
			"prefix":       prefix,
			"maxFileCount": 100,
		}
		if startFileName != "" {
			payloadMap["startFileName"] = startFileName
		}

		payload, _ := json.Marshal(payloadMap)
		req, err := http.NewRequest("POST", fmt.Sprintf("%s/b2api/v2/b2_list_file_names", apiURL), bytes.NewReader(payload))
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", authToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return fmt.Errorf("b2_list_file_names failed (HTTP %d)", resp.StatusCode)
		}

		var data struct {
			Files []struct {
				FileID   string `json:"fileId"`
				FileName string `json:"fileName"`
			} `json:"files"`
			NextFileName string `json:"nextFileName"`
		}

		err = json.NewDecoder(resp.Body).Decode(&data)
		resp.Body.Close()
		if err != nil {
			return err
		}

		if len(data.Files) == 0 {
			break
		}

		for _, f := range data.Files {
			// Delete all versions for each file
			_ = u.DeleteFile(f.FileName)
		}

		if data.NextFileName == "" {
			break
		}
		startFileName = data.NextFileName
	}

	log.Printf("🧹 [B2 Native API] Successfully purged all files with prefix: %s", prefix)
	return nil
}

// DeleteEpisodeFiles deletes all episode assets (HLS segments + m3u8 playlist or MP4) from B2
func (u *B2Uploader) DeleteEpisodeFiles(b2Key string) error {
	b2Key = strings.TrimPrefix(b2Key, "/")
	if b2Key == "" {
		return nil
	}

	// If it's an HLS playlist (e.g. episodes/hls/ep_14/index.m3u8), purge entire folder
	if strings.Contains(b2Key, "/hls/") || strings.HasSuffix(b2Key, ".m3u8") {
		dir := filepath.Dir(b2Key)
		if dir != "." && dir != "/" {
			prefix := dir + "/"
			log.Printf("🗑️ Purging HLS directory for episode: %s", prefix)
			_ = u.DeletePrefix(prefix)
		}
	}

	// Also delete direct key if any
	return u.DeleteFile(b2Key)
}

// UploadHLSFolder uploads an entire folder containing index.m3u8 and seg_*.ts to B2 using concurrent workers
func (u *B2Uploader) UploadHLSFolder(localDir string, b2Prefix string) (string, error) {
	b2Prefix = strings.TrimPrefix(b2Prefix, "/")
	b2Prefix = strings.TrimSuffix(b2Prefix, "/")

	files, err := os.ReadDir(localDir)
	if err != nil {
		return "", fmt.Errorf("failed to read HLS local dir: %w", err)
	}

	type uploadJob struct {
		localPath string
		remoteKey string
	}

	var m3u8Key string
	var jobs []uploadJob
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		localFilePath := filepath.Join(localDir, f.Name())
		remoteKey := fmt.Sprintf("%s/%s", b2Prefix, f.Name())
		if strings.HasSuffix(f.Name(), ".m3u8") {
			m3u8Key = remoteKey
		} else {
			jobs = append(jobs, uploadJob{localPath: localFilePath, remoteKey: remoteKey})
		}
	}

	// 1. Upload .ts segments in parallel (10 concurrent workers)
	numWorkers := 10
	jobCh := make(chan uploadJob, len(jobs))
	errCh := make(chan error, len(jobs))
	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobCh {
				if _, err := u.UploadFile(job.localPath, job.remoteKey); err != nil {
					select {
					case errCh <- fmt.Errorf("failed to upload %s: %w", job.remoteKey, err):
					default:
					}
					return
				}
			}
		}()
	}

	for _, j := range jobs {
		jobCh <- j
	}
	close(jobCh)
	wg.Wait()
	close(errCh)

	if len(errCh) > 0 {
		return "", <-errCh
	}

	// 2. Upload index.m3u8 last after all segments are successfully in place
	if m3u8Key != "" {
		localM3U8Path := filepath.Join(localDir, filepath.Base(m3u8Key))
		if _, err := u.UploadFile(localM3U8Path, m3u8Key); err != nil {
			return "", fmt.Errorf("failed to upload m3u8 playlist: %w", err)
		}
	} else {
		m3u8Key = fmt.Sprintf("%s/index.m3u8", b2Prefix)
	}

	return m3u8Key, nil
}

// UploadHLSFolderWithProgress uploads an entire folder with real-time segment progress reporting
func (u *B2Uploader) UploadHLSFolderWithProgress(localDir string, b2Prefix string, onProgress func(uploaded, total int)) (string, error) {
	b2Prefix = strings.TrimPrefix(b2Prefix, "/")
	b2Prefix = strings.TrimSuffix(b2Prefix, "/")

	files, err := os.ReadDir(localDir)
	if err != nil {
		return "", fmt.Errorf("failed to read HLS local dir: %w", err)
	}

	type uploadJob struct {
		localPath string
		remoteKey string
	}

	var m3u8Key string
	var jobs []uploadJob
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		localFilePath := filepath.Join(localDir, f.Name())
		remoteKey := fmt.Sprintf("%s/%s", b2Prefix, f.Name())
		if strings.HasSuffix(f.Name(), ".m3u8") {
			m3u8Key = remoteKey
		} else {
			jobs = append(jobs, uploadJob{localPath: localFilePath, remoteKey: remoteKey})
		}
	}

	totalSegments := len(jobs)
	if onProgress != nil {
		onProgress(0, totalSegments)
	}

	numWorkers := 16
	jobCh := make(chan uploadJob, len(jobs))
	errCh := make(chan error, len(jobs))
	var wg sync.WaitGroup
	var uploadedCount int64

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobCh {
				if _, err := u.UploadFile(job.localPath, job.remoteKey); err != nil {
					select {
					case errCh <- fmt.Errorf("failed to upload %s: %w", job.remoteKey, err):
					default:
					}
					return
				}
				done := atomic.AddInt64(&uploadedCount, 1)
				if onProgress != nil {
					onProgress(int(done), totalSegments)
				}
			}
		}()
	}

	for _, j := range jobs {
		jobCh <- j
	}
	close(jobCh)
	wg.Wait()
	close(errCh)

	if len(errCh) > 0 {
		return "", <-errCh
	}

	if m3u8Key != "" {
		localM3U8Path := filepath.Join(localDir, filepath.Base(m3u8Key))
		if _, err := u.UploadFile(localM3U8Path, m3u8Key); err != nil {
			return "", fmt.Errorf("failed to upload m3u8 playlist: %w", err)
		}
	} else {
		m3u8Key = fmt.Sprintf("%s/index.m3u8", b2Prefix)
	}

	return m3u8Key, nil
}

type B2StagedFile struct {
	FileID          string `json:"file_id"`
	FileName        string `json:"file_name"`
	ContentLength   int64  `json:"content_length"`
	UploadTimestamp int64  `json:"upload_timestamp"`
	FormattedSize   string `json:"formatted_size"`
}

// ListStagedFiles lists all unlinked files in episodes/staged/
func (u *B2Uploader) ListStagedFiles() ([]B2StagedFile, error) {
	authToken, apiURL, err := u.getAuth()
	if err != nil {
		return nil, err
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"bucketId":     u.cfg.B2BucketID,
		"prefix":       "episodes/staged/",
		"maxFileCount": 100,
	})

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/b2api/v2/b2_list_file_names", apiURL), bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("b2_list_file_names failed (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var listData struct {
		Files []struct {
			FileID          string `json:"fileId"`
			FileName        string `json:"fileName"`
			ContentLength   int64  `json:"contentLength"`
			UploadTimestamp int64  `json:"uploadTimestamp"`
		} `json:"files"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&listData); err != nil {
		return nil, err
	}

	var result []B2StagedFile
	for _, f := range listData.Files {
		mb := float64(f.ContentLength) / (1024 * 1024)
		result = append(result, B2StagedFile{
			FileID:          f.FileID,
			FileName:        f.FileName,
			ContentLength:   f.ContentLength,
			UploadTimestamp: f.UploadTimestamp,
			FormattedSize:   fmt.Sprintf("%.1f MB", mb),
		})
	}

	return result, nil
}
