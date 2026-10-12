package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"anivorm/internal/config"
	"anivorm/internal/service"

	_ "github.com/lib/pq"
)

func main() {
	cfg := config.LoadConfig()
	log.Println("🚀 Starting HLS Zero-Lag Batch Migration Tool...")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Database ping failed: %v", err)
	}

	uploader := service.NewB2Uploader(cfg)
	converter := service.NewHLSConverter(uploader)

	epFlag := flag.Int("ep", 0, "Specific episode ID to migrate")
	flag.Parse()

	query := `
		SELECT id, anime_id, episode_number, b2_key 
		FROM anivorm_episodes 
		WHERE b2_key != '' AND b2_key NOT LIKE '%.m3u8%'
	`
	if *epFlag > 0 {
		query += fmt.Sprintf(" AND id = %d", *epFlag)
	} else {
		query += " ORDER BY id DESC"
	}

	rows, err := db.Query(query)
	if err != nil {
		log.Fatalf("❌ Failed to query episodes: %v", err)
	}
	defer rows.Close()

	type EpisodeToMigrate struct {
		ID            int
		AnimeID       int
		EpisodeNumber int
		B2Key         string
	}

	var episodes []EpisodeToMigrate
	for rows.Next() {
		var ep EpisodeToMigrate
		if err := rows.Scan(&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.B2Key); err == nil {
			episodes = append(episodes, ep)
		}
	}

	total := len(episodes)
	log.Printf("📊 Found %d episodes to convert to HLS format", total)

	for idx, ep := range episodes {
		oldKey := strings.TrimPrefix(ep.B2Key, "/")
		log.Printf("\n[%d/%d] 🎬 Processing Episode ID %d (Anime %d, Ep %d)...", idx+1, total, ep.ID, ep.AnimeID, ep.EpisodeNumber)
		log.Printf("     Source: %s", oldKey)

		remoteURL := fmt.Sprintf("https://cdn.hikaku.uz/%s", oldKey)
		b2Prefix := fmt.Sprintf("episodes/hls/anime_%d/ep_%d_%d", ep.AnimeID, ep.EpisodeNumber, time.Now().Unix())

		localCandidate := fmt.Sprintf("/tmp/ep%d.mp4", ep.ID)
		var hlsM3U8Key string
		var convErr error
		if _, err := os.Stat(localCandidate); err == nil {
			log.Printf("⚡ Found local file %s, skipping download!", localCandidate)
			hlsM3U8Key, convErr = converter.ConvertLocalMP4ToHLS(localCandidate, b2Prefix)
			_ = os.Remove(localCandidate)
		} else {
			hlsM3U8Key, convErr = converter.ConvertRemoteMP4ToHLS(remoteURL, b2Prefix)
		}

		if convErr != nil {
			log.Printf("❌ Failed to convert episode %d: %v", ep.ID, convErr)
			continue
		}

		// Update DB with HLS playlist key
		_, err = db.Exec("UPDATE anivorm_episodes SET b2_key = $1 WHERE id = $2", hlsM3U8Key, ep.ID)
		if err != nil {
			log.Printf("❌ Failed to update DB for episode %d: %v", ep.ID, err)
			continue
		}

		log.Printf("✅ DB updated with HLS key: %s", hlsM3U8Key)

		// Delete original MP4 from B2 to save 50% cloud storage
		if err := uploader.DeleteFile(oldKey); err != nil {
			log.Printf("⚠️ Warning deleting old MP4 from B2: %v", err)
		} else {
			log.Printf("🗑️ Purged old MP4 from B2 storage: %s", oldKey)
		}

		// Brief pause to keep VPS load low
		time.Sleep(1500 * time.Millisecond)
	}

	log.Println("\n🎉 All episodes successfully migrated to HLS!")
}
