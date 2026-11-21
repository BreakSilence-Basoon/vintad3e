export default function AdminLoading() {
  return (
    <main className="admin-console">
      <div className="admin-console__content">
        <section className="console-page console-page--loading">
          <section className="console-section console-section--loading" aria-busy="true" aria-label="데이터 로딩">
            <div className="skeleton-list" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="skeleton-row" key={index}>
                  <span className="skeleton-line skeleton-line--strong" />
                  <span className="skeleton-line" />
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
