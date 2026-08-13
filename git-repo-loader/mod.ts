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

import type { Loader } from "astro/loaders";
import { z } from "astro/zod";
import { type Repo, repoSchema } from "./schema.ts";

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
    schema: repoSchema,
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
          const repo: Repo = z.parse(repoSchema, item);

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
    schema: repoSchema,
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
          const repo: Repo = z.parse(repoSchema, item);

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
