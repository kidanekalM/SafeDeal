package main

import (
	"testing"
	"backend_monolithic/internal/handlers"
)

// Verify all allowed transitions
func TestAllowedTransitions(t *testing.T) {
	h := handlers.EscrowHandler{}
	allowed := map[string][]string{
		"Pending":   {"Active", "Funded", "Canceled"},
		"Active":    {"Locked", "Canceled"},
		"Locked":    {"Funded", "Canceled"},
		"Funded":    {"Released", "Disputed", "Verifying"},
		"Verifying": {"Funded", "Released"},
		"Disputed":  {"Completed", "Refunded"},
		"Released":  {"Completed"},
	}

	for from, toList := range allowed {
		for _, to := range toList {
			if !h.IsValidTransition(from, to) {
				t.Errorf("Transition %s -> %s should be allowed but is blocked", from, to)
			}
		}
	}
}

// Verify forbidden transitions
func TestForbiddenTransitions(t *testing.T) {
	h := handlers.EscrowHandler{}
	forbidden := [][2]string{
		{"Funded", "Active"},
		{"Disputed", "Released"},
		{"Completed", "Pending"},
		{"Refunded", "Active"},
		{"Canceled", "Active"},
	}

	for _, pair := range forbidden {
		if h.IsValidTransition(pair[0], pair[1]) {
			t.Errorf("Transition %s -> %s should be FORBIDDEN but is allowed", pair[0], pair[1])
		}
	}
}
