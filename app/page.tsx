"use client";

import { useEffect, useState } from "react";
import { ChatApp } from "@/components/ChatApp";

/**
 * Client-only entry point.
 *
 * The chat is gated behind a mount flag so the persisted transcript can be read
 * from localStorage before `useChat` initialises. The fallback is the same
 * full-height shell, so there is no layout shift — just the themed background
 * for a single frame.
 */
export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="app" aria-hidden="true" />;
  }

  return <ChatApp />;
}
