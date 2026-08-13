import { z } from "astro/zod";
import { forgejoRepoLoader, githubRepoLoader } from "./mod.ts";
import { repoSchema } from "./schema.ts";
import { loadEntries, mockFetchPages } from "../test-utils.ts";

function repoFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    description: null,
    full_name: "jake-walker/example",
    html_url: "https://github.com/jake-walker/example",
    language: null,
    name: "example",
    archived: false,
    created_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-02T00:00:00Z",
    fork: false,
    ...overrides,
  };
}

Deno.test("githubRepoLoader stores entries that validate against its schema", async () => {
  const fetchMock = mockFetchPages([
    [repoFixture()],
    [],
  ]);

  try {
    const entries = await loadEntries(
      githubRepoLoader({ username: "jake-walker" }),
    );

    if (entries.length !== 1) {
      throw new Error(`Expected 1 entry, got ${entries.length}`);
    }

    if (entries[0].id !== "jake-walker/example") {
      throw new Error(`Unexpected entry id: ${entries[0].id}`);
    }

    const parsed = z.parse(repoSchema, entries[0].data);

    if (parsed.id !== "123") {
      throw new Error(
        `Expected numeric API id to be coerced to a string, got ${parsed.id}`,
      );
    }

    if (
      !(parsed.created_at instanceof Date) ||
      !(parsed.pushed_at instanceof Date)
    ) {
      throw new Error("Expected date fields to be coerced to Date instances");
    }

    if (
      !fetchMock.requestedUrls.includes(
        "https://api.github.com/users/jake-walker/repos?page=1",
      )
    ) {
      throw new Error("Expected GitHub page 1 to be fetched");
    }
  } finally {
    fetchMock.restore();
  }
});

Deno.test("forgejoRepoLoader stores entries that validate against its schema", async () => {
  const fetchMock = mockFetchPages([
    [
      repoFixture({
        id: 456,
        full_name: "jake-walker/forgejo-example",
        html_url: "https://git.example.com/jake-walker/forgejo-example",
        name: "forgejo-example",
      }),
    ],
    [],
  ]);

  try {
    const entries = await loadEntries(
      forgejoRepoLoader({
        baseUrl: "https://git.example.com",
        username: "jake-walker",
      }),
    );

    if (entries.length !== 1) {
      throw new Error(`Expected 1 entry, got ${entries.length}`);
    }

    const parsed = z.parse(repoSchema, entries[0].data);

    if (parsed.id !== "456") {
      throw new Error(
        `Expected numeric API id to be coerced to a string, got ${parsed.id}`,
      );
    }

    if (
      !fetchMock.requestedUrls.includes(
        "https://git.example.com/api/v1/users/jake-walker/repos?page=1",
      )
    ) {
      throw new Error("Expected Forgejo page 1 to be fetched");
    }
  } finally {
    fetchMock.restore();
  }
});

Deno.test("githubRepoLoader allows repositories without a pushed_at timestamp", async () => {
  const fetchMock = mockFetchPages([
    [repoFixture({ pushed_at: undefined })],
    [],
  ]);

  try {
    const entries = await loadEntries(
      githubRepoLoader({ username: "jake-walker" }),
    );

    if (entries.length !== 1) {
      throw new Error(`Expected 1 entry, got ${entries.length}`);
    }

    const parsed = z.parse(repoSchema, entries[0].data);

    if (parsed.pushed_at !== null) {
      throw new Error(`Expected missing pushed_at to parse as null`);
    }
  } finally {
    fetchMock.restore();
  }
});
