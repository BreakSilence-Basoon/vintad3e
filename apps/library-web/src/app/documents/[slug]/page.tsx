import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export default async function LegacyDocumentPage() {
 const origin=fixtureOrigin(process.env); if(!origin)notFound();
 const h=await headers(),host=h.get('host'); if(host!==new URL(origin).host)notFound();
 if(!fixtureSession(h.get('cookie'),host,process.env))redirect('/sign-in');
 notFound();
}
