package cache

import (
	"strings"
	"sync"
	"time"
)

type item struct {
	value      interface{}
	expiration int64
}

type MemoryCache struct {
	mu    sync.RWMutex
	items map[string]item
}

var GlobalCache = NewMemoryCache()

func NewMemoryCache() *MemoryCache {
	c := &MemoryCache{
		items: make(map[string]item),
	}
	go c.cleanupRoutine()
	return c
}

func (c *MemoryCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	it, found := c.items[key]
	if !found {
		return nil, false
	}
	if time.Now().UnixNano() > it.expiration {
		return nil, false
	}
	return it.value, true
}

func (c *MemoryCache) Set(key string, val interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = item{
		value:      val,
		expiration: time.Now().Add(ttl).UnixNano(),
	}
}

func (c *MemoryCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

func (c *MemoryCache) DeletePrefix(prefix string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.items {
		if strings.HasPrefix(k, prefix) {
			delete(c.items, k)
		}
	}
}

func (c *MemoryCache) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]item)
}

func (c *MemoryCache) cleanupRoutine() {
	ticker := time.NewTicker(2 * time.Minute)
	for range ticker.C {
		c.mu.Lock()
		now := time.Now().UnixNano()
		for k, v := range c.items {
			if now > v.expiration {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}
