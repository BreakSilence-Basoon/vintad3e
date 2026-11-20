import { internalDocuments } from './internal-document-fixture.ts';
import { getLibraryFixtures, searchLibraryFixtures } from './library-fixture.ts';
import { getFixtureObject, OBJECT_ID } from './fixture-object.ts';

export function fixtureHome(env: string | undefined, enabled: string | undefined, query: string) {
  const documents = searchLibraryFixtures(getLibraryFixtures(env, enabled), query).map(item => ({ id: item.id, title: item.title, href: `/publications/${item.id}`, publisher: item.publisher, publishedAt: item.createdAt }));
  const object = getFixtureObject(env, enabled, OBJECT_ID);
  const files = object && object.filename.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko')) ? [{ id: `object:${object.id}`, title: object.filename, href: `/objects/${object.id}`, publisher: '직원', publishedAt: '2026-01-01T00:00:00.000Z' }] : [];
  const internal = internalDocuments(env, enabled).filter(item => item.title.toLocaleLowerCase('ko').includes(query.trim().toLocaleLowerCase('ko'))).map(item => ({ id: `${item.kind}:${item.id}`, title:item.title, href:`/${item.kind}/${item.id}`, publisher:item.publisher, publishedAt:item.createdAt }));
  return [...documents, ...files, ...internal].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
}
