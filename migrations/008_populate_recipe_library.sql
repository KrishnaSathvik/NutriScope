-- ============================================================================
-- POPULATE RECIPE LIBRARY
-- Pre-built recipes for different goals and cuisines
-- ============================================================================

-- Clear existing data (optional - comment out if you want to keep existing recipes)
-- DELETE FROM recipe_library;

-- ============================================================================
-- LOSE WEIGHT RECIPES
-- ============================================================================

-- Indian - Lose Weight
INSERT INTO recipe_library (name, description, goal_type, cuisine, servings, prep_time, cook_time, instructions, nutrition_per_serving, ingredients, tags) VALUES
('Grilled Chicken Tikka', 'Lean protein-rich Indian dish perfect for weight loss', 'lose_weight', 'indian', 4, 15, 20, 
'1. Marinate chicken pieces in yogurt, lemon juice, turmeric, garam masala, and ginger-garlic paste for 2 hours.
2. Thread chicken onto skewers and grill for 15-20 minutes until cooked through.
3. Serve with mint chutney and a side of cucumber salad.',
'{"calories": 180, "protein": 28, "carbs": 3, "fats": 6}'::jsonb,
'[{"name": "Chicken breast", "quantity": 500, "unit": "g"}, {"name": "Greek yogurt", "quantity": 100, "unit": "g"}, {"name": "Lemon juice", "quantity": 2, "unit": "tbsp"}, {"name": "Turmeric", "quantity": 1, "unit": "tsp"}, {"name": "Garam masala", "quantity": 1, "unit": "tsp"}]'::jsonb,
ARRAY['high-protein', 'low-calorie', 'grilled']),

('Dal Tadka', 'Protein-rich lentil curry, perfect for weight loss', 'lose_weight', 'indian', 4, 10, 25,
'1. Pressure cook yellow lentils (toor dal) with turmeric until soft.
2. Heat oil in a pan, add cumin seeds, garlic, and onions.
3. Add tomatoes, spices, and cooked dal. Simmer for 10 minutes.
4. Garnish with cilantro and serve hot.',
'{"calories": 150, "protein": 10, "carbs": 22, "fats": 3}'::jsonb,
'[{"name": "Yellow lentils (toor dal)", "quantity": 200, "unit": "g"}, {"name": "Onion", "quantity": 1, "unit": "piece"}, {"name": "Tomato", "quantity": 2, "unit": "piece"}, {"name": "Ginger-garlic paste", "quantity": 1, "unit": "tbsp"}, {"name": "Turmeric", "quantity": 0.5, "unit": "tsp"}]'::jsonb,
ARRAY['vegetarian', 'high-protein', 'low-fat']),

-- Italian - Lose Weight
('Grilled Mediterranean Chicken', 'Lean chicken with Italian herbs and vegetables', 'lose_weight', 'italian', 4, 15, 25,
'1. Marinate chicken breasts in olive oil, lemon, oregano, and garlic.
2. Grill chicken for 6-7 minutes per side until cooked.
3. Serve with roasted bell peppers and zucchini.',
'{"calories": 220, "protein": 32, "carbs": 5, "fats": 8}'::jsonb,
'[{"name": "Chicken breast", "quantity": 600, "unit": "g"}, {"name": "Olive oil", "quantity": 2, "unit": "tbsp"}, {"name": "Lemon", "quantity": 1, "unit": "piece"}, {"name": "Oregano", "quantity": 1, "unit": "tbsp"}, {"name": "Bell peppers", "quantity": 2, "unit": "piece"}]'::jsonb,
ARRAY['high-protein', 'mediterranean', 'grilled']),

('Caprese Salad', 'Fresh Italian salad with mozzarella and tomatoes', 'lose_weight', 'italian', 2, 10, 0,
'1. Slice fresh mozzarella and tomatoes.
2. Arrange on a plate with fresh basil leaves.
3. Drizzle with balsamic vinegar and olive oil.
4. Season with salt and pepper.',
'{"calories": 180, "protein": 12, "carbs": 8, "fats": 12}'::jsonb,
'[{"name": "Fresh mozzarella", "quantity": 200, "unit": "g"}, {"name": "Tomatoes", "quantity": 300, "unit": "g"}, {"name": "Fresh basil", "quantity": 10, "unit": "leaves"}, {"name": "Olive oil", "quantity": 1, "unit": "tbsp"}, {"name": "Balsamic vinegar", "quantity": 1, "unit": "tbsp"}]'::jsonb,
ARRAY['vegetarian', 'fresh', 'low-calorie']),

