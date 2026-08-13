/**
 * This module contains the main Astro content collection loader for the Ghost API.
 * It stores the fully processed Ghost post body in Astro's rendered content and
 * adds a `basicHtml` field to each post for feeds and other contexts where code
 * highlighting or image optimization are not wanted.
 *
 * @example
 * ```ts
 * import { ghostLoader } from "@jakew/astro-ghost-loader";
 *
 * export const collections = {
 *  ghostPosts: defineCollection({
 *    loader: ghostLoader({
 *      url: "https://ghost.example.com",
 *      contentApiKey: import.meta.env.GHOST_CONTENT_API_KEY,
 *      anchorRewrite: {
 *        hosts: {
 *          "ghost.example.com": "example.com"
 *        },
 *        ref: "site"
 *      }
 *    })
 *  })
 * };
 * ```
 *
 * @module
 */

import { TSGhostContentAPI } from "@ts-ghost/content-api";
import { postsSchema } from "./schema.ts";
import type { Post } from "./schema.ts";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import {
  type AnchorRewriteOptions,
  rehypeAnchorRewrite,
  rehypeCollectImages,
  rehypeGhostVideoCard,
  rehypeImages,
} from "./rehype.ts";
import type { AstroConfig } from "astro";
import { AstroError } from "astro/errors";
import type { Loader } from "astro/loaders";

type ApiVersion = InstanceType<typeof TSGhostContentAPI>["version"];

type GhostLoaderOptions = {
  url: string;
  contentApiKey: string;
  apiVersion?: ApiVersion;
  anchorRewrite?: AnchorRewriteOptions;
};

function createGhostBodyParser(
  opts?: AstroConfig,
  anchorRewrite?: AnchorRewriteOptions,
) {
  return unified().use(rehypeParse, { fragment: true })
    .use(rehypeAnchorRewrite, anchorRewrite)
    .use(rehypeCollectImages, opts?.image)
    .use(rehypeShiki, {
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
    })
    .use(rehypeImages)
    .use(rehypeGhostVideoCard)
    .use(rehypeStringify);
}

function createBasicGhostBodyParser(anchorRewrite?: AnchorRewriteOptions) {
  return unified().use(rehypeParse, { fragment: true })
    .use(rehypeAnchorRewrite, anchorRewrite)
    .use(rehypeGhostVideoCard)
    .use(rehypeStringify);
}

/**
 * Create a new Astro content collection loader for Ghost posts.
 *
 * It fetches all available posts in publish date descending order.
 * Post bodies are parsed twice: the main rendered content includes syntax
 * highlighting and Astro image metadata, while `data.basicHtml` only applies
 * lightweight Ghost-specific HTML cleanup.
 *
 * @param config Configuration for the loader. It is an object that must contain the URL to the Ghost instance, and a content API key found in the admin dashboard. The optional `anchorRewrite` setting can rewrite matching link hosts and `ref` query parameters in both rendered HTML outputs.
 * @returns {Loader} A loader for use in an Astro content collection config.
 */
export function ghostLoader({
  url,
  contentApiKey,
  apiVersion = "v6.0",
  anchorRewrite,
}: GhostLoaderOptions): Loader {
  const client = new TSGhostContentAPI(url, contentApiKey, apiVersion);

  return {
    name: "ghost-posts",
    schema: postsSchema,
    load: async (context) => {
      const { logger, parseData, store, config } = context;

      const parser = createGhostBodyParser(config, anchorRewrite);
      const basicParser = createBasicGhostBodyParser(anchorRewrite);

      logger.info("Fetching posts from Ghost Content API");

      const res = await client.posts.browse({
        order: "published_at DESC",
        include: ["authors", "tags"],
        limit: "all",
      }).fetch();

      if (!res.success) {
        throw new AstroError(
          `Failed to fetch Ghost posts: ${
            res.errors.map((e) => e.message).join(", ")
          }`,
        );
      }

      const posts = res.data;

      for (const post of posts) {
        const parsedPost = await parseData({
          id: post.id,
          data: post as Post,
        });

        const body = parsedPost.html.trim();
        const result = await parser.process(body);
        const basicResult = await basicParser.process(body);

        store.set({
          id: parsedPost.id,
          data: {
            ...parsedPost,
            basicHtml: String(basicResult.value),
          },
          rendered: {
            html: String(result.value),
            metadata: {
              imagePaths: [
                ...(result.data.astro?.localImagePaths || []),
                ...(result.data.astro?.remoteImagePaths || []),
              ],
            },
          },
          filePath: parsedPost.url,
        });
      }
    },
  };
}
