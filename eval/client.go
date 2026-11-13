package main

// client.go — talks to Kyro over plain HTTP, exactly like any user would.
//
// Important: this file imports NOTHING from the Kyro codebase. The harness
// knows only the public API. That's what makes the test honest: we measure
// the system through the same door customers use.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// sleep is a variable only so tests can replace it and not really wait.
var sleep = time.Sleep

type Client struct {
	base string // e.g. http://localhost  (we add /api/v1/... ourselves)
	key  string // an API key with read + write scopes
	http *http.Client
}

func NewClient(base, key string) *Client {
	return &Client{
		base: strings.TrimRight(base, "/"),
		key:  key,
		// Generous: with rerank ON, one search can take minutes (one LLM call
		// per candidate chunk).
		http: &http.Client{Timeout: 5 * time.Minute},
	}
}

// getJSON does a GET, decodes the JSON reply into out, and returns how long
// the (final, successful) request took.
//
// Kyro allows 100 requests per minute per key. If we hit that wall the server
// answers 429 and tells us how long to wait. We wait and retry. Crucially, the
// waiting is NOT counted in the latency we report. Only the attempt that
// worked is timed.
func (c *Client) getJSON(path string, out any) (time.Duration, error) {
	for attempt := 0; attempt < 5; attempt++ {
		req, err := http.NewRequest("GET", c.base+path, nil)
		if err != nil {
			return 0, err
		}
		req.Header.Set("X-API-Key", c.key)

		start := time.Now()
		res, err := c.http.Do(req)
		if err != nil {
			return 0, err
		}
		body, err := io.ReadAll(res.Body)
		res.Body.Close()
		elapsed := time.Since(start)
		if err != nil {
			return 0, err
		}

		if res.StatusCode == http.StatusTooManyRequests {
			sleep(retryDelay(body))
			continue
		}
		if res.StatusCode >= 300 {
			return 0, fmt.Errorf("GET %s -> %d: %s", path, res.StatusCode, body)
		}
		return elapsed, json.Unmarshal(body, out)
	}
	return 0, fmt.Errorf("GET %s: still rate limited after 5 tries", path)
}

// Kyro's 429 body looks like {"error":"Too many requests","retryAfter":12}
func retryDelay(body []byte) time.Duration {
	var r struct {
		RetryAfter int `json:"retryAfter"`
	}
	if json.Unmarshal(body, &r) == nil && r.RetryAfter > 0 {
		return time.Duration(r.RetryAfter+1) * time.Second
	}
	return 5 * time.Second
}

// ── Search ──────────────────────────────────────────────────────────────────

// Search calls GET /search. `mode` is "vector", "text", "hybrid" or "" (leave
// it out and the server uses its default). NOTE: the mode parameter doesn't
// exist in Kyro yet. See README.md in this folder. Until you add it, the
// server just ignores it.
func (c *Client) Search(q, mode string, limit int) ([]Chunk, time.Duration, error) {
	p := url.Values{}
	p.Set("q", q)
	p.Set("limit", strconv.Itoa(limit))
	if mode != "" {
		p.Set("mode", mode)
	}

	var out struct {
		Data []Chunk `json:"data"`
	}
	elapsed, err := c.getJSON("/api/v1/search?"+p.Encode(), &out)
	return out.Data, elapsed, err
}

// ── Getting the corpus into Kyro ────────────────────────────────────────────

// mimeFor maps a filename to the Content-Type Kyro expects. We must send the
// real type ourselves: Kyro decides how to extract text from it, and rejects
// "application/octet-stream" (the default many HTTP libraries use) with a 415.
func mimeFor(name string) (string, bool) {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".pdf":
		return "application/pdf", true
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document", true
	case ".txt":
		return "text/plain", true
	}
	return "", false
}

// Upload sends one file to POST /files and returns its id.
func (c *Client) Upload(path string) (string, error) {
	name := filepath.Base(path)
	contentType, ok := mimeFor(name)
	if !ok {
		return "", fmt.Errorf("unsupported file type: %s", name)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	// A multipart body is the same thing a browser sends for <input type=file>:
	// a "form field" named "file" holding the bytes, plus a filename and type.
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	h := textproto.MIMEHeader{}
	h.Set("Content-Disposition",
		mime.FormatMediaType("form-data", map[string]string{"name": "file", "filename": name}))
	h.Set("Content-Type", contentType)
	part, err := w.CreatePart(h)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(data); err != nil {
		return "", err
	}
	if err := w.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", c.base+"/api/v1/files", &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("X-API-Key", c.key)

	res, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	resBody, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("upload %s -> %d: %s", name, res.StatusCode, resBody)
	}

	var out struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(resBody, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

// ListFiles returns every file already in the org as name -> id, so we don't
// upload the same corpus twice.
func (c *Client) ListFiles() (map[string]string, error) {
	files := map[string]string{}
	cursor := ""
	for {
		path := "/api/v1/files?limit=100"
		if cursor != "" {
			path += "&cursor=" + url.QueryEscape(cursor)
		}

		var page struct {
			Data []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"data"`
			Pagination struct {
				HasMore    bool   `json:"hasMore"`
				NextCursor string `json:"nextCursor"`
			} `json:"pagination"`
		}
		if _, err := c.getJSON(path, &page); err != nil {
			return nil, err
		}
		for _, f := range page.Data {
			files[f.Name] = f.ID
		}
		if !page.Pagination.HasMore {
			return files, nil
		}
		cursor = page.Pagination.NextCursor
	}
}

// WaitReady polls until the file has been extracted, chunked and embedded.
// Searching before 'ready' would test a half-built index and give nonsense.
//
// Kyro files go: pending -> processing -> ready (or failed / skipped).
func (c *Client) WaitReady(id string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		var out struct {
			Status string `json:"status"`
			Error  string `json:"error"`
		}
		if _, err := c.getJSON("/api/v1/files/"+id+"/text", &out); err != nil {
			return err
		}
		switch out.Status {
		case "ready":
			return nil
		case "failed", "skipped":
			return fmt.Errorf("file ended as %q %s", out.Status, out.Error)
		}
		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("timed out after %s waiting for file %s", timeout, id)
}
