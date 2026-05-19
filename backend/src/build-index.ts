import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES_DIR = join(here, '..', '..', 'frontend', 'src', 'content', 'recipes');
const OUT_PATH = join(here, 'recipe-index.json');

type Recipe = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  time?: string;
  servings?: string;
  category?: string;
  ingredients: string[];
};

function parseFrontmatter(src: string): { data: Record<string, unknown>; body: string } {
  const match = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: src };
  const [, raw, body] = match;
  const data: Record<string, unknown> = {};
  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) { i++; continue; }
    const [, key, rest] = kv;
    const value = rest.trim();
    if (value === '' || value === '[' || value.startsWith('- ')) {
      // skip nested blocks (affiliateProducts etc.)
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].startsWith('- '))) i++;
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, '');
    }
    i++;
  }
  return { data, body };
}

function extractIngredients(body: string): string[] {
  const ingredientsHeader = body.match(/## Ingredients\s*\n([\s\S]*?)(?=\n## |\n---|\n$)/);
  if (!ingredientsHeader) return [];
  const section = ingredientsHeader[1];
  const items: string[] = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) items.push(m[1].trim());
  }
  return items;
}

function buildIndex(): Recipe[] {
  const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.md'));
  const recipes: Recipe[] = [];
  for (const file of files) {
    const src = readFileSync(join(RECIPES_DIR, file), 'utf8');
    const { data, body } = parseFrontmatter(src);
    const slug = file.replace(/\.md$/, '');
    recipes.push({
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ''),
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      time: data.time ? String(data.time) : undefined,
      servings: data.servings ? String(data.servings) : undefined,
      category: data.category ? String(data.category) : undefined,
      ingredients: extractIngredients(body),
    });
  }
  return recipes.sort((a, b) => a.slug.localeCompare(b.slug));
}

const index = buildIndex();
writeFileSync(OUT_PATH, JSON.stringify(index, null, 2));
console.log(`Wrote ${index.length} recipes to ${OUT_PATH}`);
