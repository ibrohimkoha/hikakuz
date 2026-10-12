package service

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type HLSConverter struct {
	uploader *B2Uploader
}

func NewHLSConverter(uploader *B2Uploader) *HLSConverter {
	return &HLSConverter{
		uploader: uploader,
	}
}

// ConvertLocalMP4ToHLS converts an existing local MP4 to HLS with Stream Copy (-c copy)
func (h *HLSConverter) ConvertLocalMP4ToHLS(localMP4Path string, b2Prefix string) (string, error) {
	return h.ConvertLocalMP4ToHLSWithProgress(localMP4Path, b2Prefix, nil)
}

// ConvertLocalMP4ToHLSWithProgress converts local MP4 to HLS with progress reporting
func (h *HLSConverter) ConvertLocalMP4ToHLSWithProgress(localMP4Path string, b2Prefix string, onProgress func(status string, progress int, msg string)) (string, error) {
	tempDir, err := os.MkdirTemp("", "anivorm_hls_*")
	if err != nil {
		return "", fmt.Errorf("failed to create hls temp dir: %w", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	m3u8Output := filepath.Join(tempDir, "index.m3u8")
	segmentPattern := filepath.Join(tempDir, "seg_%03d.ts")

	if onProgress != nil {
		onProgress("transcoding", 55, "⚙️ FFmpeg HLS segmentlarga ajratmoqda...")
	}

	// 1. First attempt: Stream copy with h264_mp4toannexb filter (super fast, ~2-5s)
	args := []string{
		"-y",
		"-fflags", "+genpts+discardcorrupt",
		"-i", localMP4Path,
		"-c:v", "copy",
		"-c:a", "copy",
		"-bsf:v", "h264_mp4toannexb",
		"-hls_time", "4",
		"-hls_list_size", "0",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", segmentPattern,
		m3u8Output,
	}

	start := time.Now()
	log.Printf("⚡ [HLS Stream Copy] Starting ffmpeg muxing for %s...", filepath.Base(localMP4Path))
	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("⚠️ [HLS Stream Copy] Initial copy failed: %v (output: %s). Retrying with ultra-fast safe encoding fallback...", err, string(output))
		// Fallback: Ultra-fast x264 encode for damaged or non-standard keyframe streams
		fallbackArgs := []string{
			"-y",
			"-fflags", "+genpts+discardcorrupt",
			"-i", localMP4Path,
			"-c:v", "libx264",
			"-preset", "ultrafast",
			"-crf", "23",
			"-c:a", "aac",
			"-b:a", "128k",
			"-hls_time", "4",
			"-hls_list_size", "0",
			"-hls_playlist_type", "vod",
			"-hls_segment_filename", segmentPattern,
			m3u8Output,
		}
		cmdFallback := exec.Command("ffmpeg", fallbackArgs...)
		outputFallback, errFallback := cmdFallback.CombinedOutput()
		if errFallback != nil {
			return "", fmt.Errorf("ffmpeg hls muxing failed: %v, output: %s", errFallback, string(outputFallback))
		}
	}
	log.Printf("✅ [HLS Stream Copy] Muxing finished in %v. Uploading segments to B2...", time.Since(start))

	if onProgress != nil {
		onProgress("uploading", 70, "☁️ HLS segmentlari B2 ga yuklanmoqda...")
	}

	b2M3U8Key, err := h.uploader.UploadHLSFolderWithProgress(tempDir, b2Prefix, func(uploaded, total int) {
		if onProgress != nil && total > 0 {
			pct := 70 + int((float64(uploaded)/float64(total))*28)
			if pct > 98 {
				pct = 98
			}
			onProgress("uploading", pct, fmt.Sprintf("☁️ HLS qismlari B2 ga saqlanmoqda (%d / %d)...", uploaded, total))
		}
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload HLS to B2: %w", err)
	}

	return b2M3U8Key, nil
}

// ConvertRemoteMP4ToHLSWithProgress downloads a remote MP4 directly from B2 in parallel and converts to HLS with live progress reporting
func (h *HLSConverter) ConvertRemoteMP4ToHLSWithProgress(b2Key string, b2Prefix string, onProgress func(status string, progress int, msg string)) (string, error) {
	tempFile, err := os.CreateTemp("", "anivorm_source_*.mp4")
	if err != nil {
		return "", fmt.Errorf("failed to create temp mp4: %w", err)
	}
	tempMP4Path := tempFile.Name()
	tempFile.Close()
	defer func() {
		_ = os.Remove(tempMP4Path)
	}()

	if onProgress != nil {
		onProgress("downloading", 5, "📥 B2 dan video olinmoqda...")
	}

	// 1. Resilient parallel direct B2 download (10x faster with auto-chunk retry)
	dlErr := h.DownloadB2FileParallel(b2Key, tempMP4Path, func(pct int) {
		if onProgress != nil {
			mappedPct := 5 + int(float64(pct)*0.45) // 5% -> 50%
			if mappedPct > 50 {
				mappedPct = 50
			}
			onProgress("downloading", mappedPct, fmt.Sprintf("📥 Video B2 dan yuklab olinmoqda (%d%%)...", pct))
		}
	})

	// Fallback to curl if B2 direct download failed
	if dlErr != nil {
		log.Printf("⚠️ [HLS Download] B2 Direct download failed (%v), falling back to CDN curl...", dlErr)
		remoteURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", strings.TrimPrefix(b2Key, "/"))
		cmd := exec.Command("curl", "-4", "-s", "-L", "--retry", "5", "--retry-all-errors", "--retry-delay", "2", "-C", "-", "-o", tempMP4Path, remoteURL)
		if err := cmd.Run(); err != nil {
			return "", fmt.Errorf("failed to download remote mp4: %w (fallback: %v)", dlErr, err)
		}
	}

	fi, err := os.Stat(tempMP4Path)
	if err != nil || fi.Size() == 0 {
		return "", fmt.Errorf("downloaded mp4 is empty or missing")
	}

	return h.ConvertLocalMP4ToHLSWithProgress(tempMP4Path, b2Prefix, onProgress)
}

// ConvertRemoteMP4ToHLS is the legacy synchronous wrapper
func (h *HLSConverter) ConvertRemoteMP4ToHLS(remoteURLOrKey string, b2Prefix string) (string, error) {
	return h.ConvertRemoteMP4ToHLSWithProgress(remoteURLOrKey, b2Prefix, nil)
}

// DownloadB2FileParallel downloads a B2 file directly via Native API using 16 concurrent workers with automatic chunk retry
func (h *HLSConverter) DownloadB2FileParallel(b2Key string, destPath string, onProgress func(pct int)) error {
	token, dlURL, bucket, err := h.uploader.GetDownloadAuth()
	if err != nil {
		return fmt.Errorf("failed to get download auth: %w", err)
	}

	cleanKey := strings.TrimPrefix(b2Key, "/")
	fileURL := fmt.Sprintf("%s/file/%s/%s", dlURL, bucket, cleanKey)

	headReq, err := http.NewRequest("HEAD", fileURL, nil)
	if err != nil {
		return err
	}
	headReq.Header.Set("Authorization", token)

	client := &http.Client{Timeout: 30 * time.Second}
	headResp, err := client.Do(headReq)
	if err != nil {
		return fmt.Errorf("b2 HEAD request failed: %w", err)
	}
	defer headResp.Body.Close()

	if headResp.StatusCode != http.StatusOK {
		return fmt.Errorf("b2 HEAD returned status %d", headResp.StatusCode)
	}

	totalSize := headResp.ContentLength
	if totalSize <= 0 {
		return fmt.Errorf("invalid file size from b2: %d", totalSize)
	}

	file, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	if err := file.Truncate(totalSize); err != nil {
		return fmt.Errorf("truncate error: %w", err)
	}

	numWorkers := 16
	chunkSize := totalSize / int64(numWorkers)
	var downloaded int64
	var wg sync.WaitGroup
	errCh := make(chan error, numWorkers)

	workerClient := &http.Client{Timeout: 120 * time.Second}

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerIdx int) {
			defer wg.Done()
			startByte := int64(workerIdx) * chunkSize
			endByte := startByte + chunkSize - 1
			if workerIdx == numWorkers-1 {
				endByte = totalSize - 1
			}

			cur := startByte
			buf := make([]byte, 256*1024)

			// Retry loop ensuring entire byte range is 100% written without holes
			for attempt := 0; attempt < 5 && cur <= endByte; attempt++ {
				req, err := http.NewRequest("GET", fileURL, nil)
				if err != nil {
					time.Sleep(500 * time.Millisecond)
					continue
				}
				req.Header.Set("Authorization", token)
				req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", cur, endByte))

				res, err := workerClient.Do(req)
				if err != nil {
					time.Sleep(time.Duration(attempt+1) * time.Second)
					continue
				}

				if res.StatusCode != http.StatusPartialContent && res.StatusCode != http.StatusOK {
					res.Body.Close()
					time.Sleep(time.Duration(attempt+1) * time.Second)
					continue
				}

				for cur <= endByte {
					n, rErr := res.Body.Read(buf)
					if n > 0 {
						_, wErr := file.WriteAt(buf[:n], cur)
						if wErr != nil {
							res.Body.Close()
							select {
							case errCh <- wErr:
							default:
							}
							return
						}
						cur += int64(n)
						newDownloaded := atomic.AddInt64(&downloaded, int64(n))
						if onProgress != nil && totalSize > 0 {
							pct := int(float64(newDownloaded) / float64(totalSize) * 100)
							if pct > 100 {
								pct = 100
							}
							onProgress(pct)
						}
					}
					if rErr != nil {
						break
					}
				}
				res.Body.Close()
			}

			if cur <= endByte {
				select {
				case errCh <- fmt.Errorf("worker %d failed to complete byte range (%d/%d)", workerIdx, cur, endByte):
				default:
				}
				return
			}
		}(i)
	}

	wg.Wait()
	close(errCh)

	if len(errCh) > 0 {
		return <-errCh
	}

	return nil
}
