// Accept only internal Library search destinations and supported document views.
export function isSearchResultHref(value: string): boolean {
  const id = '[a-zA-Z0-9_-]+';
  if (new RegExp(`^/(?:publications|ir|meetings)/${id}$`).test(value)) return true;
  return new RegExp(`^/objects/${id}(?:\\?documentId=${id}(?:&view=corrected)?)?$`).test(value);
}
