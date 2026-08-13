import type { Loader, LoaderContext, ParseDataOptions } from "astro/loaders";

export type DataEntry = Parameters<LoaderContext["store"]["set"]>[0];

export async function loadEntries(
  loader: Loader,
  options: Partial<LoaderContext> = {},
): Promise<DataEntry[]> {
  const entries: DataEntry[] = [];

  await loader.load({
    collection: "test",
    store: {
      set(entry: DataEntry) {
        entries.push(entry);
      },
    },
    meta: {},
    logger: {
      info() {},
      warn() {},
      error() {},
      debug() {},
      options: {
        dest: null,
        level: "info",
      },
      label: "test",
      fork() {
        return this;
      },
    } as unknown as LoaderContext["logger"],
    config: {
      image: {},
    },
    parseData<TData extends Record<string, unknown>>(
      props: ParseDataOptions<TData>,
    ): Promise<TData> {
      return Promise.resolve(props.data);
    },
    renderMarkdown() {
      return Promise.resolve({ html: "", metadata: {} });
    },
    generateDigest(data: Record<string, unknown> | string) {
      return JSON.stringify(data);
    },
    ...options,
  } as LoaderContext);

  return entries;
}

export function mockFetchPages(pages: unknown[]): {
  requestedUrls: string[];
  restore: () => void;
} {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = ((input: string | URL | Request) => {
    requestedUrls.push(input instanceof Request ? input.url : String(input));
    return Promise.resolve(Response.json(pages.shift() ?? []));
  }) as typeof fetch;

  return {
    requestedUrls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}
