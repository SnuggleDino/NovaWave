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
		return nil, fmt.Errorf("Playlists werden aktuell noch nicht unterstützt. Bitte geben Sie einen Song-Link an.")
	}
	if !strings.Contains(url, "spotify.com/track/") {
		return nil, fmt.Errorf("ungültiger Spotify-Track-Link")
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("verbindung zu Spotify fehlgeschlagen: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("spotify Seite konnte nicht geladen werden (Code %d)", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	html := string(body)
	track := &SpotifyTrack{}

	// Robust Title Extraction
	titleTag := "<meta property=\"og:title\" content=\""
	if idx := strings.Index(html, titleTag); idx != -1 {
		start := idx + len(titleTag)
		end := strings.Index(html[start:], "\"")
		if end != -1 {
			track.Title = strings.TrimSuffix(html[start:start+end], " | Spotify")
		}
	}

	// Robust Artist Extraction
	descTag := "<meta property=\"og:description\" content=\""
	if idx := strings.Index(html, descTag); idx != -1 {
		start := idx + len(descTag)
		end := strings.Index(html[start:], "\"")
		if end != -1 {
			desc := html[start : start+end]
			// Artist is usually the first part before the dot separator
			parts := strings.Split(desc, " · ")
			if len(parts) > 0 {
				track.Artist = parts[0]
			}
		}
	}

	if track.Title == "" {
		return nil, fmt.Errorf("song-Titel konnte auf Spotify nicht gefunden werden")
	}

	return track, nil
}
