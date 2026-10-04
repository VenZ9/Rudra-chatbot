/** The three-dot "waiting for the first token" indicator. */
export function TypingDots() {
  return (
    <div className="typing" role="status" aria-label="Assistant is typing">
      <span />
      <span />
      <span />
    </div>
  );
}
