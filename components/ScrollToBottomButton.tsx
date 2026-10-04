"use client";

import { ChevronDownIcon } from "./icons";

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ visible, onClick }: ScrollToBottomButtonProps) {
  return (
    <button
      type="button"
      className={`scroll-btn${visible ? " show" : ""}`}
      onClick={onClick}
      title="Scroll to bottom"
      aria-label="Scroll to bottom"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <ChevronDownIcon />
    </button>
  );
}
