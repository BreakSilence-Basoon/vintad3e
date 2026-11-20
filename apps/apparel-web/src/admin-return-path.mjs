const origin = 'http://127.0.0.1:3826';
const pages = new Set(['/admin', '/admin/audit', '/admin/inventory/shortages', '/admin/products', '/admin/sales', '/admin/stats', '/admin/support']);

export function fixtureAdminReturnPath(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f#]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || (!pages.has(url.pathname) && !/^\/admin\/inventory\/graphics\/[A-Z0-9-]+$/.test(url.pathname))) return null;
    url.searchParams.delete('_rsc');
    return `${url.pathname}${url.search}`;
  } catch { return null; }
}
