-- ============================================================================
-- POPULATE MEAL LIBRARY WITH MEALS FROM DIFFERENT CUISINES
-- Migration: 006_populate_meal_library.sql
-- Description: Adds pre-defined meals from Indian, Mexican, American, Mediterranean, Italian cuisines
-- ============================================================================

-- INDIAN CUISINE MEALS
INSERT INTO meal_library (name, cuisine, meal_type, description, calories, protein, carbs, fats, serving_size) VALUES
-- Indian Breakfast
('Masala Dosa', 'indian', 'breakfast', 'Crispy rice crepe filled with spiced potatoes, served with sambar and chutney', 350, 8, 55, 12, '1 dosa'),
('Idli Sambar', 'indian', 'breakfast', 'Steamed rice cakes served with lentil curry', 250, 8, 45, 3, '2 idlis'),
('Poha', 'indian', 'breakfast', 'Flattened rice cooked with onions, spices, and peanuts', 280, 6, 50, 8, '1 plate'),
('Upma', 'indian', 'breakfast', 'Semolina cooked with vegetables and spices', 300, 7, 45, 10, '1 bowl'),
('Paratha with Curd', 'indian', 'breakfast', 'Whole wheat flatbread with yogurt', 320, 10, 45, 12, '2 parathas'),
('Aloo Paratha', 'indian', 'breakfast', 'Stuffed flatbread with spiced potatoes', 380, 12, 55, 15, '2 parathas'),
('Chole Bhature', 'indian', 'breakfast', 'Spiced chickpeas with fried bread', 450, 15, 60, 18, '1 plate'),
('Dhokla', 'indian', 'breakfast', 'Steamed fermented gram flour cakes', 180, 8, 30, 4, '4 pieces'),

-- Indian Lunch
('Dal Rice', 'indian', 'lunch', 'Lentil curry with steamed rice', 400, 15, 65, 8, '1 plate'),
('Rajma Rice', 'indian', 'lunch', 'Kidney beans curry with rice', 450, 18, 70, 10, '1 plate'),
('Chole Rice', 'indian', 'lunch', 'Chickpeas curry with rice', 420, 16, 68, 9, '1 plate'),
('Biryani', 'indian', 'lunch', 'Fragrant basmati rice with spiced meat/vegetables', 550, 25, 75, 15, '1 plate'),
('Butter Chicken with Naan', 'indian', 'lunch', 'Creamy tomato-based chicken curry with Indian bread', 650, 35, 70, 25, '1 plate'),
('Palak Paneer with Roti', 'indian', 'lunch', 'Spinach curry with cottage cheese and whole wheat bread', 420, 20, 45, 18, '1 plate'),
('Sambar Rice', 'indian', 'lunch', 'Lentil and vegetable stew with rice', 380, 12, 60, 8, '1 plate'),
('Thali (Vegetarian)', 'indian', 'lunch', 'Complete meal with dal, vegetables, rice, roti, and salad', 500, 20, 75, 15, '1 thali'),
('Thali (Non-Vegetarian)', 'indian', 'lunch', 'Complete meal with curry, dal, vegetables, rice, roti', 650, 35, 75, 20, '1 thali'),

-- Indian Dinner
('Dal Tadka with Roti', 'indian', 'dinner', 'Tempered lentil curry with whole wheat bread', 380, 14, 55, 10, '1 plate'),
('Baingan Bharta with Roti', 'indian', 'dinner', 'Roasted eggplant curry with bread', 320, 8, 45, 12, '1 plate'),
('Aloo Gobi with Roti', 'indian', 'dinner', 'Potato and cauliflower curry with bread', 350, 10, 50, 12, '1 plate'),
('Tandoori Chicken with Naan', 'indian', 'dinner', 'Marinated grilled chicken with Indian bread', 580, 45, 55, 18, '1 plate'),
('Fish Curry with Rice', 'indian', 'dinner', 'Spiced fish curry with steamed rice', 450, 30, 60, 12, '1 plate'),
('Mutton Curry with Roti', 'indian', 'dinner', 'Spiced mutton curry with bread', 520, 38, 50, 20, '1 plate'),

