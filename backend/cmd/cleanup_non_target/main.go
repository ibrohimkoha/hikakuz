package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"anivorm/internal/config"
	"anivorm/internal/service"

	_ "github.com/lib/pq"
)

func main() {
	cfg := config.LoadConfig()
	log.Println("🚀 Starting Selective Episode Cleanup Tool (Preserving Anime 67 / Ep 61)...")

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

	// Fetch all episodes except anime 67 (Qora mash'ala)
	rows, err := db.Query(`
		SELECT id, anime_id, episode_number, b2_key 
		FROM anivorm_episodes 
		WHERE anime_id != 67
		ORDER BY id ASC
	`)
	if err != nil {
		log.Fatalf("❌ Failed to query episodes: %v", err)
	}
	defer rows.Close()

	type EpisodeToDelete struct {
		ID            int
		AnimeID       int
		EpisodeNumber int
		B2Key         string
	}

	var episodes []EpisodeToDelete
	for rows.Next() {
		var ep EpisodeToDelete
		if err := rows.Scan(&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.B2Key); err == nil {
			episodes = append(episodes, ep)
		}
	}

	log.Printf("📊 Found %d non-target episodes to purge from B2 and DB", len(episodes))

	for idx, ep := range episodes {
		key := strings.TrimPrefix(ep.B2Key, "/")
		log.Printf("[%d/%d] 🗑️ Processing Episode ID %d (Anime %d, Ep %d, Key: %s)...", idx+1, len(episodes), ep.ID, ep.AnimeID, ep.EpisodeNumber, key)

		if key != "" {
			if err := uploader.DeleteEpisodeFiles(key); err != nil {
				log.Printf("⚠️ Warning deleting B2 files for %s: %v", key, err)
			} else {
				log.Printf("✅ Purged B2 storage for episode %d (%s)", ep.ID, key)
			}
		}

		// Delete from DB by single ID
		res, err := db.Exec("DELETE FROM anivorm_episodes WHERE id = $1", ep.ID)
		if err != nil {
			log.Printf("❌ Failed to delete episode %d from DB: %v", ep.ID, err)
		} else {
			n, _ := res.RowsAffected()
			log.Printf("✅ Deleted episode %d from DB (%d row)", ep.ID, n)
		}
	}

	log.Println("🎉 Selective cleanup completed successfully! Only Anime 67 (Qora mash'ala) remains.")
}
