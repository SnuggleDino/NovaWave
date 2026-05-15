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
	Version:    "2.9.9-1",
	BuildDate:  "15.05.2026",
	Author:     "SnuggleDino",
	GoVersion:  "v2.9.9-1 (Go 1.23)",
	GithubUser: "SnuggleDino",
	RepoLink:   "https://github.com/SnuggleDino/NovaWave",
}
