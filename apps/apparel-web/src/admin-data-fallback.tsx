export function AdminDataFallback({ rows = 4 }: { rows?: number }) {
  return (
    <section className="console-section console-section--loading" aria-busy="true" aria-label="데이터 로딩">
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="skeleton-row" key={index}>
            <span className="skeleton-line skeleton-line--strong" />
            <span className="skeleton-line" />
          </div>
        ))}
      </div>
    </section>
  );
}
