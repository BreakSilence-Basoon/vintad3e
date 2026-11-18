import { notFound } from 'next/navigation';
import { AuditView } from '../../admin-audit-view';
import { getAuditFixtures } from '../../audit-fixture';

export const dynamic = 'force-dynamic';
export default function AuditPage() {
  const rows = getAuditFixtures(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE, new Date());
  if (!rows.length) notFound();
  return <main className="staff-console admin-audit"><h1 className="preview-visually-hidden">변경 이력</h1><AuditView rows={rows} /></main>;
}
