import type { Recipe } from '../src/app/recipe/recipe';

export const focaccia: Recipe = {
  id: 'focaccia-5e0c7a93d14b',
  title: 'Focaccia',
  folder: ['Baking', 'Bread'],
  tags: ['bread', 'weekend'],
  prep: '30 min, plus rising',
  notes: 'Better the next day, warmed through.',
  source: { text: '', link: 'https://cooking.nytimes.com/recipes/1017000-focaccia' },
  sizings: [{ id: 'a41c7e09d253', name: '8 squares' }],
  ingredients: [
    {
      group: '',
      items: [
        { item: 'strong white flour', quantities: [{ quantity: '500', unit: 'g' }] },
        { item: 'fast-action yeast', quantities: [{ quantity: '7', unit: 'g' }] },
        { item: 'warm water', quantities: [{ quantity: '400', unit: 'ml' }] },
      ],
    },
    {
      group: 'For the top',
      items: [
        { item: 'olive oil', quantities: [{ quantity: '4', unit: 'tbsp' }] },
        { item: 'rosemary', quantities: [{ quantity: '2', unit: 'sprigs' }] },
        { item: 'flaky salt', quantities: [{ quantity: '', unit: '' }] },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: [
        'Stir the flour, yeast and water into a wet dough, then leave it covered for an hour.',
        'Tip it into an oiled tray and stretch it to the corners.',
      ],
    },
    {
      group: 'To finish',
      steps: [
        'Dimple the dough, pour over the oil and scatter the rosemary and salt.',
        'Bake at 220°C for 25 minutes.',
      ],
    },
  ],
};

export const lemonTart: Recipe = {
  id: 'lemon-tart-6d2f94b0a1c8',
  title: 'Lemon tart',
  folder: ['Baking', 'Tarts'],
  tags: ['citrus', 'weekend'],
  prep: '1 hr, plus chilling',
  notes: 'Take it out while the middle still wobbles.',
  source: { text: 'The River Cafe Cook Book', link: '' },
  sizings: [
    { id: '5f2b90c3e6a1', name: '8 slices' },
    { id: 'd03b7a6e2f95', name: '12 slices' },
  ],
  ingredients: [
    {
      group: '',
      items: [
        {
          item: 'plain flour',
          quantities: [
            { quantity: '175', unit: 'g' },
            { quantity: '250', unit: 'g' },
          ],
        },
        {
          item: 'cold butter, diced',
          quantities: [
            { quantity: '100', unit: 'g' },
            { quantity: '150', unit: 'g' },
          ],
        },
        {
          item: 'icing sugar',
          quantities: [
            { quantity: '25', unit: 'g' },
            { quantity: '35', unit: 'g' },
          ],
        },
        {
          item: 'egg yolk',
          quantities: [
            { quantity: '1', unit: '' },
            { quantity: '2', unit: '' },
          ],
        },
      ],
    },
    {
      group: 'For the filling',
      items: [
        {
          item: 'lemons, zested and juiced',
          quantities: [
            { quantity: '4', unit: '' },
            { quantity: '6', unit: '' },
          ],
        },
        {
          item: 'eggs',
          quantities: [
            { quantity: '5', unit: '' },
            { quantity: '7', unit: '' },
          ],
        },
        {
          item: 'caster sugar',
          quantities: [
            { quantity: '150', unit: 'g' },
            { quantity: '225', unit: 'g' },
          ],
        },
        {
          item: 'double cream',
          quantities: [
            { quantity: '150', unit: 'ml' },
            { quantity: '225', unit: 'ml' },
          ],
        },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: [
        'Rub the butter into the flour and sugar, bind it with the yolk and chill it for 30 minutes.',
        'Line the tin with the pastry and bake it blind at 180°C for 20 minutes.',
        'Whisk the filling together, pour it into the case and bake at 140°C for 30 minutes.',
      ],
    },
  ],
};

export const shakshuka: Recipe = {
  id: 'shakshuka-a0c70106ff12',
  title: 'Shakshuka',
  folder: [],
  tags: ['eggs', 'spicy'],
  prep: '25 min',
  notes: 'Mop it up with yesterday’s bread.',
  source: { text: 'Mum', link: '' },
  sizings: [{ id: 'c8e3165d0b4f', name: 'For two' }],
  ingredients: [
    {
      group: '',
      items: [
        { item: 'olive oil', quantities: [{ quantity: '2', unit: 'tbsp' }] },
        { item: 'onion, sliced', quantities: [{ quantity: '1', unit: '' }] },
        { item: 'red pepper, sliced', quantities: [{ quantity: '1', unit: '' }] },
        { item: 'garlic, sliced', quantities: [{ quantity: '2', unit: 'cloves' }] },
        { item: 'chopped tomatoes', quantities: [{ quantity: '400', unit: 'g' }] },
        { item: 'eggs', quantities: [{ quantity: '4', unit: '' }] },
        { item: 'crusty bread', quantities: [{ quantity: '', unit: '' }] },
      ],
    },
    {
      group: 'To serve',
      items: [
        { item: 'feta', quantities: [{ quantity: '50', unit: 'g' }] },
        { item: 'parsley, chopped', quantities: [{ quantity: '', unit: '' }] },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: [
        'Soften the onion and pepper in the oil, then add the garlic.',
        'Tip in the tomatoes and simmer until thick.',
        'Make four wells, crack in the eggs, cover and cook until just set.',
      ],
    },
  ],
};

export const turkishEggs: Recipe = {
  id: 'turkish-eggs-92aa831cb740',
  title: 'Turkish eggs',
  folder: ['Brunch'],
  tags: ['eggs', 'quick'],
  prep: '15 min',
  notes: '',
  source: { text: '', link: '' },
  sizings: [{ id: '0d7a4be2f918', name: 'Two plates' }],
  ingredients: [
    {
      group: '',
      items: [
        { item: 'Greek yoghurt', quantities: [{ quantity: '250', unit: 'g' }] },
        { item: 'garlic, grated', quantities: [{ quantity: '1', unit: 'clove' }] },
        { item: 'eggs', quantities: [{ quantity: '4', unit: '' }] },
        { item: 'butter', quantities: [{ quantity: '40', unit: 'g' }] },
        { item: 'Aleppo pepper', quantities: [{ quantity: '1', unit: 'tsp' }] },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: [
        'Stir the garlic into the yoghurt and spread it over two plates.',
        'Poach the eggs and set them on the yoghurt.',
        'Melt the butter with the pepper until it foams, then spoon it over.',
      ],
    },
  ],
};

export const tarkaDal: Recipe = {
  id: 'tarka-dal-3b8e61f07c24',
  title: 'Tarka dal',
  folder: [],
  tags: ['lentils', 'weeknight'],
  prep: '40 min',
  notes: 'Thicker the next day. Loosen it with a splash of water.',
  source: { text: '', link: '' },
  sizings: [{ id: 'e59b0c7f3a62', name: '4 bowls' }],
  ingredients: [
    {
      group: '',
      items: [
        { item: 'red lentils, rinsed', quantities: [{ quantity: '250', unit: 'g' }] },
        { item: 'ground turmeric', quantities: [{ quantity: '1', unit: 'tsp' }] },
        { item: 'water', quantities: [{ quantity: '1', unit: 'l' }] },
      ],
    },
    {
      group: 'For the tarka',
      items: [
        { item: 'ghee', quantities: [{ quantity: '2', unit: 'tbsp' }] },
        { item: 'cumin seeds', quantities: [{ quantity: '1', unit: 'tsp' }] },
        { item: 'garlic, sliced', quantities: [{ quantity: '3', unit: 'cloves' }] },
        { item: 'dried red chillies', quantities: [{ quantity: '2', unit: '' }] },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: [
        'Simmer the lentils with the turmeric in the water until they collapse, about 25 minutes.',
        'Fry the cumin, garlic and chillies in the ghee until the garlic turns golden.',
        'Pour the tarka over the dal and stir it through at the table.',
      ],
    },
  ],
};

export const sodaBread: Recipe = {
  id: 'soda-bread-8e17c4a9b05d',
  title: 'Soda bread',
  folder: ['Baking', 'Bread'],
  tags: ['bread', 'quick'],
  prep: '50 min',
  notes: 'Best the day it is made.',
  source: { text: '', link: '' },
  sizings: [
    { id: '1a6d3f8e0c72', name: 'One loaf' },
    { id: '7c0e52b9d4a1', name: 'Two loaves' },
  ],
  ingredients: [
    {
      group: '',
      items: [
        {
          item: 'plain flour',
          quantities: [
            { quantity: '500', unit: 'g' },
            { quantity: '1', unit: 'kg' },
          ],
        },
        {
          item: 'bicarbonate of soda',
          quantities: [
            { quantity: '1', unit: 'tsp' },
            { quantity: '2', unit: 'tsp' },
          ],
        },
        {
          item: 'salt',
          quantities: [
            { quantity: '1', unit: 'tsp' },
            { quantity: '2', unit: 'tsp' },
          ],
        },
        {
          item: 'buttermilk',
          quantities: [
            { quantity: '400', unit: 'ml' },
            { quantity: '800', unit: 'ml' },
          ],
        },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: [
        'Mix the flour, soda and salt, then stir in the buttermilk to a soft dough.',
        'Shape each loaf into a round, cut a deep cross in the top and bake at 200°C for 35 minutes.',
      ],
    },
  ],
};

export const ragu: Recipe = {
  id: 'ragu-alla-bolognese-4c1e9a07b2d3',
  title: 'Ragù alla bolognese',
  folder: ['Pasta'],
  tags: ['slow', 'freezes'],
  prep: '3 hours',
  notes: 'Better the next day.',
  source: { text: 'Marcella Hazan', link: '' },
  sizings: [
    { id: '3f9a1c0b7d4e', name: 'One serving' },
    { id: '9d27e5b0c14a', name: '' },
    { id: 'b72c04e1a9f3', name: 'Full house' },
  ],
  ingredients: [
    {
      group: 'For the ragù',
      items: [
        {
          item: 'beef mince',
          quantities: [
            { quantity: '125', unit: 'g' },
            { quantity: '500', unit: 'g' },
            { quantity: '1.2', unit: 'kg' },
          ],
        },
        {
          item: 'chopped tomatoes',
          quantities: [
            { quantity: '½', unit: 'tin' },
            { quantity: '1', unit: 'tin' },
            { quantity: '3', unit: 'tins' },
          ],
        },
        {
          item: 'salt and black pepper, to taste',
          quantities: [
            { quantity: '', unit: '' },
            { quantity: '', unit: '' },
            { quantity: '', unit: '' },
          ],
        },
      ],
    },
    {
      group: 'To serve',
      items: [
        {
          item: 'tagliatelle',
          quantities: [
            { quantity: '100', unit: 'g' },
            { quantity: '400', unit: 'g' },
            { quantity: '1', unit: 'kg' },
          ],
        },
      ],
    },
  ],
  method: [
    {
      group: '',
      steps: ['Brown the mince in batches.', 'Add the tomatoes and simmer for three hours.'],
    },
  ],
};
