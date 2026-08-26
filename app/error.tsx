"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="platform-state">
      <a href="/" className="brand">
        <span>Neuro</span>
        <strong>City</strong>
      </a>
      <span className="platform-state-code">!</span>
      <h1>Something did not load</h1>
      <ul className="info-list centered">
        <li>Your information is safe.</li>
        <li>Try loading this section again.</li>
      </ul>
      <div>
        <button className="platform-state-action" onClick={reset}>
          Try again
        </button>
        <a href="/">Return to the mall</a>
      </div>
    </main>
  );
}
