package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type AnimeSearchResult struct {
	MalID         int      `json:"mal_id"`
	Title         string   `json:"title"`
	TitleUz       string   `json:"title_uz"`
	TitleEn       string   `json:"title_en"`
	TitleJp       string   `json:"title_jp"`
	Synopsis      string   `json:"synopsis"`
	PosterURL     string   `json:"poster_url"`
	BannerURL     string   `json:"banner_url"`
	Score         float64  `json:"score"`
	EpisodesCount int      `json:"episodes_count"`
	Episodes      int      `json:"episodes"`
	Status        string   `json:"status"`
	Season        string   `json:"season"`
	Year          int      `json:"year"`
	Genres        []string `json:"genres"`
	Source        string   `json:"source"`
}

type JikanService struct {
	client *http.Client
}

func NewJikanService() *JikanService {
	return &JikanService{
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// SearchAnime runs Shikimori, MAL Direct, and Kitsu in parallel, then merges results smartly
func (s *JikanService) SearchAnime(query string) ([]AnimeSearchResult, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []AnimeSearchResult{}, nil
	}

	var wg sync.WaitGroup
	var shikiList, malList, kitsuList []AnimeSearchResult
	var shikiErr, malErr, kitsuErr error

	// 1. Parallel fetch from all 3 major free anime databases
	wg.Add(3)

	// Source 1: Shikimori (Best for Russian/Uzbek & exact MAL IDs)
	go func() {
		defer wg.Done()
		shikiList, shikiErr = s.searchShikimori(query)
		if shikiErr != nil {
			log.Printf("⚠️ Shikimori search error: %v", shikiErr)
		}
	}()

	// Source 2: MyAnimeList Direct Prefix API (Original MAL posters, official English & Romaji titles)
	go func() {
		defer wg.Done()
		malList, malErr = s.searchMALDirect(query)
		if malErr != nil {
			log.Printf("⚠️ MAL Direct search error: %v", malErr)
		}
	}()

	// Source 3: Kitsu API (Global title variations, high-res banners & rich synopsis)
	go func() {
		defer wg.Done()
		kitsuList, kitsuErr = s.searchKitsu(query)
		if kitsuErr != nil {
			log.Printf("⚠️ Kitsu search error: %v", kitsuErr)
		}
	}()

	wg.Wait()

	// Merge and deduplicate results from all 3 sources
	merged := mergeResults(shikiList, malList, kitsuList)
	if len(merged) > 0 {
		return merged, nil
	}

	// 2. Fallback to Jikan v4 if all 3 primary returned empty
	log.Printf("⚠️ All 3 primary APIs returned empty. Trying fallback Jikan API v4...")
	results, err := s.searchJikanDirect(query)
	if err == nil && len(results) > 0 {
		return results, nil
	}

	// 3. Fallback to AniList GraphQL
	anilistResults, err := s.searchAniList(query)
	if err == nil && len(anilistResults) > 0 {
		return anilistResults, nil
	}

	return []AnimeSearchResult{}, nil
}

// Smart deduplication & merging across Shikimori, MAL, and Kitsu
func mergeResults(shikiList, malList, kitsuList []AnimeSearchResult) []AnimeSearchResult {
	var finalResults []AnimeSearchResult
	byMalID := make(map[int]int)   // mal_id -> index in finalResults
	bySlug := make(map[string]int) // slug -> index in finalResults

	addOrMerge := func(item AnimeSearchResult) {
		// 1. Match by MalID if > 0
		if item.MalID > 0 {
			if idx, exists := byMalID[item.MalID]; exists {
				mergeItem(&finalResults[idx], item)
				return
			}
		}

		// 2. Match by Slug
		s1 := Slugify(item.Title)
		s2 := Slugify(item.TitleEn)
		s3 := Slugify(item.TitleUz)

		matchedIdx := -1
		if s1 != "" {
			if idx, ok := bySlug[s1]; ok {
				matchedIdx = idx
			}
		}
		if matchedIdx == -1 && s2 != "" {
			if idx, ok := bySlug[s2]; ok {
				matchedIdx = idx
			}
		}
		if matchedIdx == -1 && s3 != "" {
			if idx, ok := bySlug[s3]; ok {
				matchedIdx = idx
			}
		}

		if matchedIdx != -1 {
			mergeItem(&finalResults[matchedIdx], item)
			return
		}

		// 3. Add as new item
		idx := len(finalResults)
		finalResults = append(finalResults, item)
		if item.MalID > 0 {
			byMalID[item.MalID] = idx
		}
		if s1 != "" {
			bySlug[s1] = idx
		}
		if s2 != "" {
			bySlug[s2] = idx
		}
		if s3 != "" {
			bySlug[s3] = idx
		}
	}

	// Priority: Shikimori first (has Russian + MAL ID + details), then MAL Direct, then Kitsu
	for _, it := range shikiList {
		addOrMerge(it)
	}
	for _, it := range malList {
		addOrMerge(it)
	}
	for _, it := range kitsuList {
		addOrMerge(it)
	}

	return finalResults
}

func mergeItem(dest *AnimeSearchResult, src AnimeSearchResult) {
	if dest.MalID == 0 && src.MalID > 0 {
		dest.MalID = src.MalID
	}
	if dest.Synopsis == "" && src.Synopsis != "" {
		dest.Synopsis = src.Synopsis
	}
	if (dest.BannerURL == "" || dest.BannerURL == dest.PosterURL) && src.BannerURL != "" && src.BannerURL != src.PosterURL {
		dest.BannerURL = src.BannerURL
	}
	if dest.PosterURL == "" && src.PosterURL != "" {
		dest.PosterURL = src.PosterURL
	}
	if (len(dest.Genres) <= 1 || dest.Genres[0] == "Anime") && len(src.Genres) > 1 {
		dest.Genres = src.Genres
	}
	if dest.EpisodesCount <= 0 && src.EpisodesCount > 0 {
		dest.EpisodesCount = src.EpisodesCount
		dest.Episodes = src.Episodes
	}
	if dest.Score == 0 && src.Score > 0 {
		dest.Score = src.Score
	}
	if dest.TitleEn == "" || dest.TitleEn == dest.TitleUz {
		if src.TitleEn != "" {
			dest.TitleEn = src.TitleEn
		}
	}
	if dest.TitleJp == "" || dest.TitleJp == dest.TitleUz {
		if src.TitleJp != "" {
			dest.TitleJp = src.TitleJp
		}
	}
	if !strings.Contains(dest.Source, src.Source) {
		dest.Source = dest.Source + " + " + src.Source
	}
}

// ---------------------- 1. MYANIMELIST DIRECT PREFIX API ----------------------

func (s *JikanService) searchMALDirect(query string) ([]AnimeSearchResult, error) {
	apiURL := fmt.Sprintf("https://myanimelist.net/search/prefix.json?type=anime&keyword=%s", url.QueryEscape(query))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mal prefix status %d", resp.StatusCode)
	}

	var res struct {
		Categories []struct {
			Type  string `json:"type"`
			Items []struct {
				ID       int    `json:"id"`
				Name     string `json:"name"`
				ImageURL string `json:"image_url"`
				Payload  struct {
					MediaType string `json:"media_type"`
					StartYear int    `json:"start_year"`
					Score     string `json:"score"`
					Status    string `json:"status"`
				} `json:"payload"`
			} `json:"items"`
		} `json:"categories"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var list []AnimeSearchResult
	reCleanImg := regexp.MustCompile(`/r/\d+x\d+/`)

	for _, cat := range res.Categories {
		if cat.Type == "anime" {
			for _, item := range cat.Items {
				score, _ := strconv.ParseFloat(item.Payload.Score, 64)
				if score == 0 {
					score = 8.0
				}
				poster := item.ImageURL
				poster = reCleanImg.ReplaceAllString(poster, "/")
				if idx := strings.Index(poster, "?"); idx != -1 {
					poster = poster[:idx]
				}

				status := "Ongoing"
				if strings.Contains(strings.ToLower(item.Payload.Status), "finish") {
					status = "Completed"
				}

				year := item.Payload.StartYear
				if year == 0 {
					year = 2026
				}

				list = append(list, AnimeSearchResult{
					MalID:         item.ID,
					Title:         item.Name,
					TitleUz:       item.Name,
					TitleEn:       item.Name,
					TitleJp:       item.Name,
					Synopsis:      "",
					PosterURL:     poster,
					BannerURL:     poster,
					Score:         score,
					EpisodesCount: 12,
					Episodes:      12,
					Status:        status,
					Season:        "Bahor",
					Year:          year,
					Genres:        []string{"Anime"},
					Source:        "MAL",
				})
			}
		}
	}

	return list, nil
}

// ---------------------- 2. KITSU API ----------------------

func (s *JikanService) searchKitsu(query string) ([]AnimeSearchResult, error) {
	apiURL := fmt.Sprintf("https://kitsu.io/api/edge/anime?filter[text]=%s&page[limit]=10", url.QueryEscape(query))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "AnivormApp/1.0 (Linux; FastSearch)")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kitsu status %d", resp.StatusCode)
	}

	var res struct {
		Data []struct {
			ID         string `json:"id"`
			Attributes struct {
				Slug           string `json:"slug"`
				CanonicalTitle string `json:"canonicalTitle"`
				Titles         struct {
					En   string `json:"en"`
					EnJp string `json:"en_jp"`
					JaJp string `json:"ja_jp"`
				} `json:"titles"`
				Synopsis      string `json:"synopsis"`
				AverageRating string `json:"averageRating"`
				EpisodeCount  int    `json:"episodeCount"`
				Status        string `json:"status"`
				StartDate     string `json:"startDate"`
				PosterImage   struct {
					Original string `json:"original"`
					Large    string `json:"large"`
				} `json:"posterImage"`
				CoverImage struct {
					Original string `json:"original"`
					Large    string `json:"large"`
				} `json:"coverImage"`
			} `json:"attributes"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var list []AnimeSearchResult
	for _, item := range res.Data {
		attr := item.Attributes
		score := 8.0
		if rating, err := strconv.ParseFloat(attr.AverageRating, 64); err == nil && rating > 0 {
			score = rating / 10.0
		}

		title := attr.CanonicalTitle
		if title == "" {
			title = attr.Titles.En
		}
		if title == "" {
			title = attr.Titles.EnJp
		}

		poster := attr.PosterImage.Large
		if poster == "" {
			poster = attr.PosterImage.Original
		}

		banner := attr.CoverImage.Original
		if banner == "" {
			banner = attr.CoverImage.Large
		}
		if banner == "" {
			banner = poster
		}

		year := 2026
		if len(attr.StartDate) >= 4 {
			if y, err := strconv.Atoi(attr.StartDate[:4]); err == nil && y > 1900 {
				year = y
			}
		}

		status := "Ongoing"
		if strings.ToLower(attr.Status) == "finished" {
			status = "Completed"
		}

		titleEn := attr.Titles.En
		if titleEn == "" {
			titleEn = title
		}

		titleJp := attr.Titles.JaJp
		if titleJp == "" {
			titleJp = title
		}

		list = append(list, AnimeSearchResult{
			MalID:         0,
			Title:         title,
			TitleUz:       title,
			TitleEn:       titleEn,
			TitleJp:       titleJp,
			Synopsis:      attr.Synopsis,
			PosterURL:     poster,
			BannerURL:     banner,
			Score:         score,
			EpisodesCount: attr.EpisodeCount,
			Episodes:      attr.EpisodeCount,
			Status:        status,
			Season:        "Bahor",
			Year:          year,
			Genres:        []string{"Anime"},
			Source:        "Kitsu",
		})
	}

	return list, nil
}

// ---------------------- 3. SHIKIMORI API ----------------------

type shikimoriSearchItem struct {
	ID       int             `json:"id"`
	Name     string          `json:"name"`
	Russian  string          `json:"russian"`
	Image    struct {
		Original string `json:"original"`
		Preview  string `json:"preview"`
	} `json:"image"`
	URL      string          `json:"url"`
	Kind     string          `json:"kind"`
	Score    json.RawMessage `json:"score"`
	Status   string          `json:"status"`
	Episodes int             `json:"episodes"`
	AiredOn  string          `json:"aired_on"`
}

type shikimoriDetailItem struct {
	ID          int             `json:"id"`
	Name        string          `json:"name"`
	Russian     string          `json:"russian"`
	English     []string        `json:"english"`
	Japanese    []string        `json:"japanese"`
	Description string          `json:"description"`
	Score       json.RawMessage `json:"score"`
	Episodes    int             `json:"episodes"`
	Status      string          `json:"status"`
	AiredOn     string          `json:"aired_on"`
	Genres      []struct {
		ID      int    `json:"id"`
		Name    string `json:"name"`
		Russian string `json:"russian"`
	} `json:"genres"`
	Screenshots []struct {
		Original string `json:"original"`
	} `json:"screenshots"`
	Image       struct {
		Original string `json:"original"`
	} `json:"image"`
}

func parseRawScore(raw json.RawMessage) float64 {
	if len(raw) == 0 {
		return 0
	}
	var num float64
	if err := json.Unmarshal(raw, &num); err == nil {
		return num
	}
	var str string
	if err := json.Unmarshal(raw, &str); err == nil {
		f, _ := strconv.ParseFloat(str, 64)
		return f
	}
	return 0
}

func formatShikimoriURL(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return "https://shikimori.io" + path
}

func parseAiredSeason(airedOn string) (int, string) {
	year := 2026
	season := "Bahor"
	if len(airedOn) >= 4 {
		if y, err := strconv.Atoi(airedOn[:4]); err == nil && y > 1900 {
			year = y
		}
	}
	if len(airedOn) >= 7 {
		month, err := strconv.Atoi(airedOn[5:7])
		if err == nil {
			switch {
			case month >= 1 && month <= 3:
				season = "Qish"
			case month >= 4 && month <= 6:
				season = "Bahor"
			case month >= 7 && month <= 9:
				season = "Yoz"
			case month >= 10 && month <= 12:
				season = "Kuz"
			}
		}
	}
	return year, season
}

func parseShikimoriStatus(status string) string {
	switch strings.ToLower(status) {
	case "released":
		return "Completed"
	case "ongoing":
		return "Ongoing"
	case "anons":
		return "Anons"
	default:
		return "Ongoing"
	}
}

func cleanBBCode(s string) string {
	reTagWithContent := regexp.MustCompile(`\[(?:character|anime|manga|entry|person)[^\]]*\](.*?)\[/(?:character|anime|manga|entry|person)\]`)
	s = reTagWithContent.ReplaceAllString(s, "$1")

	reWiki := regexp.MustCompile(`\[\[(.*?)\]\]`)
	s = reWiki.ReplaceAllString(s, "$1")

	reAnyTag := regexp.MustCompile(`\[/?[^\]]+\]`)
	s = reAnyTag.ReplaceAllString(s, "")

	return cleanHTML(s)
}

func (s *JikanService) searchShikimori(query string) ([]AnimeSearchResult, error) {
	apiURL := fmt.Sprintf("https://shikimori.io/api/animes?search=%s&limit=10", url.QueryEscape(query))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "AnivormApp/1.0 (Linux; FastSearch)")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("shikimori search status %d", resp.StatusCode)
	}

	var items []shikimoriSearchItem
	if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
		return nil, err
	}

	if len(items) == 0 {
		return []AnimeSearchResult{}, nil
	}

	results := make([]AnimeSearchResult, len(items))

	for i, it := range items {
		year, season := parseAiredSeason(it.AiredOn)
		poster := formatShikimoriURL(it.Image.Original)
		if poster == "" {
			poster = formatShikimoriURL(it.Image.Preview)
		}

		score := parseRawScore(it.Score)
		if score == 0 {
			score = 8.0
		}

		titleUz := it.Russian
		if titleUz == "" {
			titleUz = it.Name
		}

		results[i] = AnimeSearchResult{
			MalID:         it.ID,
			Title:         it.Name,
			TitleUz:       titleUz,
			TitleEn:       it.Name,
			TitleJp:       it.Name,
			Synopsis:      "",
			PosterURL:     poster,
			BannerURL:     poster,
			Score:         score,
			EpisodesCount: it.Episodes,
			Episodes:      it.Episodes,
			Status:        parseShikimoriStatus(it.Status),
			Season:        season,
			Year:          year,
			Genres:        []string{"Anime"},
			Source:        "Shikimori",
		}
	}

	// Enrich top 3 items sequentially without triggering Shikimori rate limit
	limitEnrich := len(items)
	if limitEnrich > 3 {
		limitEnrich = 3
	}

	for i := 0; i < limitEnrich; i++ {
		detail, err := s.fetchShikimoriDetail(items[i].ID)
		if err == nil && detail != nil {
			if detail.Description != "" {
				results[i].Synopsis = cleanBBCode(detail.Description)
			}
			if len(detail.Genres) > 0 {
				var genres []string
				for _, g := range detail.Genres {
					if g.Name != "" {
						genres = append(genres, g.Name)
					}
				}
				if len(genres) > 0 {
					results[i].Genres = genres
				}
			}
			if len(detail.English) > 0 && detail.English[0] != "" {
				results[i].TitleEn = detail.English[0]
			}
			if len(detail.Japanese) > 0 && detail.Japanese[0] != "" {
				results[i].TitleJp = detail.Japanese[0]
			}
			if len(detail.Screenshots) > 0 && detail.Screenshots[0].Original != "" {
				results[i].BannerURL = formatShikimoriURL(detail.Screenshots[0].Original)
			}
		}
	}

	return results, nil
}