-- American - Lose Weight
('Grilled Chicken Salad', 'Healthy American-style grilled chicken salad', 'lose_weight', 'american', 2, 10, 15,
'1. Season chicken breast with salt, pepper, and paprika.
2. Grill chicken for 6-7 minutes per side.
3. Toss mixed greens with cherry tomatoes, cucumber, and red onion.
4. Top with sliced grilled chicken and light vinaigrette.',
'{"calories": 250, "protein": 35, "carbs": 10, "fats": 8}'::jsonb,
'[{"name": "Chicken breast", "quantity": 300, "unit": "g"}, {"name": "Mixed greens", "quantity": 200, "unit": "g"}, {"name": "Cherry tomatoes", "quantity": 150, "unit": "g"}, {"name": "Cucumber", "quantity": 100, "unit": "g"}, {"name": "Olive oil", "quantity": 1, "unit": "tbsp"}]'::jsonb,
ARRAY['high-protein', 'salad', 'low-calorie']),

-- Mexican - Lose Weight
('Grilled Fish Tacos', 'Light and healthy fish tacos with fresh salsa', 'lose_weight', 'mexican', 4, 20, 15,
'1. Season white fish fillets with lime, cumin, and chili powder.
2. Grill fish for 4-5 minutes per side.
3. Make fresh salsa with tomatoes, onions, cilantro, and lime.
4. Serve in corn tortillas with shredded cabbage.',
'{"calories": 280, "protein": 28, "carbs": 25, "fats": 8}'::jsonb,
'[{"name": "White fish fillets", "quantity": 500, "unit": "g"}, {"name": "Corn tortillas", "quantity": 8, "unit": "piece"}, {"name": "Tomatoes", "quantity": 200, "unit": "g"}, {"name": "Red onion", "quantity": 50, "unit": "g"}, {"name": "Cilantro", "quantity": 10, "unit": "g"}, {"name": "Lime", "quantity": 2, "unit": "piece"}]'::jsonb,
ARRAY['high-protein', 'seafood', 'fresh']),

-- Mediterranean - Lose Weight
('Greek Chicken Bowl', 'Mediterranean-inspired healthy bowl', 'lose_weight', 'mediterranean', 2, 15, 20,
'1. Marinate chicken in lemon, oregano, and garlic.
2. Grill chicken and slice.
3. Serve over quinoa with cucumber, tomatoes, olives, and feta.
4. Drizzle with olive oil and lemon juice.',
'{"calories": 420, "protein": 38, "carbs": 35, "fats": 14}'::jsonb,
'[{"name": "Chicken breast", "quantity": 300, "unit": "g"}, {"name": "Quinoa", "quantity": 100, "unit": "g"}, {"name": "Cucumber", "quantity": 100, "unit": "g"}, {"name": "Cherry tomatoes", "quantity": 100, "unit": "g"}, {"name": "Feta cheese", "quantity": 50, "unit": "g"}, {"name": "Olives", "quantity": 30, "unit": "g"}]'::jsonb,
ARRAY['high-protein', 'balanced', 'mediterranean']);

-- ============================================================================
-- GAIN MUSCLE RECIPES
-- ============================================================================

-- Indian - Gain Muscle
INSERT INTO recipe_library (name, description, goal_type, cuisine, servings, prep_time, cook_time, instructions, nutrition_per_serving, ingredients, tags) VALUES
('Chicken Curry with Rice', 'High-protein Indian curry perfect for muscle building', 'gain_muscle', 'indian', 4, 20, 30,
'1. Heat oil and sauté onions until golden.
2. Add ginger-garlic paste, tomatoes, and spices.
3. Add chicken pieces and cook until tender.
4. Serve with basmati rice.',
'{"calories": 520, "protein": 42, "carbs": 45, "fats": 18}'::jsonb,
'[{"name": "Chicken thighs", "quantity": 800, "unit": "g"}, {"name": "Basmati rice", "quantity": 300, "unit": "g"}, {"name": "Onion", "quantity": 2, "unit": "piece"}, {"name": "Tomatoes", "quantity": 3, "unit": "piece"}, {"name": "Coconut milk", "quantity": 200, "unit": "ml"}, {"name": "Garam masala", "quantity": 2, "unit": "tsp"}]'::jsonb,
ARRAY['high-protein', 'high-calorie', 'muscle-building']),