-- MEXICAN CUISINE MEALS
-- Mexican Breakfast
('Huevos Rancheros', 'mexican', 'breakfast', 'Fried eggs on tortillas with salsa', 380, 18, 35, 18, '1 plate'),
('Chilaquiles', 'mexican', 'breakfast', 'Tortilla chips with salsa, cheese, and eggs', 420, 16, 45, 20, '1 plate'),
('Breakfast Burrito', 'mexican', 'breakfast', 'Scrambled eggs, beans, cheese, and salsa in tortilla', 450, 20, 50, 18, '1 burrito'),
('Mexican Scrambled Eggs', 'mexican', 'breakfast', 'Eggs scrambled with tomatoes, onions, and peppers', 280, 16, 12, 18, '1 plate'),

-- Mexican Lunch
('Chicken Tacos', 'mexican', 'lunch', 'Grilled chicken in corn tortillas with salsa and vegetables', 380, 28, 35, 12, '3 tacos'),
('Beef Tacos', 'mexican', 'lunch', 'Seasoned beef in tortillas with toppings', 420, 30, 35, 15, '3 tacos'),
('Chicken Burrito', 'mexican', 'lunch', 'Large tortilla filled with chicken, rice, beans, and cheese', 580, 35, 65, 18, '1 burrito'),
('Beef Burrito', 'mexican', 'lunch', 'Large tortilla filled with beef, rice, beans, and cheese', 620, 38, 65, 20, '1 burrito'),
('Chicken Quesadilla', 'mexican', 'lunch', 'Tortilla filled with chicken and cheese, grilled', 450, 30, 40, 20, '1 quesadilla'),
('Chicken Enchiladas', 'mexican', 'lunch', 'Rolled tortillas with chicken, covered in sauce and cheese', 520, 32, 55, 22, '2 enchiladas'),
('Fajitas (Chicken)', 'mexican', 'lunch', 'Grilled chicken strips with peppers and onions, served with tortillas', 480, 40, 45, 18, '1 plate'),
('Fajitas (Beef)', 'mexican', 'lunch', 'Grilled beef strips with peppers and onions, served with tortillas', 520, 42, 45, 20, '1 plate'),
('Chicken Tostadas', 'mexican', 'lunch', 'Crispy tortilla topped with chicken, beans, lettuce, and cheese', 380, 25, 40, 15, '2 tostadas'),

-- Mexican Dinner
('Chicken Mole', 'mexican', 'dinner', 'Chicken in rich chocolate-chili sauce', 520, 38, 45, 22, '1 plate'),
('Carnitas', 'mexican', 'dinner', 'Slow-cooked pork, served with tortillas and salsa', 580, 42, 40, 28, '1 plate'),
('Chiles Rellenos', 'mexican', 'dinner', 'Stuffed peppers with cheese, battered and fried', 450, 20, 35, 25, '2 peppers'),
('Pozole', 'mexican', 'dinner', 'Traditional soup with hominy and pork', 420, 30, 45, 12, '1 bowl'),

-- AMERICAN CUISINE MEALS
-- American Breakfast
('Pancakes with Syrup', 'american', 'breakfast', 'Fluffy pancakes served with maple syrup', 380, 8, 65, 10, '3 pancakes'),
('French Toast', 'american', 'breakfast', 'Bread dipped in egg mixture, fried and served with syrup', 350, 12, 50, 12, '2 slices'),
('Scrambled Eggs with Bacon', 'american', 'breakfast', 'Scrambled eggs with crispy bacon', 420, 22, 4, 32, '1 plate'),
('Breakfast Sandwich', 'american', 'breakfast', 'Egg, cheese, and bacon on English muffin', 380, 20, 30, 20, '1 sandwich'),
('Oatmeal with Berries', 'american', 'breakfast', 'Steel-cut oats topped with fresh berries', 280, 10, 50, 6, '1 bowl'),
('Avocado Toast', 'american', 'breakfast', 'Whole grain toast topped with mashed avocado', 320, 10, 35, 18, '2 slices'),
('Breakfast Bowl', 'american', 'breakfast', 'Yogurt, granola, fruits, and honey', 350, 15, 55, 10, '1 bowl'),