func (s *JikanService) fetchShikimoriDetail(id int) (*shikimoriDetailItem, error) {
	apiURL := fmt.Sprintf("https://shikimori.io/api/animes/%d", id)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "AnivormApp/1.0 (Linux; FastSearch)")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("shikimori detail status %d", resp.StatusCode)
	}

	var detail shikimoriDetailItem
	if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
		return nil, err
	}
	return &detail, nil
}

func (s *JikanService) GetAnimeDetails(malID int) (*AnimeSearchResult, error) {
	detail, err := s.fetchShikimoriDetail(malID)
	if err == nil && detail != nil {
		year, season := parseAiredSeason(detail.AiredOn)
		poster := formatShikimoriURL(detail.Image.Original)
		banner := poster
		if len(detail.Screenshots) > 0 && detail.Screenshots[0].Original != "" {
			banner = formatShikimoriURL(detail.Screenshots[0].Original)
		}

		score := parseRawScore(detail.Score)
		if score == 0 {
			score = 8.0
		}

		titleUz := detail.Russian
		if titleUz == "" {
			titleUz = detail.Name
		}

		titleEn := detail.Name
		if len(detail.English) > 0 && detail.English[0] != "" {
			titleEn = detail.English[0]
		}

		titleJp := detail.Name
		if len(detail.Japanese) > 0 && detail.Japanese[0] != "" {
			titleJp = detail.Japanese[0]
		}

		var genres []string
		for _, g := range detail.Genres {
			if g.Name != "" {
				genres = append(genres, g.Name)
			}
		}
		if len(genres) == 0 {
			genres = []string{"Anime"}
		}

		return &AnimeSearchResult{
			MalID:         detail.ID,
			Title:         detail.Name,
			TitleUz:       titleUz,
			TitleEn:       titleEn,
			TitleJp:       titleJp,
			Synopsis:      cleanBBCode(detail.Description),
			PosterURL:     poster,
			BannerURL:     banner,
			Score:         score,
			EpisodesCount: detail.Episodes,
			Episodes:      detail.Episodes,
			Status:        parseShikimoriStatus(detail.Status),
			Season:        season,
			Year:          year,
			Genres:        genres,
			Source:        "Shikimori",
		}, nil
	}
	return nil, fmt.Errorf("failed to fetch anime detail for id %d: %v", malID, err)
}

