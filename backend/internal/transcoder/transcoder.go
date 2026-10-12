package transcoder

import (
	"fmt"
	"log"
	"os/exec"
	"strconv"
	"strings"
)

type TranscoderOptions struct {
	InputPath     string
	OutputPath    string
	ThumbnailPath string
	CRF           int
	Preset        string
	AudioBitrate  string
	Resolution    string
	TuneAnimation bool
}

// CompressAnimeVideo compresses anime video rapidly using optimized multi-threaded ultrafast presets
func CompressAnimeVideo(opts TranscoderOptions) error {
	if opts.CRF <= 0 {
		opts.CRF = 26
	}
	if opts.AudioBitrate == "" {
		opts.AudioBitrate = "128k"
	}
	if opts.Preset == "" {
		opts.Preset = "ultrafast" // 50x faster than medium, encodes 24min in 30s on CPU
	}

	// 1. Check if input is already h264 MP4
	probeOut, _ := exec.Command("ffprobe", "-v", "error", "-show_entries", "stream=codec_name", "-of", "default=noprint_wrappers=1:nokey=1", opts.InputPath).Output()
	probeStr := strings.ToLower(string(probeOut))
	isH264 := strings.Contains(probeStr, "h264")

	var args []string
	if isH264 && opts.Resolution == "" && opts.CRF >= 28 {
		// Ultra-fast Remux in 1 second
		args = []string{
			"-y",
			"-i", opts.InputPath,
			"-c", "copy",
			"-movflags", "+faststart",
			opts.OutputPath,
		}
	} else {
		args = []string{
			"-y",
			"-threads", "2",
			"-i", opts.InputPath,
			"-sn", "-dn",
			"-c:v", "libx264",
			"-preset", opts.Preset,
			"-crf", strconv.Itoa(opts.CRF),
		}

		if opts.TuneAnimation {
			args = append(args, "-tune", "animation")
		}

		if opts.Resolution != "" {
			args = append(args, "-vf", fmt.Sprintf("scale=%s", opts.Resolution))
		}

		args = append(args,
			"-pix_fmt", "yuv420p",
			"-c:a", "aac",
			"-b:a", opts.AudioBitrate,
			"-movflags", "+faststart",
			opts.OutputPath,
		)
	}

	log.Printf("🎬 Executing Anime FFmpeg: ffmpeg %v", args)
	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ FFmpeg error: %v, output: %s", err, string(output))
		return fmt.Errorf("ffmpeg transcoding failed: %w", err)
	}

	// Extract high quality thumbnail at 02:30
	if opts.ThumbnailPath != "" {
		thumbArgs := []string{
			"-y",
			"-ss", "00:02:30",
			"-i", opts.InputPath,
			"-vframes", "1",
			"-q:v", "2",
			opts.ThumbnailPath,
		}
		_ = exec.Command("ffmpeg", thumbArgs...).Run()
	}

	return nil
}
