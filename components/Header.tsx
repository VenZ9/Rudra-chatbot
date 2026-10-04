"use client";

import { MODELS } from "@/lib/models";
import type { Theme } from "@/types";
import { MoonIcon, SparkIcon, SunIcon, TrashIcon } from "./icons";

interface HeaderProps {
  model: string;
  onModelChange: (model: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onClear: () => void;
  canClear: boolean;
}

export function Header({ model, onModelChange, theme, onToggleTheme, onClear, canClear }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <div className="logo">
          <SparkIcon />
        </div>
        <div>
          <div className="brand-name">Rudra Chatbot</div>
          <div className="brand-sub">Powered by OpenRouter</div>
        </div>
      </div>

      <div className="topbar-actions">
        <label className="sr-only" htmlFor="model-select">
          Model
        </label>
        <select
          id="model-select"
          className="model-pill cursor-pointer appearance-none"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          title="Choose a model"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <MoonIcon /> : <SunIcon />}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onClear}
          disabled={!canClear}
          title="Clear chat"
          aria-label="Clear chat"
          style={canClear ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
        >
          <TrashIcon />
        </button>
      </div>
    </header>
  );
}