-- American Lunch
('Grilled Chicken Sandwich', 'american', 'lunch', 'Grilled chicken breast on bun with lettuce and tomato', 450, 35, 45, 15, '1 sandwich'),
('Cheeseburger', 'american', 'lunch', 'Beef patty with cheese, lettuce, tomato, and bun', 580, 28, 50, 28, '1 burger'),
('Caesar Salad with Chicken', 'american', 'lunch', 'Romaine lettuce with Caesar dressing and grilled chicken', 420, 32, 20, 25, '1 salad'),
('Club Sandwich', 'american', 'lunch', 'Triple-decker sandwich with turkey, bacon, and vegetables', 520, 35, 45, 22, '1 sandwich'),
('BBQ Pulled Pork Sandwich', 'american', 'lunch', 'Slow-cooked pork with BBQ sauce on bun', 550, 32, 55, 20, '1 sandwich'),
('Chicken Wings', 'american', 'lunch', 'Fried chicken wings with sauce', 480, 35, 15, 30, '6 wings'),
('Mac and Cheese', 'american', 'lunch', 'Creamy macaroni and cheese', 450, 18, 55, 20, '1 bowl'),
('Chicken Tenders with Fries', 'american', 'lunch', 'Breaded chicken strips with french fries', 580, 30, 60, 25, '1 plate'),

-- American Dinner
('Grilled Salmon with Vegetables', 'american', 'dinner', 'Pan-seared salmon with roasted vegetables', 480, 38, 25, 28, '1 plate'),
('Steak with Mashed Potatoes', 'american', 'dinner', 'Grilled steak with creamy mashed potatoes', 650, 45, 40, 35, '1 plate'),
('Meatloaf with Mashed Potatoes', 'american', 'dinner', 'Ground meat loaf with mashed potatoes and gravy', 580, 35, 45, 28, '1 plate'),
('Fried Chicken with Coleslaw', 'american', 'dinner', 'Crispy fried chicken with coleslaw', 620, 38, 50, 32, '1 plate'),
('BBQ Ribs', 'american', 'dinner', 'Slow-cooked ribs with BBQ sauce', 680, 42, 35, 40, '1 rack'),
('Chicken Pot Pie', 'american', 'dinner', 'Creamy chicken and vegetable pie', 520, 28, 45, 25, '1 pie'),

-- MEDITERRANEAN CUISINE MEALS
-- Mediterranean Breakfast
('Greek Yogurt with Honey and Nuts', 'mediterranean', 'breakfast', 'Thick yogurt drizzled with honey and walnuts', 320, 15, 35, 15, '1 bowl'),
('Mediterranean Omelet', 'mediterranean', 'breakfast', 'Eggs with feta, tomatoes, olives, and herbs', 350, 20, 8, 25, '1 omelet'),
('Shakshuka', 'mediterranean', 'breakfast', 'Poached eggs in tomato and pepper sauce', 280, 16, 20, 18, '1 plate'),
('Feta and Olive Toast', 'mediterranean', 'breakfast', 'Whole grain bread with feta cheese and olives', 320, 12, 35, 15, '2 slices'),

-- Mediterranean Lunch
('Greek Salad', 'mediterranean', 'lunch', 'Fresh vegetables with feta, olives, and olive oil dressing', 380, 15, 25, 28, '1 salad'),
('Chicken Gyro', 'mediterranean', 'lunch', 'Spiced chicken wrapped in pita with tzatziki', 450, 32, 45, 18, '1 gyro'),
('Falafel Wrap', 'mediterranean', 'lunch', 'Chickpea fritters in pita with tahini sauce', 420, 15, 55, 18, '1 wrap'),
('Mediterranean Bowl', 'mediterranean', 'lunch', 'Quinoa, grilled vegetables, hummus, and feta', 480, 20, 60, 20, '1 bowl'),
('Lamb Kebab with Rice', 'mediterranean', 'lunch', 'Grilled lamb skewers with basmati rice', 550, 38, 55, 22, '1 plate'),
('Moussaka', 'mediterranean', 'lunch', 'Layered eggplant and meat casserole', 520, 28, 45, 28, '1 plate'),
('Spanakopita', 'mediterranean', 'lunch', 'Spinach and feta pie in phyllo pastry', 380, 15, 35, 22, '2 pieces'),