// ---------------------- 4. FALLBACKS (JIKAN & ANILIST) ----------------------

func (s *JikanService) searchJikanDirect(query string) ([]AnimeSearchResult, error) {
	apiURL := fmt.Sprintf("https://api.jikan.moe/v4/anime?q=%s&limit=8", url.QueryEscape(query))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "AnivormApp/1.0 (Linux; FastProxy)")

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jikan status code %d", resp.StatusCode)
	}

	var res struct {
		Data []struct {
			MalID         int     `json:"mal_id"`
			Title         string  `json:"title"`
			TitleEnglish  string  `json:"title_english"`
			TitleJapanese string  `json:"title_japanese"`
			Synopsis      string  `json:"synopsis"`
			Score         float64 `json:"score"`
			Episodes      int     `json:"episodes"`
			Status        string  `json:"status"`
			Year          int     `json:"year"`
			Season        string  `json:"season"`
			Images        struct {
				JPG struct {
					LargeImageURL string `json:"large_image_url"`
					ImageURL      string `json:"image_url"`
				} `json:"jpg"`
				WebP struct {
					LargeImageURL string `json:"large_image_url"`
				} `json:"webp"`
			} `json:"images"`
			Genres []struct {
				Name string `json:"name"`
			} `json:"genres"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var list []AnimeSearchResult
	for _, item := range res.Data {
		poster := item.Images.WebP.LargeImageURL
		if poster == "" {
			poster = item.Images.JPG.LargeImageURL
		}
		if poster == "" {
			poster = item.Images.JPG.ImageURL
		}

		var genres []string
		for _, g := range item.Genres {
			genres = append(genres, g.Name)
		}

		status := "Ongoing"
		if item.Status == "Finished Airing" {
			status = "Completed"
		}

		list = append(list, AnimeSearchResult{
			MalID:         item.MalID,
			Title:         item.Title,
			TitleUz:       item.Title,
			TitleEn:       item.TitleEnglish,
			TitleJp:       item.TitleJapanese,
			Synopsis:      cleanHTML(item.Synopsis),
			PosterURL:     poster,
			BannerURL:     poster,
			Score:         item.Score,
			EpisodesCount: item.Episodes,
			Episodes:      item.Episodes,
			Status:        status,
			Season:        item.Season,
			Year:          item.Year,
			Genres:        genres,
			Source:        "Jikan",
		})
	}

	return list, nil
}

func (s *JikanService) searchAniList(query string) ([]AnimeSearchResult, error) {
	graphqlQuery := `
	query ($search: String) {
	  Page(page: 1, perPage: 8) {
	    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
	      id
	      idMal
	      title {
	        romaji
	        english
	        native
	      }
	      description
	      averageScore
	      episodes
	      status
	      seasonYear
	      genres
	      coverImage {
	        extraLarge
	        large
	      }
	      bannerImage
	    }
	  }
	}`

	bodyData, _ := json.Marshal(map[string]interface{}{
		"query":     graphqlQuery,
		"variables": map[string]string{"search": query},
	})

	req, err := http.NewRequest("POST", "https://graphql.anilist.co", bytes.NewBuffer(bodyData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "AnivormApp/1.0 (Linux; FastSearch)")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anilist status code %d", resp.StatusCode)
	}

	var res struct {
		Data struct {
			Page struct {
				Media []struct {
					ID    int `json:"id"`
					IDMal int `json:"idMal"`
					Title struct {
						Romaji  string `json:"romaji"`
						English string `json:"english"`
						Native  string `json:"native"`
					} `json:"title"`
					Description  string   `json:"description"`
					AverageScore int      `json:"averageScore"`
					Episodes     int      `json:"episodes"`
					Status       string   `json:"status"`
					SeasonYear   int      `json:"seasonYear"`
					Genres       []string `json:"genres"`
					CoverImage   struct {
						ExtraLarge string `json:"extraLarge"`
						Large      string `json:"large"`
					} `json:"coverImage"`
					BannerImage string `json:"bannerImage"`
				} `json:"media"`
			} `json:"Page"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var list []AnimeSearchResult
	for _, m := range res.Data.Page.Media {
		poster := m.CoverImage.ExtraLarge
		if poster == "" {
			poster = m.CoverImage.Large
		}

		score := float64(m.AverageScore) / 10.0
		if score == 0 {
			score = 8.0
		}

		year := m.SeasonYear
		if year == 0 {
			year = 2026
		}

		titleUz := m.Title.Romaji
		if titleUz == "" {
			titleUz = m.Title.English
		}

		status := "Ongoing"
		if m.Status == "FINISHED" {
			status = "Completed"
		}

		malID := m.IDMal
		if malID == 0 {
			malID = m.ID
		}

		list = append(list, AnimeSearchResult{
			MalID:         malID,
			Title:         titleUz,
			TitleUz:       titleUz,
			TitleEn:       m.Title.English,
			TitleJp:       m.Title.Native,
			Synopsis:      cleanHTML(m.Description),
			PosterURL:     poster,
			BannerURL:     m.BannerImage,
			Score:         score,
			EpisodesCount: m.Episodes,
			Episodes:      m.Episodes,
			Status:        status,
			Season:        fmt.Sprintf("%d", year),
			Year:          year,
			Genres:        m.Genres,
			Source:        "AniList",
		})
	}

	return list, nil
}

func cleanHTML(s string) string {
	re := regexp.MustCompile("<[^>]*>")
	cleaned := re.ReplaceAllString(s, "")
	cleaned = strings.ReplaceAll(cleaned, "\n\n", " ")
	return strings.TrimSpace(cleaned)
}

// Slugify converts title to URL-friendly slug
func Slugify(title string) string {
	lower := strings.ToLower(title)
	fields := strings.Fields(lower)
	cleaned := strings.Join(fields, "-")
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, cleaned)
}
