import { Button, Input } from "@vintad3e/ui/components";
export function LibrarySearch({
  query,
  action,
  label,
  maxLength = 200,
}: {
  query: string;
  action: string;
  label: string;
  maxLength?: number;
}) {
  return (
    <form action={action} className="library-search library-field">
      <label htmlFor="library-search">{label}</label>
      <div>
        <Input
          appearance="native"
          id="library-search"
          name="q"
          defaultValue={query}
          maxLength={maxLength}
        />
        <Button type="submit" profile="library">
          검색
        </Button>
      </div>
    </form>
  );
}
