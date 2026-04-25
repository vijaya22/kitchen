import { defineCollection, z } from 'astro:content';

const recipes = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    servings: z.string().optional(),
    time: z.string().optional(),
    prepTime: z.string().optional(),
    cookTime: z.string().optional(),
    category: z.string().optional(),
    calories: z.string().optional(),
    protein: z.string().optional(),
    image: image().optional(),
  }),
});

export const collections = { recipes };
