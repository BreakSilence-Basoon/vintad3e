import { getSalesOverviewFixture } from '../../../../sales-overview-fixture';

export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
  if (process.env.NODE_ENV !== 'development' || process.env.VINTAD3E_APPAREL_FIXTURE !== '1') return new Response(null, { status: 404, headers });
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => key !== 'from' && key !== 'to') || params.getAll('from').length !== 1 || params.getAll('to').length !== 1) return new Response(null, { status: 400, headers });
  const data = getSalesOverviewFixture(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE, new Date(), params.get('from')!, params.get('to')!);
  if (!data) return new Response(null, { status: 400, headers });
  return Response.json(data, { headers });
}
