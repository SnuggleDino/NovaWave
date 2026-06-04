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
	Version:    "3.1.0",
	BuildDate:  "04.06.2026",
	Author:     "SnuggleDino",
	GoVersion:  "v3.1.0 (Go 1.23)",
	GithubUser: "SnuggleDino",
	RepoLink:   "https://github.com/SnuggleDino/NovaWave",
}
