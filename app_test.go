package main

import "testing"

func TestMigrateConfig_FillsMissingDefaults(t *testing.T) {
	out, changed := migrateConfig(map[string]interface{}{})
	if !changed {
		t.Fatal("expected changed=true for an empty config")
	}
	if out["visualizerEnabled"] != true {
		t.Errorf("visualizerEnabled default should be true, got %v", out["visualizerEnabled"])
	}
	if out["volume"] != 0.2 {
		t.Errorf("volume default should be 0.2, got %v", out["volume"])
	}
}

func TestMigrateConfig_PreservesExistingValues(t *testing.T) {
	out, _ := migrateConfig(map[string]interface{}{"visualizerEnabled": false, "volume": 0.9})
	if out["visualizerEnabled"] != false {
		t.Errorf("existing visualizerEnabled=false must not be overwritten, got %v", out["visualizerEnabled"])
	}
	if out["volume"] != 0.9 {
		t.Errorf("existing volume=0.9 must not be overwritten, got %v", out["volume"])
	}
}

func TestMigrateConfig_RenamesGradientTitle(t *testing.T) {
	on, _ := migrateConfig(map[string]interface{}{"gradientTitleEnabled": true})
	if on["titleGradientMode"] != "novawave" {
		t.Errorf("gradientTitleEnabled=true should map to novawave, got %v", on["titleGradientMode"])
	}
	off, _ := migrateConfig(map[string]interface{}{"gradientTitleEnabled": false})
	if off["titleGradientMode"] != "off" {
		t.Errorf("gradientTitleEnabled=false should map to off, got %v", off["titleGradientMode"])
	}
}

func TestMigrateConfig_DoesNotOverrideExplicitMode(t *testing.T) {
	out, _ := migrateConfig(map[string]interface{}{"gradientTitleEnabled": true, "titleGradientMode": "pride"})
	if out["titleGradientMode"] != "pride" {
		t.Errorf("explicit titleGradientMode=pride must be kept, got %v", out["titleGradientMode"])
	}
}

func TestMigrateConfig_KeepsUnknownKeys(t *testing.T) {
	out, _ := migrateConfig(map[string]interface{}{"someRemovedKey": 123.0})
	if _, ok := out["someRemovedKey"]; !ok {
		t.Error("unknown key was dropped; passive-ignore expected")
	}
}