('Paneer Tikka Masala', 'High-protein vegetarian option for muscle gain', 'gain_muscle', 'indian', 4, 15, 25,
'1. Marinate paneer cubes in yogurt and spices.
2. Pan-fry paneer until golden.
3. Make creamy tomato-based gravy.
4. Add paneer to gravy and simmer. Serve with naan.',
'{"calories": 480, "protein": 28, "carbs": 35, "fats": 24}'::jsonb,
'[{"name": "Paneer", "quantity": 500, "unit": "g"}, {"name": "Heavy cream", "quantity": 200, "unit": "ml"}, {"name": "Tomatoes", "quantity": 400, "unit": "g"}, {"name": "Cashews", "quantity": 50, "unit": "g"}, {"name": "Garam masala", "quantity": 2, "unit": "tsp"}]'::jsonb,
ARRAY['vegetarian', 'high-protein', 'high-calorie']),

-- Italian - Gain Muscle
('Chicken Parmesan', 'High-protein Italian classic for muscle building', 'gain_muscle', 'italian', 4, 20, 35,
'1. Bread chicken breasts with breadcrumbs and parmesan.
2. Pan-fry until golden, then top with marinara and mozzarella.
3. Bake until cheese is melted.
4. Serve with whole wheat pasta.',
'{"calories": 580, "protein": 48, "carbs": 42, "fats": 22}'::jsonb,
'[{"name": "Chicken breast", "quantity": 600, "unit": "g"}, {"name": "Whole wheat pasta", "quantity": 300, "unit": "g"}, {"name": "Mozzarella cheese", "quantity": 200, "unit": "g"}, {"name": "Marinara sauce", "quantity": 400, "unit": "ml"}, {"name": "Parmesan cheese", "quantity": 50, "unit": "g"}]'::jsonb,
ARRAY['high-protein', 'high-calorie', 'classic']),

('Beef Lasagna', 'Protein-rich Italian lasagna for muscle building', 'gain_muscle', 'italian', 6, 30, 45,
'1. Cook ground beef with onions and garlic.
2. Layer lasagna noodles with meat sauce, ricotta, and mozzarella.
3. Repeat layers and top with cheese.
4. Bake for 45 minutes until bubbly.',
'{"calories": 520, "protein": 35, "carbs": 38, "fats": 24}'::jsonb,
'[{"name": "Ground beef", "quantity": 600, "unit": "g"}, {"name": "Lasagna noodles", "quantity": 300, "unit": "g"}, {"name": "Ricotta cheese", "quantity": 400, "unit": "g"}, {"name": "Mozzarella cheese", "quantity": 300, "unit": "g"}, {"name": "Marinara sauce", "quantity": 500, "unit": "ml"}]'::jsonb,
ARRAY['high-protein', 'high-calorie', 'comfort-food']),

-- American - Gain Muscle
('Protein-Packed Burger', 'High-protein burger for muscle building', 'gain_muscle', 'american', 4, 15, 20,
'1. Mix ground beef with egg and breadcrumbs.
2. Form patties and grill for 5-6 minutes per side.
3. Serve on whole wheat buns with cheese, lettuce, and tomato.
4. Add avocado for extra healthy fats.',
'{"calories": 620, "protein": 45, "carbs": 35, "fats": 32}'::jsonb,
'[{"name": "Ground beef (80/20)", "quantity": 600, "unit": "g"}, {"name": "Whole wheat buns", "quantity": 4, "unit": "piece"}, {"name": "Cheddar cheese", "quantity": 150, "unit": "g"}, {"name": "Avocado", "quantity": 200, "unit": "g"}, {"name": "Lettuce", "quantity": 100, "unit": "g"}]'::jsonb,
ARRAY['high-protein', 'high-calorie', 'classic']),

