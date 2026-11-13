package main

// client_test.go — we can't run a real Kyro inside a unit test, so we build a
// tiny FAKE Kyro: a local web server that answers like the real one. Then we
// check that our client sends the right things and understands the answers.

import (
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestSearchRetriesOn429AndParsesResults(t *testing.T) {
	sleep = func(time.Duration) {} // don't really wait in a test
	defer func() { sleep = time.Sleep }()

	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Header.Get("X-API-Key") != "k" {
			t.Errorf("missing API key header")
		}
		if calls == 1 { // first call: pretend we're rate limited
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"Too many requests","retryAfter":3}`))
			return
		}
		if r.URL.Query().Get("mode") != "vector" {
			t.Errorf("mode not forwarded: %s", r.URL.RawQuery)
		}
		w.Write([]byte(`{"data":[{"fileName":"a.pdf","chunkIndex":2,"content":"hello"}],"query":"q","limit":10}`))
	}))
	defer srv.Close()

	got, _, err := NewClient(srv.URL, "k").Search("q", "vector", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].FileName != "a.pdf" || got[0].ChunkIndex != 2 {
		t.Fatalf("bad parse: %+v", got)
	}
	if calls != 2 {
		t.Fatalf("expected 1 retry (2 calls), got %d calls", calls)
	}
}

func TestUploadSendsRealContentType(t *testing.T) {
	var gotType, gotName string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mt, params, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if mt != "multipart/form-data" {
			t.Errorf("not multipart: %s", mt)
		}
		part, err := multipart.NewReader(r.Body, params["boundary"]).NextPart()
		if err != nil {
			t.Fatal(err)
		}
		gotType = part.Header.Get("Content-Type")
		gotName = part.FileName()
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"abc-123"}`))
	}))
	defer srv.Close()

	path := filepath.Join(t.TempDir(), "doc.pdf")
	os.WriteFile(path, []byte("%PDF-fake"), 0o644)

	id, err := NewClient(srv.URL, "k").Upload(path)
	if err != nil {
		t.Fatal(err)
	}
	if id != "abc-123" || gotName != "doc.pdf" || gotType != "application/pdf" {
		t.Fatalf("id=%q name=%q type=%q", id, gotName, gotType)
	}
}
