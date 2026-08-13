import { z } from "astro/zod";

const ghostVisibilitySchema = z.union([
  z.literal("public"),
  z.literal("members"),
  z.literal("none"),
  z.literal("internal"),
  z.literal("paid"),
  z.literal("tiers"),
]);

const ghostIdentitySchema = z.object({
  slug: z.string(),
  id: z.string(),
});

const ghostMetadataSchema = z.object({
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
});

const authorsSchema = z.object({
  ...ghostIdentitySchema.shape,
  ...ghostMetadataSchema.shape,
  name: z.string(),
  profile_image: z.string().nullable(),
  cover_image: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  facebook: z.string().nullable(),
  twitter: z.string().nullable(),
  count: z
    .object({
      posts: z.number(),
    })
    .optional(),
  url: z.string().nullable().optional(),
});

const postsAuthorSchema = authorsSchema.extend({
  url: z.string().nullish(),
});

const ghostCodeInjectionSchema = z.object({
  codeinjection_head: z.string().nullable(),
  codeinjection_foot: z.string().nullable(),
});

const ghostSocialMediaSchema = z.object({
  og_image: z.string().nullable(),
  og_title: z.string().nullable(),
  og_description: z.string().nullable(),
  twitter_image: z.string().nullable(),
  twitter_title: z.string().nullable(),
  twitter_description: z.string().nullable(),
});

const tagsSchema = z.object({
  ...ghostIdentitySchema.shape,
  ...ghostMetadataSchema.shape,
  ...ghostCodeInjectionSchema.shape,
  ...ghostSocialMediaSchema.shape,
  name: z.string(),
  description: z.string().nullable(),
  feature_image: z.string().nullable(),
  visibility: ghostVisibilitySchema,
  canonical_url: z.string().nullable(),
  accent_color: z.string().nullable(),
  url: z.string(),
  count: z
    .object({
      posts: z.number(),
    })
    .optional(),
});

export const postsSchema = z.object({
  ...ghostIdentitySchema.shape,
  ...ghostMetadataSchema.shape,
  title: z.string(),
  html: z.string().catch(""),
  basicHtml: z.string().optional(),
  plaintext: z.string().nullish(),
  comment_id: z.string().nullable(),
  feature_image: z.string().nullable(),
  feature_image_alt: z.string().nullable(),
  feature_image_caption: z.string().nullable(),
  featured: z.boolean(),
  custom_excerpt: z.string().nullable(),
  ...ghostCodeInjectionSchema.shape,
  ...ghostSocialMediaSchema.shape,
  visibility: ghostVisibilitySchema,
  custom_template: z.string().nullable(),
  canonical_url: z.string().nullable(),
  authors: z.array(postsAuthorSchema).optional(),
  tags: z.array(tagsSchema).optional(),
  primary_author: postsAuthorSchema.nullish(),
  primary_tag: tagsSchema.nullish(),
  url: z.string(),
  excerpt: z.string().catch(""),
  reading_time: z.number().optional().default(0),
  created_at: z.string(),
  updated_at: z.string().nullish(),
  published_at: z.string().nullish(),
  access: z.boolean(),
  comments: z.boolean(),
  email_subject: z.string().nullish(),
});

export type Post = z.infer<typeof postsSchema>;
