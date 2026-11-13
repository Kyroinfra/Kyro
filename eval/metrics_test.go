package main

// metrics_test.go — before trusting any number the harness prints, we check
// the scoring code on tiny cases where we can compute the answer in our head.
// If the ruler is broken, every measurement is garbage.
//
// Run with:  go test ./...

import (
	"math"
	"testing"
	"time"
)

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestNormalize(t *testing.T) {
	got := normalize("  Thirty\n (30)   DAYS ")
	want := "thirty (30) days"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestRankOf(t *testing.T) {
	results := []Chunk{
		{FileName: "a.pdf", Content: "nothing useful here"},
		{FileName: "b.pdf", Content: "within thirty (30) days of notice"}, // right words, WRONG file
		{FileName: "a.pdf", Content: "cure within\nThirty (30) days of notice"},
		{FileName: "a.pdf", Content: "within thirty (30) days of notice"},
	}

	// The first right chunk is the 3rd one: right file, phrase split by a
	// newline and different capitalization, which normalize() forgives.
	if got := rankOf(results, "a.pdf", "within thirty (30) days"); got != 3 {
		t.Fatalf("rank = %d, want 3", got)
	}
	// Phrase that appears nowhere -> miss.
	if got := rankOf(results, "a.pdf", "ninety days"); got != 0 {
		t.Fatalf("rank = %d, want 0", got)
	}
}

func TestRecallAtK(t *testing.T) {
	ranks := []int{1, 3, 0, 6}
	if got := recallAtK(ranks, 5); !near(got, 0.5) {
		t.Fatalf("recall@5 = %v, want 0.5", got)
	}
	if got := recallAtK(ranks, 1); !near(got, 0.25) {
		t.Fatalf("recall@1 = %v, want 0.25", got)
	}
}

func TestMRR(t *testing.T) {
	// (1 + 1/2 + 0 + 1/4) / 4 = 0.4375
	if got := mrr([]int{1, 2, 0, 4}); !near(got, 0.4375) {
		t.Fatalf("mrr = %v, want 0.4375", got)
	}
	// perfect system: always rank 1
	if got := mrr([]int{1, 1, 1}); !near(got, 1.0) {
		t.Fatalf("mrr = %v, want 1.0", got)
	}
}

func TestPercentile(t *testing.T) {
	ds := []time.Duration{40, 10, 30, 20} // deliberately unsorted
	if got := percentile(ds, 0.5); got != 20 {
		t.Fatalf("p50 = %v, want 20", got)
	}
	if got := percentile(ds, 1.0); got != 40 {
		t.Fatalf("p100 = %v, want 40", got)
	}
	// the caller's slice must not be reordered
	if ds[0] != 40 {
		t.Fatalf("percentile modified its input")
	}
}
