import { handleFixtureIrExclusiveUpload } from '../../../../fixture-ir-exclusive.mjs';
import { readFixtureIrReservation } from '../../../../fixture-ir-confirmation.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) {
  const reserved = readFixtureIrReservation(request.headers.get('cookie'), request.headers.get('host'), process.env, '00000000-0000-4000-8000-000000000106');
  return handleFixtureIrExclusiveUpload(request, process.env, reserved);
}
