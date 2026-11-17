import { InventoryEmpty } from '../../../inventory-empty';
import { getInventoryCollection, getInventoryOptionFilters } from '../../../inventory-collection';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = Array.isArray(params.search) ? params.search[0] : params.search;
  return <main className="admin-console"><div className="admin-console__content"><InventoryEmpty initial={{ collection: getInventoryCollection(params), search: search?.trim() ?? '', ...getInventoryOptionFilters(params) }} /></div></main>;
}
