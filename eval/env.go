package main

// env.go — a tiny .env loader so the runner can be started with nothing but
// `go run .` in this folder. It does one thing: read KEY=VALUE lines and set
// the variables the environment doesn't already have. A real export, or an
// explicit -key/-url flag, always wins over the file.

import (
	"fmt"
	"os"
	"strings"
)

// loadDotenv applies the KEY=VALUE pairs in path, filling gaps only: a
// variable already present in the environment is left alone. A missing file
// is not an error — the runner also works with plain environment variables
// or flags.
func loadDotenv(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, line := range strings.Split(string(data), "\n") {
		key, value, ok := parseEnvLine(line)
		if !ok || os.Getenv(key) != "" {
			continue // blank, comment, or malformed; the environment wins
		}
		if err := os.Setenv(key, value); err != nil {
			return fmt.Errorf("%s: %w", key, err)
		}
	}
	return nil
}

// parseEnvLine parses one .env line. It returns ok=false for blank lines,
// comments, and anything without a usable KEY=VALUE; such lines are skipped
// rather than failing the whole run. A value may be wrapped in one pair of
// matching single or double quotes; an unquoted value drops a trailing
// "# comment".
func parseEnvLine(line string) (key, value string, ok bool) {
	line = strings.TrimSpace(strings.TrimPrefix(line, "\ufeff"))
	if line == "" || strings.HasPrefix(line, "#") {
		return "", "", false
	}
	line = strings.TrimPrefix(line, "export ")

	key, value, found := strings.Cut(line, "=")
	if !found {
		return "", "", false
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return "", "", false
	}
	value = strings.TrimSpace(value)

	if len(value) >= 2 {
		q := value[0]
		if (q == '"' || q == '\'') && value[len(value)-1] == q {
			return key, value[1 : len(value)-1], true
		}
	}
	// Unquoted: a trailing comment is not part of the value.
	//	KYRO_URL=http://localhost:3000 # dev
	if i := strings.Index(value, " #"); i >= 0 {
		value = strings.TrimSpace(value[:i])
	}
	return key, value, true
}