-- Mediterranean Dinner
('Grilled Fish with Vegetables', 'mediterranean', 'dinner', 'Fresh fish grilled with Mediterranean vegetables', 420, 35, 20, 22, '1 plate'),
('Chicken Souvlaki', 'mediterranean', 'dinner', 'Marinated chicken skewers with pita and tzatziki', 480, 40, 45, 18, '1 plate'),
('Stuffed Grape Leaves', 'mediterranean', 'dinner', 'Rice-stuffed grape leaves with lemon sauce', 280, 8, 40, 10, '6 pieces'),
('Mediterranean Pasta', 'mediterranean', 'dinner', 'Pasta with olives, tomatoes, capers, and feta', 480, 18, 65, 18, '1 plate'),

-- ITALIAN CUISINE MEALS
-- Italian Breakfast
('Italian Frittata', 'italian', 'breakfast', 'Baked egg dish with vegetables and cheese', 320, 20, 12, 22, '1 slice'),
('Caprese Toast', 'italian', 'breakfast', 'Bread with fresh mozzarella, tomatoes, and basil', 280, 15, 30, 12, '2 slices'),
('Italian Scrambled Eggs', 'italian', 'breakfast', 'Eggs with prosciutto and parmesan', 350, 22, 5, 25, '1 plate'),

-- Italian Lunch
('Margherita Pizza', 'italian', 'lunch', 'Classic pizza with tomato, mozzarella, and basil', 450, 20, 55, 18, '2 slices'),
('Pepperoni Pizza', 'italian', 'lunch', 'Pizza with pepperoni and mozzarella', 520, 25, 55, 22, '2 slices'),
('Chicken Alfredo Pasta', 'italian', 'lunch', 'Creamy pasta with grilled chicken', 580, 32, 65, 25, '1 plate'),
('Spaghetti Carbonara', 'italian', 'lunch', 'Pasta with eggs, cheese, pancetta, and black pepper', 550, 25, 60, 22, '1 plate'),
('Lasagna', 'italian', 'lunch', 'Layered pasta with meat sauce and cheese', 520, 28, 50, 25, '1 slice'),
('Chicken Parmesan', 'italian', 'lunch', 'Breaded chicken with marinara and mozzarella', 580, 38, 45, 28, '1 plate'),
('Eggplant Parmesan', 'italian', 'lunch', 'Breaded eggplant with marinara and mozzarella', 420, 15, 45, 22, '1 plate'),
('Penne Arrabbiata', 'italian', 'lunch', 'Spicy tomato pasta', 420, 12, 65, 12, '1 plate'),

-- Italian Dinner
('Osso Buco', 'italian', 'dinner', 'Braised veal shanks with vegetables', 520, 42, 35, 22, '1 plate'),
('Chicken Marsala', 'italian', 'dinner', 'Chicken in marsala wine sauce with mushrooms', 480, 35, 30, 22, '1 plate'),
('Risotto', 'italian', 'dinner', 'Creamy rice dish with vegetables or seafood', 450, 15, 65, 15, '1 plate'),
('Veal Piccata', 'italian', 'dinner', 'Veal in lemon-butter sauce with capers', 480, 38, 25, 25, '1 plate'),
('Bruschetta', 'italian', 'dinner', 'Toasted bread topped with tomatoes, garlic, and basil', 280, 8, 35, 12, '4 pieces')
ON CONFLICT DO NOTHING;

-- Add comment
DO $$
BEGIN
  RAISE NOTICE '✅ Meal Library populated with meals from different cuisines!';
  RAISE NOTICE '📊 Total meals inserted: ~100+';
  RAISE NOTICE '🍛 Indian: Masala Dosa, Biryani, Dal Rice, Thali, etc.';
  RAISE NOTICE '🌮 Mexican: Tacos, Burritos, Enchiladas, Fajitas, etc.';
  RAISE NOTICE '🍔 American: Burgers, Sandwiches, Steak, BBQ Ribs, etc.';
  RAISE NOTICE '🥗 Mediterranean: Greek Salad, Gyro, Falafel, Moussaka, etc.';
  RAISE NOTICE '🍝 Italian: Pizza, Pasta, Lasagna, Risotto, etc.';
  RAISE NOTICE '';
  RAISE NOTICE 'All meals include base nutrition values per serving!';
END $$;

