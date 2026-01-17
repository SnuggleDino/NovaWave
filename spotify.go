package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type SpotifyTrack struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

type SpotifyService struct {
	ctx context.Context
}

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
			track.Title = strings.TrimSuffix(html[start:start+end], " | Spotify")
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
				track.Artist = parts[0]
			}
		}
	}

	if track.Title == "" {
		return nil, fmt.Errorf("could not find track title on spotify")
	}

	return track, nil
}