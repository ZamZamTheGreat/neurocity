"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="platform-state"><a href="/" className="brand"><span>Neuro</span><strong>City</strong></a><span className="platform-state-code">!</span><h1>Something did not load</h1><p>Your information is safe. Try loading this section again.</p><div><button className="platform-state-action" onClick={reset}>Try again</button><a href="/">Return to the mall</a></div></main>;
}
