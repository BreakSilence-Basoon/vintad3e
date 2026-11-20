const sales = [
  { id:'sale-1', soldAt:'2026-11-19T03:00:00.000Z', productName:'상품 01', quantity:2, amount:24690 },
];
export async function readSettlementForClient(params: URLSearchParams, signal: AbortSignal) {
  if (signal.aborted) return {kind:'aborted' as const};
  const brand = params.get('brand'), from = Date.parse(params.get('from') ?? ''), to = Date.parse(params.get('to') ?? '');
  if (brand !== 'fixture-01' || !Number.isFinite(from) || !Number.isFinite(to) || from >= to) return {kind:'error' as const};
  const matching = sales.filter(sale => Date.parse(sale.soldAt) >= from && Date.parse(sale.soldAt) < to);
  const amount = matching.reduce((sum,sale) => sum + sale.amount,0), quantity = matching.reduce((sum,sale) => sum + sale.quantity,0);
  return {kind:'ok' as const, value:{brand:{code:brand,name:'협업처 01'},defaultPercent:5,products:matching.map(sale=>({productId:sale.id,name:sale.productName,quantity:sale.quantity,amount:sale.amount})),sales:matching,totals:{amount,quantity},unpricedQuantity:0}};
}
