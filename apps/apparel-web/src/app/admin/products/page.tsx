import { InventoryEmpty } from '../../../inventory-empty';
import { getInventoryCollection, getInventoryOptionFilters } from '../../../inventory-collection';
import { getFixtureInventory } from '../../../inventory-fixture';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = Array.isArray(params.search) ? params.search[0] : params.search;
  const products = getFixtureInventory(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE);
  return <main className="admin-console"><div className="admin-console__content"><InventoryEmpty products={products} initial={{ collection: getInventoryCollection(params), search: search?.trim() ?? '', ...getInventoryOptionFilters(params) }} /></div></main>;
}