-- Mexican - Gain Muscle
('Beef Burrito Bowl', 'High-protein Mexican bowl for muscle building', 'gain_muscle', 'mexican', 2, 15, 25,
'1. Season and cook ground beef with taco spices.
2. Layer brown rice, black beans, beef, cheese, and salsa.
3. Top with avocado, sour cream, and cilantro.
4. Serve hot.',
'{"calories": 680, "protein": 52, "carbs": 55, "fats": 28}'::jsonb,
'[{"name": "Ground beef", "quantity": 400, "unit": "g"}, {"name": "Brown rice", "quantity": 200, "unit": "g"}, {"name": "Black beans", "quantity": 200, "unit": "g"}, {"name": "Cheddar cheese", "quantity": 100, "unit": "g"}, {"name": "Avocado", "quantity": 150, "unit": "g"}, {"name": "Sour cream", "quantity": 60, "unit": "g"}]'::jsonb,
ARRAY['high-protein', 'high-calorie', 'balanced']),

-- Mediterranean - Gain Muscle
('Grilled Lamb Kebabs', 'High-protein Mediterranean kebabs', 'gain_muscle', 'mediterranean', 4, 20, 20,
'1. Marinate lamb chunks in yogurt, lemon, and Mediterranean spices.
2. Thread onto skewers with bell peppers and onions.
3. Grill for 10-12 minutes, turning occasionally.
4. Serve with tzatziki and pita bread.',
'{"calories": 540, "protein": 48, "carbs": 25, "fats": 26}'::jsonb,
'[{"name": "Lamb leg", "quantity": 800, "unit": "g"}, {"name": "Greek yogurt", "quantity": 200, "unit": "g"}, {"name": "Bell peppers", "quantity": 2, "unit": "piece"}, {"name": "Red onion", "quantity": 1, "unit": "piece"}, {"name": "Pita bread", "quantity": 4, "unit": "piece"}]'::jsonb,
ARRAY['high-protein', 'high-calorie', 'mediterranean']);

-- ============================================================================
-- GAIN WEIGHT RECIPES
-- ============================================================================

-- Indian - Gain Weight
INSERT INTO recipe_library (name, description, goal_type, cuisine, servings, prep_time, cook_time, instructions, nutrition_per_serving, ingredients, tags) VALUES
('Butter Chicken', 'Rich and creamy Indian curry perfect for weight gain', 'gain_weight', 'indian', 4, 20, 30,
'1. Marinate chicken in yogurt and spices overnight.
2. Cook chicken in butter and cream-based gravy.
3. Simmer until chicken is tender and sauce is rich.
4. Serve with naan and basmati rice.',
'{"calories": 680, "protein": 38, "carbs": 42, "fats": 38}'::jsonb,
'[{"name": "Chicken thighs", "quantity": 800, "unit": "g"}, {"name": "Butter", "quantity": 80, "unit": "g"}, {"name": "Heavy cream", "quantity": 300, "unit": "ml"}, {"name": "Cashews", "quantity": 80, "unit": "g"}, {"name": "Basmati rice", "quantity": 300, "unit": "g"}, {"name": "Naan", "quantity": 4, "unit": "piece"}]'::jsonb,
ARRAY['high-calorie', 'rich', 'comfort-food']),

('Biryani', 'Flavorful rice dish with meat, perfect for weight gain', 'gain_weight', 'indian', 6, 30, 45,
'1. Marinate meat in yogurt and spices.
2. Partially cook basmati rice.
3. Layer rice and meat in a pot.
4. Cook on low heat (dum) for 30 minutes.
5. Serve with raita.',
'{"calories": 720, "protein": 32, "carbs": 85, "fats": 22}'::jsonb,
'[{"name": "Chicken or mutton", "quantity": 1000, "unit": "g"}, {"name": "Basmati rice", "quantity": 500, "unit": "g"}, {"name": "Ghee", "quantity": 100, "unit": "g"}, {"name": "Yogurt", "quantity": 200, "unit": "g"}, {"name": "Saffron", "quantity": 0.5, "unit": "tsp"}]'::jsonb,
ARRAY['high-calorie', 'traditional', 'festive']),

