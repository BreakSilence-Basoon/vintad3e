export const maxCsvBytes = 256 * 1024;
const header = ['SKU', '상품명', '현재수량'];

// Accept RFC 4180 quoting without importing spreadsheet formulas or extra columns.
export function parseInventoryCsv(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > maxCsvBytes) throw new Error('파일 크기를 확인해 주세요.');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); }
  catch { throw new Error('UTF-8 CSV 파일을 선택해 주세요.'); }
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  function endCell() { row.push(cell); cell = ''; closed = false; }
  function endRow() { endCell(); rows.push(row); row = []; if (rows.length > 501) throw new Error('재고는 500개까지 가져올 수 있습니다.'); }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error('CSV 형식을 확인해 주세요.');
      quoted = true;
    } else if (c === ',') endCell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else { if (closed) throw new Error('CSV 형식을 확인해 주세요.'); cell += c; }
  }
  if (quoted) throw new Error('CSV 형식을 확인해 주세요.');
  if (cell || row.length || closed) endRow();
  if (rows.length < 2 || rows[0].length !== header.length || rows[0].some((value, i) => value !== header[i])) throw new Error('열은 SKU, 상품명, 현재수량만 사용할 수 있습니다.');
  const seen = new Set();
  return rows.slice(1).map((values, index) => {
    if (values.length !== 3) throw new Error(`${index + 2}행의 열 개수를 확인해 주세요.`);
    const [sku, name, rawQuantity] = values.map(value => value.trim());
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(sku)) throw new Error(`${index + 2}행의 SKU를 확인해 주세요.`);
    if (seen.has(sku.toUpperCase())) throw new Error(`${index + 2}행의 SKU가 중복됩니다.`);
    seen.add(sku.toUpperCase());
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) throw new Error(`${index + 2}행의 상품명을 확인해 주세요.`);
    if (!/^(?:0|[1-9]\d{0,6})$/.test(rawQuantity) || Number(rawQuantity) > 1000000) throw new Error(`${index + 2}행의 현재수량은 0부터 1000000까지의 정수여야 합니다.`);
    return { sku, name, quantity: Number(rawQuantity) };
  });
}
