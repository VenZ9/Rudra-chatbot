"use client";

import type { Suggestion } from "@/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  onSelect: (prompt: string) => void;
}

export function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  return (
    <button type="button" className="suggestion" onClick={() => onSelect(suggestion.prompt)}>
      <b>{suggestion.title}</b>
      <span>{suggestion.subtitle}</span>
    </button>
  );
}