-- Italian - Gain Weight
('Fettuccine Alfredo', 'Rich and creamy pasta dish for weight gain', 'gain_weight', 'italian', 4, 10, 20,
'1. Cook fettuccine pasta until al dente.
2. Make creamy alfredo sauce with butter, cream, and parmesan.
3. Toss pasta with sauce and serve hot.
4. Top with grilled chicken for extra protein.',
'{"calories": 720, "protein": 28, "carbs": 65, "fats": 38}'::jsonb,
'[{"name": "Fettuccine pasta", "quantity": 400, "unit": "g"}, {"name": "Heavy cream", "quantity": 400, "unit": "ml"}, {"name": "Butter", "quantity": 100, "unit": "g"}, {"name": "Parmesan cheese", "quantity": 150, "unit": "g"}, {"name": "Chicken breast", "quantity": 400, "unit": "g"}]'::jsonb,
ARRAY['high-calorie', 'creamy', 'comfort-food']),

-- American - Gain Weight
('Mac and Cheese with Bacon', 'High-calorie comfort food for weight gain', 'gain_weight', 'american', 4, 15, 25,
'1. Cook macaroni until al dente.
2. Make cheese sauce with cheddar, cream, and butter.
3. Mix pasta with sauce and top with crispy bacon.
4. Bake until golden and bubbly.',
'{"calories": 680, "protein": 32, "carbs": 58, "fats": 35}'::jsonb,
'[{"name": "Macaroni", "quantity": 400, "unit": "g"}, {"name": "Cheddar cheese", "quantity": 300, "unit": "g"}, {"name": "Heavy cream", "quantity": 300, "unit": "ml"}, {"name": "Bacon", "quantity": 200, "unit": "g"}, {"name": "Butter", "quantity": 60, "unit": "g"}]'::jsonb,
ARRAY['high-calorie', 'comfort-food', 'classic']),

-- Mexican - Gain Weight
('Loaded Nachos', 'High-calorie Mexican nachos for weight gain', 'gain_weight', 'mexican', 4, 15, 20,
'1. Layer tortilla chips with seasoned ground beef.
2. Top with cheese, beans, jalapeños, and sour cream.
3. Bake until cheese is melted.
4. Top with guacamole and serve hot.',
'{"calories": 720, "protein": 28, "carbs": 55, "fats": 42}'::jsonb,
'[{"name": "Tortilla chips", "quantity": 300, "unit": "g"}, {"name": "Ground beef", "quantity": 400, "unit": "g"}, {"name": "Cheddar cheese", "quantity": 250, "unit": "g"}, {"name": "Refried beans", "quantity": 200, "unit": "g"}, {"name": "Sour cream", "quantity": 150, "unit": "g"}, {"name": "Avocado", "quantity": 200, "unit": "g"}]'::jsonb,
ARRAY['high-calorie', 'comfort-food', 'party-food']),

-- Mediterranean - Gain Weight
('Moussaka', 'Rich Mediterranean casserole for weight gain', 'gain_weight', 'mediterranean', 6, 30, 60,
'1. Layer eggplant, ground lamb, and béchamel sauce.
2. Bake for 45-60 minutes until golden.
3. Let rest before serving.
4. Serve with Greek salad.',
'{"calories": 580, "protein": 32, "carbs": 28, "fats": 35}'::jsonb,
'[{"name": "Ground lamb", "quantity": 600, "unit": "g"}, {"name": "Eggplant", "quantity": 500, "unit": "g"}, {"name": "Béchamel sauce", "quantity": 500, "unit": "ml"}, {"name": "Olive oil", "quantity": 60, "unit": "ml"}, {"name": "Parmesan cheese", "quantity": 100, "unit": "g"}]'::jsonb,
ARRAY['high-calorie', 'traditional', 'rich']);

-- ============================================================================
-- IMPROVE FITNESS RECIPES
-- ============================================================================

