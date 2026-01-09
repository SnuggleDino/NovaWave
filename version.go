package main

// AppMeta enthält alle statischen Projekt-Informationen
type AppMeta struct {
	Version    string `json:"version"`
	BuildDate  string `json:"buildDate"`
	Author     string `json:"author"`
	GoVersion  string `json:"goVersion"` // Wails/Go Version
	GithubUser string `json:"githubUser"`
	RepoLink   string `json:"repoLink"`
}

// CurrentMeta speichert die aktuellen Build-Daten zentral an einem Ort
var CurrentMeta = AppMeta{
	Version:    "2.5.7 GO",
	BuildDate:  "09.01.2026",
	Author:     "SnuggleDino",
	GoVersion:  "v2.9.2 (Go 1.23)",
	GithubUser: "SnuggleDino",
	RepoLink:   "https://github.com/SnuggleDino/NovaWave-WAILS",
}
