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
	Version:    "2.6.0 GO",                                      // NovaWave Music Player Version
	BuildDate:  "24.01.2026",                                    // Build Date
	Author:     "SnuggleDino",                                   // Author
	GoVersion:  "v2.9.2 (Go 1.23)",                              // Go Version
	GithubUser: "SnuggleDino",                                   // Github User
	RepoLink:   "https://github.com/SnuggleDino/NovaWave-WAILS", // Repository Link
}
