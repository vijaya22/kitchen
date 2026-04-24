import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/*.{png,jpg,jpeg,webp}',
  { eager: true }
);

const captions: Record<string, string> = {
  'burrata-garden-sourdough-toast': 'Burrata Garden Sourdough Toast',
  'schezwan-chicken-toss': 'Schezwan Chicken Toss',
  'broccoli-egg-salad': 'Broccoli Egg Salad',
  'ghar-wali-kadhi': 'Ghar Wali Kadhi',
  'hot-sour-chicken-soup': 'Hot & Sour Chicken Soup',
  'cucumber-corn-salami-salad': 'Cucumber Corn Salami Salad',
  'home-style-chicken-curry': 'Home Style Chicken Curry',
  'papaya-carrot-crunch': 'Papaya Carrot Crunch',
  'salami-cheese-chilla': 'Salami Cheese Chilla',
  'adai-dosa-aloo-stuffing': 'Adai Dosa with Aloo Stuffing',
  'dal-chawal-with-aloo-bhujiya': 'Dal Chawal with Aloo Bhujia',
  'veg-noodles': 'Home-Style Veg Chow Noodles',
  'grapes-and-celery-salad': 'Celery & Grape Salad with Almonds and Shaved Manchego',
  'masala-dosa-with-eggs': 'Masala Dosa with Peanut Chutney and Boiled Eggs',
  'cucumber-sandwich': 'Cucumber Sandwiches with Herbed Cream Cheese Spread',
  'beetroot-sweetpotato-kebabs': 'Beetroot and Sweet Potato Kebabs',
  'poha': 'Poha Bowl with Pomegranate, Eggs & Banana',
  'veggie-salad': 'Warm Veggie Salad with Feta',
  'spinach-omlette': 'Spinach and Cheese Omelette Toast',
  'hotdog': 'Butter-Toasted Hot Dog with Caramelized Onions',
  'the-bear-omlette': 'The Bear Omelette',
  'bengali-fish-curry': 'Bengali Mustard Fish Curry',
  'pav-bhaji': 'Pav Bhaji',
  'aloo-gobhi-sabji-with-parantha': 'Aloo Gobhi Sabji with Ajwain-Kalonji Parantha',
  'summer-fruit-salad': 'Summer Fruit Salad',
  'chicken-salami-sandwich': 'Chicken Salami Sandwich with Mozzarella',
  'chole-bhature': 'Chole Bhature with Paneer',
  'aloo-curry-with-poori': 'Aloo Curry and Poori',
  'rice-paper-dumplings': 'Rice Paper Chicken Dumplings',
  'sunny-side-up-eggs': 'Sunny Side Up Eggs on Toast',
  'avacado-toast': 'Avocado Egg Toast',
  'moong-daal-khidchadi': 'Moong Dal Khichdi with Aloo Chokha',
  'matar-paneer-with-pulao': 'Matar Paneer with Spiced Pulao',
  'egg-mayo-toast': 'Egg Mayo Toast',
  'sattu-parantha-with-karela': 'Sattu Parantha with Karela Bhujia',
  'aloo-bhujiya-with-ajwain-parantha': 'Ajwain Parantha with Aloo Bhujia',
};

const order = [
  'burrata-garden-sourdough-toast',
  'schezwan-chicken-toss',
  'broccoli-egg-salad',
  'ghar-wali-kadhi',
  'hot-sour-chicken-soup',
  'cucumber-corn-salami-salad',
  'home-style-chicken-curry',
  'papaya-carrot-crunch',
  'salami-cheese-chilla',
  'adai-dosa-aloo-stuffing',
  'dal-chawal-with-aloo-bhujiya',
  'veg-noodles',
  'grapes-and-celery-salad',
  'masala-dosa-with-eggs',
  'cucumber-sandwich',
  'beetroot-sweetpotato-kebabs',
  'poha',
  'veggie-salad',
  'spinach-omlette',
  'hotdog',
  'the-bear-omlette',
  'bengali-fish-curry',
  'pav-bhaji',
  'aloo-gobhi-sabji-with-parantha',
  'summer-fruit-salad',
  'chicken-salami-sandwich',
  'chole-bhature',
  'aloo-curry-with-poori',
  'rice-paper-dumplings',
  'sunny-side-up-eggs',
  'avacado-toast',
  'moong-daal-khidchadi',
  'matar-paneer-with-pulao',
  'egg-mayo-toast',
  'sattu-parantha-with-karela',
  'aloo-bhujiya-with-ajwain-parantha',
];

const byBase: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split('/').pop()!;
  const base = file.replace(/\.[^.]+$/, '');
  byBase[base] = mod.default;
}

export const gallery = order
  .filter((base) => byBase[base])
  .map((base) => ({ image: byBase[base], alt: captions[base] ?? base }));
