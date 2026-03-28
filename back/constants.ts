import type { QuestionCategory } from './types';

export const MAX_PLAYERS = 10;

export const CATEGORY_PROMPTS: Record<QuestionCategory, string> = {
  color: 'What is the color of this wine?',
  country: 'From which country or region does this wine come?',
  grape_variety: 'What is the grape variety of this wine?',
  vintage_year: 'What is the vintage year of this wine?',
  wine_name: 'What is the name of this wine?',
};

export const ADJECTIVES = [
  'Tannic', 'Fruity', 'Oaky', 'Crisp', 'Bold',
  'Silky', 'Robust', 'Floral', 'Velvety', 'Mineral',
  'Earthy', 'Smoky', 'Spicy', 'Zesty', 'Plummy',
  'Dry', 'Elegant', 'Lush', 'Round', 'Supple',
  'Bright', 'Aromatic', 'Creamy', 'Juicy', 'Mellow',
];

export const NOUNS = [
  'Barrel', 'Vine', 'Cork', 'Cellar', 'Magnum',
  'Chateau', 'Bouquet', 'Tannin', 'Grape', 'Carafe',
  'Terroir', 'Decanter', 'Cuvee', 'Merlot', 'Pinot',
  'Riesling', 'Cabernet', 'Chardonnay', 'Sommelier', 'Champagne',
  'Bordeaux', 'Nectar', 'Domaine', 'Harvest', 'Vintage',
];
