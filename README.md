# Vijaya's Kitchen

A static recipe site at **[kitchen.vijaya.io](https://kitchen.vijaya.io)** — a personal collection of home-cooked recipes built with [Astro](https://astro.build).

## Features

- Recipes authored in markdown with typed frontmatter (Astro content collections)
- Build-time image optimization via `astro:assets` (WebP, responsive sizes)
- Photo gallery on the homepage and a dedicated `/gallery` page
- Tag-based filtering, search, and "you might also like" related recipes
- Saved/favorite recipes (localStorage)
- Recipe `JSON-LD` schema (with ingredients, instructions, prep/cook time, cuisine, category, nutrition) for Google rich results
- `BreadcrumbList` schema and a sitemap for SEO
- RSS feed at `/rss.xml`
- Open Graph + Twitter card meta tags
- Light / dark mode
- View Transitions for smooth page navigation
- Newsletter signup (Substack) and a tip jar (Buy Me a Coffee)
- Comments via Giscus
- GitHub Pages deploy via Actions

## Project structure

```
.
├── public/                # static assets served as-is
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── assets/images/     # optimized through astro:assets
│   ├── components/        # Gallery, Newsletter, TipJar
│   ├── content/
│   │   ├── config.ts      # content collection schema
│   │   └── recipes/       # one .md per recipe
│   ├── layouts/Layout.astro
│   └── pages/
│       ├── index.astro          # homepage
│       ├── about.astro
│       ├── gallery.astro
│       ├── request.astro        # request-a-recipe form (Web3Forms)
│       ├── rss.xml.ts
│       └── recipes/[id].astro   # dynamic recipe page
├── astro.config.mjs
└── package.json
```

## Adding a recipe

1. Drop the image in `src/assets/images/` (kebab-case `.webp` preferred — convert from PNG with `cwebp -q 85 in.png -o out.webp`)
2. Create `src/content/recipes/<slug>.md` with frontmatter:

   ```md
   ---
   title: My Recipe
   description: One-line summary.
   date: 2026-04-25
   time: 30 mins
   prepTime: 10 mins
   cookTime: 20 mins
   servings: "2"
   tags: [indian, vegetarian, quick]
   category: Main Course           # optional, falls back to derived
   calories: "350 kcal"
   protein: "12g"
   image: ../../assets/images/my-recipe.webp
   ---

   ## Ingredients

   - item one
   - item two

   ## Method

   1. First step.
   2. Second step.

   ---

   **Tips:** Optional notes block.
   ```

The recipe automatically appears in the homepage list, gallery, RSS, and search.

## Commands

```sh
bun install        # install dependencies
bun run dev        # local dev server (localhost:4321)
bun run build      # production build → dist/
bun run preview    # preview the production build
```

## Deployment

`main` is auto-deployed to GitHub Pages via `.github/workflows/deploy.yml`. The custom domain `kitchen.vijaya.io` is configured through `public/CNAME`.

## License

MIT — see [LICENSE](./LICENSE).
