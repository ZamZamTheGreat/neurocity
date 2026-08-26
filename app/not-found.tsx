export default function NotFound() {
  return (
    <main id="main-content" className="platform-state">
      <a href="/" className="brand">
        <span>Neuro</span>
        <strong>City</strong>
      </a>
      <span className="platform-state-code">404</span>
      <h1>This page is not in the mall</h1>
      <ul className="info-list centered">
        <li>The link may have changed.</li>
        <li>The store may no longer be publicly available.</li>
      </ul>
      <a className="platform-state-action" href="/">
        Return to NeuroCity
      </a>
    </main>
  );
}
