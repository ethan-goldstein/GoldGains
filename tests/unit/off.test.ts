import { describe, expect, it } from 'vitest';
import { parseServingText, productToFood, type OffProduct } from '@/sources/off';
import { rank } from '@/sources/search';
import type { Food } from '@/domain/food';

// Shapes recorded from the Open Food Facts v2 API (masses in grams; energy-kcal in kcal).
const CEREAL: OffProduct = {
  code: '016000275287',
  product_name: 'Cheerios',
  brands: 'General Mills, Cheerios',
  serving_size: '1.5 cup (39 g)',
  serving_quantity: 39,
  nutrition_data_per: '100g',
  nutriments: {
    'energy-kcal_100g': 359,
    proteins_100g: 12.8,
    carbohydrates_100g: 74.4,
    fiber_100g: 10.3,
    sugars_100g: 5.13,
    'added-sugars_100g': 5.13,
    fat_100g: 6.41,
    'saturated-fat_100g': 1.28,
    sodium_100g: 0.538,
    iron_100g: 0.0323,
    'vitamin-d_100g': 0.0000051,
  },
  image_front_small_url: 'https://images.openfoodfacts.org/images/products/001/600/027/5287/front_en.200.jpg',
};

const SODA_KJ: OffProduct = {
  code: '5449000000996',
  product_name: 'Coca-Cola',
  brands: 'Coca-Cola',
  serving_size: '330 ml',
  serving_quantity: '330',
  serving_quantity_unit: 'ml',
  nutriments: { energy_100g: 180, carbohydrates_100g: 10.6, sugars_100g: 10.6, sodium_100g: '0' },
};

describe('Open Food Facts mapping', () => {
  it('maps a per-100g product to a per-serving food in our units', () => {
    const f = productToFood(CEREAL)!;
    expect(f.name).toBe('Cheerios');
    expect(f.brand).toBe('General Mills');
    expect(f.barcode).toBe('0016000275287');
    expect(f.serving).toEqual({ qty: 1.5, unit: 'cup', grams: 39 });
    expect(f.nutrients.kcal).toBeCloseTo(140, 0);
    expect(f.nutrients.sodium).toBeCloseTo(0.538 * 1000 * 0.39, 1); // mg
    expect(f.nutrients.iron).toBeCloseTo(32.3 * 0.39, 1); // mg
    expect(f.nutrients.vitD).toBeCloseTo(5.1 * 0.39, 1); // µg
    expect(f.imageUrl).toMatch(/^https:\/\/images\.openfoodfacts\.org\//);
  });

  it('falls back to kJ and handles drinks in ml', () => {
    const f = productToFood(SODA_KJ)!;
    expect(f.baseUnit).toBe('ml');
    expect(f.serving).toEqual({ qty: 330, unit: 'ml', grams: 330 });
    expect(f.nutrients.kcal).toBeCloseTo((180 / 4.184) * 3.3, 0);
    expect(f.nutrients.sodium).toBe(0);
  });

  it('rejects products with no name or no nutrition', () => {
    expect(productToFood({ code: '1', nutriments: { 'energy-kcal_100g': 10 } })).toBeNull();
    expect(productToFood({ code: '1', product_name: 'Mystery', nutriments: {} })).toBeNull();
  });

  it('ignores images from other hosts', () => {
    expect(productToFood({ ...CEREAL, image_front_small_url: 'https://evil.example/x.jpg' })!.imageUrl).toBeUndefined();
  });

  it('parses serving text', () => {
    expect(parseServingText('2/3 cup (55 g)')).toEqual({ qty: 2 / 3, unit: 'cup' });
    expect(parseServingText('1 1/2 cups')).toEqual({ qty: 1.5, unit: 'cups' });
    expect(parseServingText('1 bar')).toEqual({ qty: 1, unit: 'bar' });
  });
});

describe('local search ranking', () => {
  const mk = (name: string, extra: Partial<Food & { aliases: string }> = {}) =>
    ({ id: name, name, source: 'usda', serving: { qty: 100, unit: 'g', grams: 100 }, nutrients: {}, favorite: 0, useCount: 0, createdAt: 0, updatedAt: 0, ...extra }) as Food & { aliases?: string };
  const foods = [mk('Chicken breast, cooked'), mk('Chicken thigh, cooked'), mk('Chickpeas, cooked'), mk('Egg', { aliases: 'eggs large whole' }), mk('Eggs, scrambled')];
  it('prefix-matches every word and ranks name starts first', () => {
    expect(rank(foods, 'chick breast')[0]!.name).toBe('Chicken breast, cooked');
    expect(rank(foods, 'egg').map((f) => f.name)[0]).toBe('Egg');
    expect(rank(foods, 'whole egg')[0]!.name).toBe('Egg');
    expect(rank(foods, 'salmon')).toEqual([]);
  });
});
