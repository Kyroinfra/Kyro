package main

import (
	"os"
	"path/filepath"
	"testing"
)

// writeEnv drops content into a temp .env and returns its path, so tests
// never touch a real .env in the working directory.
func writeEnv(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestLoadDotenvFillsGapsOnly(t *testing.T) {
	t.Setenv("EVAL_TEST_SET", "from-environment") // already set: the file must not win
	t.Setenv("EVAL_TEST_EMPTY", "")               // empty counts as unset
	t.Setenv("EVAL_TEST_NEW", "")                 // absent counts as unset

	path := writeEnv(t, "EVAL_TEST_SET=from-file\n"+
		"EVAL_TEST_EMPTY=from-file\n"+
		"EVAL_TEST_NEW=from-file\n")
	if err := loadDotenv(path); err != nil {
		t.Fatal(err)
	}

	if got := os.Getenv("EVAL_TEST_SET"); got != "from-environment" {
		t.Errorf("existing variable overwritten: got %q, want %q", got, "from-environment")
	}
	if got := os.Getenv("EVAL_TEST_EMPTY"); got != "from-file" {
		t.Errorf("empty variable not filled: got %q, want %q", got, "from-file")
	}
	if got := os.Getenv("EVAL_TEST_NEW"); got != "from-file" {
		t.Errorf("new variable not set: got %q, want %q", got, "from-file")
	}
}

func TestLoadDotenvParsing(t *testing.T) {
	// Pre-set everything to empty so the test is hermetic: the loader treats
	// an empty variable as unset and fills it from the file.
	for _, k := range []string{
		"EVAL_TEST_EXPORTED", "EVAL_TEST_QUOTED", "EVAL_TEST_SINGLE",
		"EVAL_TEST_COMMENTED", "EVAL_TEST_PLAIN",
	} {
		t.Setenv(k, "")
	}

	path := writeEnv(t, `# full-line comment

export EVAL_TEST_EXPORTED=yes
EVAL_TEST_QUOTED="double # quoted"
EVAL_TEST_SINGLE='single quoted'
EVAL_TEST_COMMENTED=http://localhost:3000 # dev
EVAL_TEST_NOEQUALSIGN
=nokey
EVAL_TEST_PLAIN=plain
`)
	if err := loadDotenv(path); err != nil {
		t.Fatal(err)
	}

	want := map[string]string{
		"EVAL_TEST_EXPORTED":  "yes",
		"EVAL_TEST_QUOTED":    "double # quoted", // quotes protect the "#"
		"EVAL_TEST_SINGLE":    "single quoted",
		"EVAL_TEST_COMMENTED": "http://localhost:3000", // trailing comment dropped
		"EVAL_TEST_PLAIN":     "plain",
	}
	for key, exp := range want {
		if got := os.Getenv(key); got != exp {
			t.Errorf("%s = %q, want %q", key, got, exp)
		}
	}
	for _, key := range []string{"EVAL_TEST_NOEQUALSIGN", "nokey"} {
		if got := os.Getenv(key); got != "" {
			t.Errorf("%s = %q, want it unset", key, got)
		}
	}
}

func TestLoadDotenvMissingFile(t *testing.T) {
	if err := loadDotenv(filepath.Join(t.TempDir(), "absent.env")); err != nil {
		t.Errorf("missing .env should be a silent no-op, got %v", err)
	}
}

func TestLoadDotenvDirectory(t *testing.T) {
	if err := loadDotenv(t.TempDir()); err == nil {
		t.Error("reading a directory should return an error")
	}
}
