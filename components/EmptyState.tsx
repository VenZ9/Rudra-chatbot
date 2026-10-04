"use client";

import { SUGGESTIONS } from "@/lib/suggestions";
import { SuggestionCard } from "./SuggestionCard";
import { SparkIcon } from "./icons";

interface EmptyStateProps {
  onSuggestion: (prompt: string) => void;
}

export function EmptyState({ onSuggestion }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-logo">
        <SparkIcon />
      </div>
      <h1>How can I help you today?</h1>
      <p>Free, open, and running on a free-tier model.</p>
      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <SuggestionCard key={s.title} suggestion={s} onSelect={onSuggestion} />
        ))}
      </div>
    </div>
  );
}
