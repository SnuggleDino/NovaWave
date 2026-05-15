package main

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

func sanitizeMeta(s string) string {
	s = html.UnescapeString(s)
	s = strings.TrimSpace(s)
	if !utf8.ValidString(s) {
		s = strings.ToValidUTF8(s, "")
	}
	if len([]rune(s)) > 200 {
		runes := []rune(s)
		s = string(runes[:200])
	}
	return s
}

type SpotifyTrack struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

type SpotifyService struct{}

func NewSpotifyService() *SpotifyService {
	return &SpotifyService{}
}

func (s *SpotifyService) IsSpotifyUrl(url string) bool {
	return strings.Contains(url, "spotify.com/track/") || strings.Contains(url, "spotify.com/playlist/")
}

func (s *SpotifyService) GetTrackMetadata(url string) (*SpotifyTrack, error) {
	if strings.Contains(url, "spotify.com/playlist/") {
		return nil, fmt.Errorf("playlists are not supported yet. please provide a single track link")
	}
	if !strings.Contains(url, "spotify.com/track/") {
		return nil, fmt.Errorf("invalid spotify track link")
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to spotify: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("could not load spotify page (code %d)", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	html := string(body)
	track := &SpotifyTrack{}

	// Title Extraction
	titleTag := "<meta property=\"og:title\" content=\""
	if idx := strings.Index(html, titleTag); idx != -1 {
		start := idx + len(titleTag)
		end := strings.Index(html[start:], "\"")
		if end != -1 {
			track.Title = sanitizeMeta(strings.TrimSuffix(html[start:start+end], " | Spotify"))
		}
	}

	// Artist Extraction
	descTag := "<meta property=\"og:description\" content=\""
	if idx := strings.Index(html, descTag); idx != -1 {
		start := idx + len(descTag)
		end := strings.Index(html[start:], "\"")
		if end != -1 {
			desc := html[start : start+end]
			parts := strings.Split(desc, " · ")
			if len(parts) > 0 {
				track.Artist = sanitizeMeta(parts[0])
			}
		}
	}

	if track.Title == "" {
		return nil, fmt.Errorf("could not find track title on spotify")
	}

	return track, nil
}

var trackIDPattern = regexp.MustCompile(`spotify:track:([A-Za-z0-9]{22})`)

func (s *SpotifyService) GetPlaylistTracks(playlistUrl string) ([]string, error) {
	if !strings.Contains(playlistUrl, "spotify.com/playlist/") {
		return nil, fmt.Errorf("not a spotify playlist url")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", playlistUrl, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to spotify: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("could not load spotify page (code %d)", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	matches := trackIDPattern.FindAllStringSubmatch(string(body), -1)

	seen := make(map[string]bool)
	var tracks []string
	for _, m := range matches {
		trackUrl := "https://open.spotify.com/track/" + m[1]
		if !seen[trackUrl] {
			seen[trackUrl] = true
			tracks = append(tracks, trackUrl)
		}
	}

	if len(tracks) == 0 {
		return nil, fmt.Errorf("no tracks found — spotify may require a login for this playlist")
	}

	return tracks, nil
}
