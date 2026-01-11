package main

type AppMeta struct {
	Version    string `json:"version"`
	BuildDate  string `json:"buildDate"`
	Author     string `json:"author"`
	GoVersion  string `json:"goVersion"`
	GithubUser string `json:"githubUser"`
	RepoLink   string `json:"repoLink"`
}

var CurrentMeta = AppMeta{
	Version:    "2.5.8 GO",
	BuildDate:  "11.01.2026",
	Author:     "SnuggleDino",
	GoVersion:  "v2.9.2 (Go 1.23)",
	GithubUser: "SnuggleDino",
	RepoLink:   "https://github.com/SnuggleDino/NovaWave-WAILS",
}
