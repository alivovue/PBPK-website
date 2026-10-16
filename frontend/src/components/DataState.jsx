export function DataState({ resource, emptyMessage = 'Belum ada data tersedia.', children }) {
  if (resource.loading) return <p className="data-state" role="status">Memuat data…</p>;
  if (resource.error) {
    return (
      <div className="data-state data-error" role="alert">
        <p>{resource.error.message}</p>
        <button className="secondary-button" onClick={resource.retry}>Coba lagi</button>
      </div>
    );
  }
  if (resource.data === null || (Array.isArray(resource.data) && resource.data.length === 0)) {
    return <p className="data-state">{emptyMessage}</p>;
  }
  return children;
}

export function SignInPrompt({ onSignIn }) {
  return (
    <div className="data-state">
      <p>Masuk untuk melihat data penantangmu.</p>
      <button className="secondary-button" onClick={onSignIn}>Masuk</button>
    </div>
  );
}