-- Indian - Improve Fitness
INSERT INTO recipe_library (name, description, goal_type, cuisine, servings, prep_time, cook_time, instructions, nutrition_per_serving, ingredients, tags) VALUES
('Chicken Biryani Bowl', 'Balanced Indian bowl for active fitness lifestyle', 'improve_fitness', 'indian', 2, 20, 30,
'1. Cook basmati rice with spices.
2. Grill marinated chicken pieces.
3. Layer rice, chicken, yogurt, and pickled onions.
4. Top with fresh cilantro and serve.',
'{"calories": 520, "protein": 38, "carbs": 55, "fats": 14}'::jsonb,
'[{"name": "Chicken breast", "quantity": 400, "unit": "g"}, {"name": "Basmati rice", "quantity": 200, "unit": "g"}, {"name": "Greek yogurt", "quantity": 150, "unit": "g"}, {"name": "Red onion", "quantity": 1, "unit": "piece"}, {"name": "Cilantro", "quantity": 20, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'high-protein', 'fitness']),

-- Italian - Improve Fitness
('Whole Wheat Pasta with Chicken', 'Balanced Italian pasta for active lifestyle', 'improve_fitness', 'italian', 4, 15, 25,
'1. Cook whole wheat pasta until al dente.
2. Sauté chicken with garlic, tomatoes, and herbs.
3. Toss pasta with chicken and sauce.
4. Top with parmesan and fresh basil.',
'{"calories": 480, "protein": 35, "carbs": 52, "fats": 12}'::jsonb,
'[{"name": "Whole wheat pasta", "quantity": 400, "unit": "g"}, {"name": "Chicken breast", "quantity": 500, "unit": "g"}, {"name": "Tomatoes", "quantity": 400, "unit": "g"}, {"name": "Olive oil", "quantity": 3, "unit": "tbsp"}, {"name": "Parmesan cheese", "quantity": 80, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'high-protein', 'whole-grain']),

-- American - Improve Fitness
('Grilled Chicken Power Bowl', 'Balanced American bowl for fitness', 'improve_fitness', 'american', 2, 15, 20,
'1. Grill seasoned chicken breast.
2. Prepare quinoa and roasted vegetables.
3. Layer quinoa, chicken, vegetables, and avocado.
4. Drizzle with light dressing.',
'{"calories": 540, "protein": 42, "carbs": 48, "fats": 18}'::jsonb,
'[{"name": "Chicken breast", "quantity": 400, "unit": "g"}, {"name": "Quinoa", "quantity": 150, "unit": "g"}, {"name": "Sweet potato", "quantity": 200, "unit": "g"}, {"name": "Broccoli", "quantity": 150, "unit": "g"}, {"name": "Avocado", "quantity": 100, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'high-protein', 'nutritious']),

-- Mexican - Improve Fitness
('Chicken Fajita Bowl', 'Balanced Mexican bowl for active lifestyle', 'improve_fitness', 'mexican', 2, 15, 25,
'1. Season and grill chicken strips.
2. Sauté bell peppers and onions.
3. Layer brown rice, chicken, vegetables, and black beans.
4. Top with salsa and avocado.',
'{"calories": 520, "protein": 40, "carbs": 50, "fats": 16}'::jsonb,
'[{"name": "Chicken breast", "quantity": 400, "unit": "g"}, {"name": "Brown rice", "quantity": 150, "unit": "g"}, {"name": "Bell peppers", "quantity": 200, "unit": "g"}, {"name": "Black beans", "quantity": 150, "unit": "g"}, {"name": "Avocado", "quantity": 100, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'high-protein', 'colorful']),

-- Mediterranean - Improve Fitness
('Mediterranean Quinoa Bowl', 'Balanced Mediterranean bowl for fitness', 'improve_fitness', 'mediterranean', 2, 15, 20,
'1. Cook quinoa and let cool.
2. Add grilled chicken, cucumber, tomatoes, olives, and feta.
3. Drizzle with olive oil and lemon dressing.
4. Toss and serve.',
'{"calories": 500, "protein": 36, "carbs": 45, "fats": 18}'::jsonb,
'[{"name": "Chicken breast", "quantity": 350, "unit": "g"}, {"name": "Quinoa", "quantity": 150, "unit": "g"}, {"name": "Cucumber", "quantity": 150, "unit": "g"}, {"name": "Cherry tomatoes", "quantity": 150, "unit": "g"}, {"name": "Feta cheese", "quantity": 80, "unit": "g"}, {"name": "Olives", "quantity": 50, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'high-protein', 'fresh']);

-- ============================================================================
-- MAINTAIN WEIGHT RECIPES
-- ============================================================================

-- Indian - Maintain Weight
INSERT INTO recipe_library (name, description, goal_type, cuisine, servings, prep_time, cook_time, instructions, nutrition_per_serving, ingredients, tags) VALUES
('Chicken Curry with Roti', 'Balanced Indian meal for weight maintenance', 'maintain', 'indian', 4, 20, 30,
'1. Make chicken curry with moderate spices and oil.
2. Serve with whole wheat roti.
3. Include a side of raita for balance.',
'{"calories": 420, "protein": 32, "carbs": 38, "fats": 16}'::jsonb,
'[{"name": "Chicken thighs", "quantity": 600, "unit": "g"}, {"name": "Whole wheat roti", "quantity": 8, "unit": "piece"}, {"name": "Onion", "quantity": 2, "unit": "piece"}, {"name": "Tomatoes", "quantity": 3, "unit": "piece"}, {"name": "Yogurt", "quantity": 200, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'moderate-calorie', 'traditional']),

-- Italian - Maintain Weight
('Chicken Piccata', 'Balanced Italian dish for weight maintenance', 'maintain', 'italian', 4, 15, 20,
'1. Pan-sear chicken breasts until golden.
2. Make piccata sauce with lemon, capers, and white wine.
3. Serve with whole wheat pasta or roasted vegetables.',
'{"calories": 380, "protein": 35, "carbs": 25, "fats": 16}'::jsonb,
'[{"name": "Chicken breast", "quantity": 600, "unit": "g"}, {"name": "Whole wheat pasta", "quantity": 300, "unit": "g"}, {"name": "Lemon", "quantity": 2, "unit": "piece"}, {"name": "Capers", "quantity": 30, "unit": "g"}, {"name": "Olive oil", "quantity": 3, "unit": "tbsp"}]'::jsonb,
ARRAY['balanced', 'moderate-calorie', 'light']),

-- American - Maintain Weight
('Grilled Chicken with Sweet Potato', 'Balanced American meal for maintenance', 'maintain', 'american', 2, 15, 30,
'1. Season and grill chicken breast.
2. Roast sweet potato wedges.
3. Serve with steamed broccoli.
4. Drizzle with light olive oil.',
'{"calories": 440, "protein": 38, "carbs": 42, "fats": 12}'::jsonb,
'[{"name": "Chicken breast", "quantity": 400, "unit": "g"}, {"name": "Sweet potato", "quantity": 400, "unit": "g"}, {"name": "Broccoli", "quantity": 200, "unit": "g"}, {"name": "Olive oil", "quantity": 2, "unit": "tbsp"}]'::jsonb,
ARRAY['balanced', 'moderate-calorie', 'nutritious']),

-- Mexican - Maintain Weight
('Chicken Enchiladas', 'Balanced Mexican dish for weight maintenance', 'maintain', 'mexican', 4, 20, 30,
'1. Fill tortillas with shredded chicken and cheese.
2. Roll and place in baking dish.
3. Top with enchilada sauce and cheese.
4. Bake until bubbly. Serve with side salad.',
'{"calories": 420, "protein": 32, "carbs": 38, "fats": 16}'::jsonb,
'[{"name": "Chicken breast", "quantity": 600, "unit": "g"}, {"name": "Corn tortillas", "quantity": 8, "unit": "piece"}, {"name": "Cheddar cheese", "quantity": 200, "unit": "g"}, {"name": "Enchilada sauce", "quantity": 400, "unit": "ml"}]'::jsonb,
ARRAY['balanced', 'moderate-calorie', 'comfort-food']),

-- Mediterranean - Maintain Weight
('Mediterranean Chicken Wrap', 'Balanced Mediterranean wrap for maintenance', 'maintain', 'mediterranean', 2, 15, 10,
'1. Grill chicken strips with Mediterranean spices.
2. Fill whole wheat wraps with chicken, vegetables, and hummus.
3. Add feta cheese and olives.
4. Roll and serve.',
'{"calories": 460, "protein": 36, "carbs": 42, "fats": 16}'::jsonb,
'[{"name": "Chicken breast", "quantity": 400, "unit": "g"}, {"name": "Whole wheat wraps", "quantity": 2, "unit": "piece"}, {"name": "Hummus", "quantity": 100, "unit": "g"}, {"name": "Feta cheese", "quantity": 80, "unit": "g"}, {"name": "Mixed vegetables", "quantity": 200, "unit": "g"}]'::jsonb,
ARRAY['balanced', 'moderate-calorie', 'portable']);

