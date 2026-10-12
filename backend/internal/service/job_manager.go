package service

import (
	"sync"
	"time"

	"anivorm/internal/database"
)

type TranscodeJob struct {
	ID        string            `json:"id"`
	Status    string            `json:"status"` // queued, transcoding, uploading_b2, completed, failed
	Progress  int               `json:"progress"`
	Message   string            `json:"message"`
	Error        string            `json:"error,omitempty"`
	VideoKey     string            `json:"video_key,omitempty"`
	ThumbnailURL string            `json:"thumbnail_url,omitempty"`
	Episode      *database.Episode `json:"episode,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

type JobManager struct {
	mu   sync.RWMutex
	jobs map[string]*TranscodeJob
}

var globalJobManager = &JobManager{
	jobs: make(map[string]*TranscodeJob),
}

func GetJobManager() *JobManager {
	return globalJobManager
}

func (m *JobManager) CreateJob(id string, initialMsg string) *TranscodeJob {
	m.mu.Lock()
	defer m.mu.Unlock()

	job := &TranscodeJob{
		ID:        id,
		Status:    "queued",
		Progress:  5,
		Message:   initialMsg,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.jobs[id] = job
	return job
}

func (m *JobManager) UpdateJob(id string, status string, progress int, msg string, errStr string, ep *database.Episode) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if job, ok := m.jobs[id]; ok {
		job.Status = status
		job.Progress = progress
		job.Message = msg
		job.Error = errStr
		if ep != nil {
			job.Episode = ep
		}
		job.UpdatedAt = time.Now()
	}
}

func (m *JobManager) SetJobVideo(id string, videoKey string, thumbURL string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if job, ok := m.jobs[id]; ok {
		job.VideoKey = videoKey
		job.ThumbnailURL = thumbURL
		job.UpdatedAt = time.Now()
	}
}

func (m *JobManager) GetJob(id string) (*TranscodeJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	job, ok := m.jobs[id]
	return job, ok
}
