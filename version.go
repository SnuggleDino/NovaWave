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
	Version:    "3.0.6",
	BuildDate:  "04.06.2026",
	Author:     "SnuggleDino",
	GoVersion:  "v3.0.6 (Go 1.23)",
	GithubUser: "SnuggleDino",
	RepoLink:   "https://github.com/SnuggleDino/NovaWave",
}
