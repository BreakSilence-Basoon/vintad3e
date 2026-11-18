'use client';
import { Fragment, useState } from 'react';

type Row = { person: { id: string; name: string }; access: readonly string[] };
export function PermissionsMatrix({ tier, apps, rows }: { tier: string; apps: readonly { id: string; name: string }[]; rows: readonly Row[] }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="matrix-scroll permissions-scroll" data-expanded={expanded} role="region" aria-label={`${tier} 구성원별 앱 권한`} tabIndex={0}>
    <table className="matrix-table permissions-matrix"><caption className="preview-visually-hidden">{tier} 구성원별 앱 권한</caption>
      <thead><tr><th scope="col">구성원</th>{apps.map((app, index) => <Fragment key={app.id}>{index === 1 && <th className="permissions-toggle" scope="col"><button type="button" aria-label={expanded ? '앱 권한 접기' : '앱 권한 펼치기'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 20.5h12M4.5 18V12m4 6V7m4 11V4" /><circle cx="17" cy="17" r="5.5" fill="var(--surface-strong)" /><path d="M17 17V11.5a5.5 5.5 0 0 1 5.17 7.38Z" fill="currentColor" stroke="none" /><path d="M17 17l5.17 1.88a5.5 5.5 0 0 1-9.93 .87Z" fill="currentColor" fillOpacity=".45" stroke="none" /></svg></button></th>}<th scope="col" className={index > 1 ? 'permissions-extra' : undefined}>{app.name}</th></Fragment>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.person.id}><th scope="row">{row.person.name}</th>{row.access.map((grant, index) => <Fragment key={apps[index].id}>{index === 1 && <td className="permissions-toggle" aria-hidden="true" />}<td className={index > 1 ? 'permissions-extra' : undefined}>{grant}</td></Fragment>)}</tr>)}</tbody>
    </table>
  </div>;
}
