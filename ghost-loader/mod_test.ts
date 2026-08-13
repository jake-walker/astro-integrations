import { z } from "astro/zod";
import type { LoaderContext, ParseDataOptions } from "astro/loaders";
import { ghostLoader } from "./mod.ts";
import { postsSchema } from "./schema.ts";
import { loadEntries, mockFetchPages } from "../test-utils.ts";

function postFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-id",
    slug: "hello-world",
    meta_title: null,
    meta_description: null,
    title: "Hello World",
    html: "<p>Hello</p>",
    plaintext: "Hello",
    comment_id: null,
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    featured: false,
    custom_excerpt: null,
    codeinjection_head: null,
    codeinjection_foot: null,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    visibility: "public",
    custom_template: null,
    canonical_url: null,
    authors: [],
    tags: [],
    primary_author: null,
    primary_tag: null,
    url: "https://ghost.example.com/hello-world/",
    excerpt: "Hello",
    reading_time: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    published_at: "2026-01-02T00:00:00.000Z",
    access: true,
    comments: false,
    email_subject: null,
    ...overrides,
  };
}

Deno.test("ghostLoader stores entries that validate against its schema", async () => {
  const fetchMock = mockFetchPages([
    {
      posts: [postFixture()],
      meta: {
        pagination: {
          page: 1,
          limit: "all",
          pages: 1,
          total: 1,
          next: null,
          prev: null,
        },
      },
    },
  ]);

  try {
    const entries = await loadEntries(
      ghostLoader({
        url: "https://ghost.example.com",
        contentApiKey: "0123456789abcdef0123456789",
      }),
      {
        parseData<TData extends Record<string, unknown>>(
          props: ParseDataOptions<TData>,
        ): Promise<TData> {
          return Promise.resolve(
            z.parse(postsSchema, props.data) as unknown as TData,
          );
        },
      } as Partial<LoaderContext>,
    );

    if (entries.length !== 1) {
      throw new Error(`Expected 1 entry, got ${entries.length}`);
    }

    if (entries[0].id !== "post-id") {
      throw new Error(`Unexpected entry id: ${entries[0].id}`);
    }

    const parsed = z.parse(postsSchema, entries[0].data);

    if (parsed.title !== "Hello World") {
      throw new Error(`Unexpected post title: ${parsed.title}`);
    }

    if (entries[0].filePath !== "https://ghost.example.com/hello-world/") {
      throw new Error(`Unexpected file path: ${entries[0].filePath}`);
    }

    if (!entries[0].rendered?.html.includes("<p>Hello</p>")) {
      throw new Error("Expected rendered HTML to contain the post body");
    }

    if (
      !fetchMock.requestedUrls.includes(
        "https://ghost.example.com/ghost/api/content/posts/?order=published_at+DESC&limit=all&key=0123456789abcdef0123456789",
      )
    ) {
      throw new Error("Expected Ghost posts endpoint to be fetched");
    }
  } finally {
    fetchMock.restore();
  }
});
