package service

import (
	"fmt"
	"sync"
	"time"
)

type HLSJob struct {
	ID            string    `json:"id"`
	B2Key         string    `json:"b2_key"`
	AnimeID       int       `json:"anime_id"`
	EpisodeNumber int       `json:"episode_number"`
	Status        string    `json:"status"` // "queued", "downloading", "transcoding", "uploading", "completed", "failed"
	Progress      int       `json:"progress"`
	Message       string    `json:"message"`
	ResultKey     string    `json:"result_key,omitempty"`
	Error         string    `json:"error,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type HLSJobManager struct {
	jobs map[string]*HLSJob
	mu   sync.RWMutex
}

var (
	hlsManagerInstance *HLSJobManager
	hlsManagerOnce     sync.Once
)

func GetHLSJobManager() *HLSJobManager {
	hlsManagerOnce.Do(func() {
		hlsManagerInstance = &HLSJobManager{
			jobs: make(map[string]*HLSJob),
		}
		go func() {
			ticker := time.NewTicker(30 * time.Minute)
			for range ticker.C {
				hlsManagerInstance.cleanOldJobs()
			}
		}()
	})
	return hlsManagerInstance
}

func (m *HLSJobManager) CreateJob(b2Key string, animeID, epNum int) *HLSJob {
	m.mu.Lock()
	defer m.mu.Unlock()

	jobID := fmt.Sprintf("hls_%d_%d", time.Now().UnixNano(), epNum)
	job := &HLSJob{
		ID:            jobID,
		B2Key:         b2Key,
		AnimeID:       animeID,
		EpisodeNumber: epNum,
		Status:        "queued",
		Progress:      0,
		Message:       "⚙️ HLS navbatiga qo'yildi...",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	m.jobs[jobID] = job
	return job
}

func (m *HLSJobManager) GetJob(jobID string) (*HLSJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	j, ok := m.jobs[jobID]
	if !ok {
		return nil, false
	}
	jobCopy := *j
	return &jobCopy, true
}

func (m *HLSJobManager) UpdateJob(jobID string, status string, progress int, msg string, resultKey string, errStr string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if j, ok := m.jobs[jobID]; ok {
		j.Status = status
		j.Progress = progress
		j.Message = msg
		if resultKey != "" {
			j.ResultKey = resultKey
		}
		if errStr != "" {
			j.Error = errStr
		}
		j.UpdatedAt = time.Now()
	}
}

func (m *HLSJobManager) cleanOldJobs() {
	m.mu.Lock()
	defer m.mu.Unlock()
	cutoff := time.Now().Add(-2 * time.Hour)
	for id, job := range m.jobs {
		if job.CreatedAt.Before(cutoff) {
			delete(m.jobs, id)
		}
	}
}
