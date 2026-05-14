package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type UpdateResult struct {
	Available     bool   `json:"available"`
	LatestVersion string `json:"latestVersion"`
	ReleaseUrl    string `json:"releaseUrl"`
	Error         string `json:"error"`
}

type githubRelease struct {
	TagName string `json:"tag_name"`
	HtmlUrl string `json:"html_url"`
}

func (a *App) CheckForUpdate() UpdateResult {
	owner := CurrentMeta.GithubUser
	repo := "NovaWave"
	apiUrl := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)

	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequest("GET", apiUrl, nil)
	if err != nil {
		return UpdateResult{Error: "request_failed"}
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "NovaWave/"+CurrentMeta.Version)

	resp, err := client.Do(req)
	if err != nil {
		return UpdateResult{Error: "network_error"}
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return UpdateResult{Error: fmt.Sprintf("api_error_%d", resp.StatusCode)}
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return UpdateResult{Error: "parse_error"}
	}

	latest := strings.TrimLeft(strings.TrimPrefix(release.TagName, "v"), ".")
	current := CurrentMeta.Version

	available := isNewerVersion(latest, current)
	return UpdateResult{
		Available:     available,
		LatestVersion: latest,
		ReleaseUrl:    release.HtmlUrl,
	}
}

func isNewerVersion(candidate, current string) bool {
	candidate = strings.TrimSpace(candidate)
	current = strings.TrimSpace(current)
	if candidate == current {
		return false
	}
	cp := parseSemVer(candidate)
	cv := parseSemVer(current)
	for i := 0; i < 3; i++ {
		if cp[i] > cv[i] {
			return true
		}
		if cp[i] < cv[i] {
			return false
		}
	}
	return false
}

func parseSemVer(v string) [3]int {
	// Strip pre-release or build-metadata suffixes: "2.9.8-rc1" → "2.9.8"
	if idx := strings.IndexAny(v, "-+"); idx >= 0 {
		v = v[:idx]
	}
	parts := strings.SplitN(strings.TrimSpace(v), ".", 3)
	var out [3]int
	for i := 0; i < 3 && i < len(parts); i++ {
		n, _ := strconv.Atoi(strings.TrimSpace(parts[i]))
		out[i] = n
	}
	return out
}
