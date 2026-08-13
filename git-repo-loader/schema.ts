import { z } from "astro/zod";

const nullableDateSchema = z.preprocess(
  (value) =>
    value === null || value === undefined || value === "" ? null : value,
  z.coerce.date().nullable(),
);

export const repoSchema = z.object({
  id: z.coerce.string(),
  description: z.string().nullable(),
  full_name: z.string(),
  html_url: z.string(),
  language: z.string().nullable(),
  name: z.string(),
  archived: z.boolean(),
  created_at: z.coerce.date(),
  pushed_at: nullableDateSchema,
  fork: z.boolean(),
});

export type Repo = z.infer<typeof repoSchema>;
