import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: URL }) {
  const recipes = (await getCollection('recipes')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: "Vijaya's Kitchen",
    description: 'A bright little recipe zine with bold flavors, quick weeknight staples, and comfort food.',
    site: context.site,
    items: recipes.map((recipe) => ({
      title: recipe.data.title,
      description: recipe.data.description,
      pubDate: recipe.data.date,
      link: `/recipes/${recipe.id.replace(/\.md$/, '')}/`,
    })),
  });
}
