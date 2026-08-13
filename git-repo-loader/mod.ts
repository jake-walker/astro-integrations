/**
 * This module contains the main Astro content collection loader for various Git hosts.
 *
 * All the Git repo loaders output the same schema for repository listings.
 *
 * @example
 * ```ts
 * import { githubRepoLoader, forgejoRepoLoader } from "@jakew/astro-git-repo-loader";
 *
 * export const collections = {
 *   githubRepos: defineCollection({
 *     loader: githubRepoLoader({
 *       username: "jake-walker"
 *     })
 *   }),
 *   forgejoRepos: defineCollection({
 *     loader: forgejoRepoLoader({
 *       baseUrl: "https://forgejo.example.com",
 *       username: "jake-walker"
 *     })
 *   })
 * };
 * ```
 *
 * @module
 */

import { z } from "astro/zod";
import type { Loader } from "astro/loaders";

const RepoSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  full_name: z.string(),
  html_url: z.string(),
  language: z.string().nullable(),
  name: z.string(),
  archived: z.boolean(),
  created_at: z.coerce.date(),
  pushed_at: z.coerce.date(),
  fork: z.boolean(),
});

/**
 * Create a new Astro content collection loader for GitHub repositories of a user.
 *
 * It fetches all available repositores for a given user in no particular order.
 *
 * @param config Configuration for the loader. It is an object that must contain a username, and can optionally include an API key for higher rate limits.
 * @returns {Loader} A loader for use in an Astro content collection config.
 */
export function githubRepoLoader(
  { apiKey, username }: { apiKey?: string; username: string },
): Loader {
  const headers: HeadersInit = {
    "X-GitHub-Api-Version": "2022-11-28",
    "Accept": "application/vnd.github+json",
  };

  if (apiKey !== undefined) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return {
    name: "github-repos",
    schema: RepoSchema,
    load: async ({ store }) => {
      let page = 1;

      while (true) {
        const res = await fetch(
          `https://api.github.com/users/${username}/repos?page=${page}`,
          {
            headers,
          },
        );

        if (!res.ok) {
          break;
        }

        const resJson = await res.json();

        if (resJson.length == 0) {
          break;
        }

        for (const item of resJson) {
          const repo = z.parse(RepoSchema, item);

          store.set({
            id: repo.full_name,
            data: repo,
          });
        }

        page++;
      }
    },
  };
}

/**
 * Create a new Astro content collection loader for Forgejo repositories of a user.
 *
 * It fetches all available repositores for a given user in no particular order.
 *
 * @param config Configuration for the loader. It is an object that must contain a username and URL to the Forgejo instance.
 * @returns {Loader} A loader for use in an Astro content collection config.
 */
export function forgejoRepoLoader(
  { baseUrl, username }: { baseUrl: string; username: string },
): Loader {
  return {
    name: "forgejo-repos",
    schema: RepoSchema,
    load: async ({ store }) => {
      let page = 1;

      while (true) {
        const res = await fetch(
          new URL(`/api/v1/users/${username}/repos?page=${page}`, baseUrl),
        );

        if (!res.ok) {
          break;
        }

        const resJson = await res.json();

        if (resJson.length == 0) {
          break;
        }

        for (const item of resJson) {
          const repo = z.parse(RepoSchema, item);

          store.set({
            id: repo.full_name,
            data: repo,
          });
        }

        page++;
      }
    },
  };
}
