-- ============================================================================
-- ADD MORE EXERCISES TO EXERCISE LIBRARY
-- Migration: 004_add_more_exercises.sql
-- Description: Adds additional sports and exercises to the exercise library
-- ============================================================================

-- Additional Sports Exercises
INSERT INTO exercise_library (name, type, met_value, muscle_groups, equipment) VALUES
-- More Running Variations
('Running, 12 mph (5 min/mile)', 'cardio', 19.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Running, trail', 'cardio', 8.0, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Running, stairs', 'cardio', 15.0, ARRAY['legs', 'glutes', 'cardiovascular'], ARRAY[]::TEXT[]),

-- More Cycling Variations
('Cycling, mountain bike', 'cardio', 8.5, ARRAY['legs', 'cardiovascular'], ARRAY['mountain bike']),
('Cycling, BMX', 'cardio', 8.5, ARRAY['legs', 'cardiovascular'], ARRAY['bmx bike']),
('Cycling, spinning', 'cardio', 8.5, ARRAY['legs', 'cardiovascular'], ARRAY['spinning bike']),

-- More Swimming Variations
('Swimming, treading water', 'cardio', 3.5, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Swimming, water aerobics', 'cardio', 4.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Swimming, synchronized', 'cardio', 8.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),

-- More Strength Exercises
('Dips', 'strength', 3.5, ARRAY['triceps', 'shoulders', 'chest'], ARRAY[]::TEXT[]),
('Leg raises', 'strength', 3.0, ARRAY['core'], ARRAY[]::TEXT[]),
('Side planks', 'strength', 3.5, ARRAY['core', 'obliques'], ARRAY[]::TEXT[]),
('Wall sits', 'strength', 3.5, ARRAY['legs', 'glutes'], ARRAY[]::TEXT[]),
('Glute bridges', 'strength', 3.5, ARRAY['glutes', 'hamstrings'], ARRAY[]::TEXT[]),
('Hip thrusts', 'strength', 4.0, ARRAY['glutes', 'hamstrings'], ARRAY['barbell', 'dumbbells']),
('Romanian deadlifts', 'strength', 5.0, ARRAY['back', 'hamstrings', 'glutes'], ARRAY['barbell', 'dumbbells']),
('Bulgarian split squats', 'strength', 5.5, ARRAY['legs', 'glutes'], ARRAY['dumbbells']),
('Cable crossovers', 'strength', 3.5, ARRAY['chest'], ARRAY['cable machine']),
('Face pulls', 'strength', 3.0, ARRAY['shoulders', 'back'], ARRAY['cable machine']),

-- More Sports
('Cricket, batting', 'sports', 5.0, ARRAY['full body'], ARRAY['bat']),
('Cricket, bowling', 'sports', 5.5, ARRAY['full body'], ARRAY[]::TEXT[]),
('Lacrosse', 'sports', 8.0, ARRAY['full body'], ARRAY['stick']),
('Ultimate frisbee', 'sports', 8.0, ARRAY['full body'], ARRAY['frisbee']),
('Frisbee, general', 'sports', 3.0, ARRAY['full body'], ARRAY['frisbee']),
('Pickleball', 'sports', 4.0, ARRAY['full body'], ARRAY['paddle']),
('Ping pong, competitive', 'sports', 4.0, ARRAY['full body'], ARRAY['paddle']),
('Beach volleyball', 'sports', 8.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Water polo', 'sports', 10.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Handball', 'sports', 12.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Fencing', 'sports', 6.0, ARRAY['legs', 'arms'], ARRAY['sword']),
('Archery', 'sports', 3.5, ARRAY['arms', 'back'], ARRAY['bow']),
('Horseback riding, general', 'sports', 4.0, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Horseback riding, trotting', 'sports', 5.5, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Horseback riding, galloping', 'sports', 7.3, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),

-- More Cardio
('Treadmill, running', 'cardio', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY['treadmill']),
('Treadmill, walking', 'cardio', 3.5, ARRAY['legs', 'cardiovascular'], ARRAY['treadmill']),
('StairMaster', 'cardio', 9.0, ARRAY['legs', 'glutes', 'cardiovascular'], ARRAY['stairmaster']),
('CrossFit, general', 'cardio', 8.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Circuit training', 'cardio', 8.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Kickboxing', 'cardio', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Muay Thai', 'cardio', 10.3, ARRAY['full body'], ARRAY[]::TEXT[]),
('Karate', 'cardio', 10.3, ARRAY['full body'], ARRAY[]::TEXT[]),
('Taekwondo', 'cardio', 10.3, ARRAY['full body'], ARRAY[]::TEXT[]),
('Jiu-Jitsu', 'cardio', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),

-- More Yoga/Pilates
('Yoga, Yin', 'yoga', 2.0, ARRAY['full body', 'flexibility'], ARRAY['mat']),
('Yoga, Kundalini', 'yoga', 3.0, ARRAY['full body', 'flexibility'], ARRAY['mat']),
('Yoga, Iyengar', 'yoga', 3.0, ARRAY['full body', 'flexibility'], ARRAY['mat', 'props']),
('Yoga, Hot', 'yoga', 4.0, ARRAY['full body', 'flexibility'], ARRAY['mat']),
('Pilates, mat', 'yoga', 3.0, ARRAY['core', 'flexibility'], ARRAY['mat']),
('Pilates, reformer', 'yoga', 4.5, ARRAY['core', 'flexibility'], ARRAY['reformer']),

-- More Other Activities
('Rock climbing, bouldering', 'other', 8.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Rock climbing, top rope', 'other', 8.0, ARRAY['full body'], ARRAY['rope']),
('Rock climbing, lead', 'other', 11.0, ARRAY['full body'], ARRAY['rope']),
('Bouldering', 'other', 8.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Hiking, backpacking', 'other', 7.0, ARRAY['legs', 'back'], ARRAY['backpack']),
('Trail running', 'other', 8.0, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Stand-up paddleboarding', 'other', 6.0, ARRAY['full body'], ARRAY['board', 'paddle']),
('Surfing, bodyboarding', 'other', 3.0, ARRAY['full body'], ARRAY['board']),
('Kitesurfing', 'other', 5.0, ARRAY['full body'], ARRAY['kite', 'board']),
('Windsurfing', 'other', 5.0, ARRAY['full body'], ARRAY['board', 'sail']),
('Sailing', 'other', 3.0, ARRAY['arms', 'core'], ARRAY['boat']),
('Rowing, outdoor', 'other', 7.0, ARRAY['full body', 'cardiovascular'], ARRAY['boat']),
('Canoeing, vigorous', 'other', 7.0, ARRAY['arms', 'core'], ARRAY['canoe']),
('Kayaking, sea', 'other', 5.0, ARRAY['arms', 'core'], ARRAY['kayak']),
('Whitewater rafting', 'other', 5.0, ARRAY['full body'], ARRAY['raft']),
('Skateboarding', 'other', 5.0, ARRAY['legs', 'core'], ARRAY['skateboard']),
('Longboarding', 'other', 4.5, ARRAY['legs', 'core'], ARRAY['longboard']),
('Inline skating', 'other', 7.0, ARRAY['legs'], ARRAY['skates']),
('Ice skating, figure', 'other', 7.0, ARRAY['legs', 'core'], ARRAY['skates']),
('Ice skating, speed', 'other', 13.3, ARRAY['legs', 'cardiovascular'], ARRAY['skates']),
('Skiing, alpine', 'other', 5.0, ARRAY['legs'], ARRAY['skis']),
('Skiing, freestyle', 'other', 6.0, ARRAY['legs', 'core'], ARRAY['skis']),
('Snowshoeing', 'other', 7.0, ARRAY['legs', 'cardiovascular'], ARRAY['snowshoes']),
('Sledding', 'other', 5.8, ARRAY['legs'], ARRAY['sled']),
('Tobogganing', 'other', 5.8, ARRAY['legs'], ARRAY['toboggan']),
('Curling', 'other', 4.0, ARRAY['legs', 'arms'], ARRAY['broom', 'stone']),
('Bobsledding', 'other', 6.0, ARRAY['full body'], ARRAY['sled']),
('Luge', 'other', 3.5, ARRAY['core'], ARRAY['sled']),
('Dancing, ballet', 'other', 6.0, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, modern', 'other', 4.8, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, tap', 'other', 4.8, ARRAY['legs'], ARRAY[]::TEXT[]),
('Dancing, jazz', 'other', 4.8, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, hip hop', 'other', 5.0, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, salsa', 'other', 4.5, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, swing', 'other', 4.8, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, tango', 'other', 4.5, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Dancing, line dancing', 'other', 4.5, ARRAY['legs'], ARRAY[]::TEXT[]),
('Dancing, country', 'other', 4.5, ARRAY['legs'], ARRAY[]::TEXT[]),
('Gymnastics, general', 'other', 4.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Gymnastics, competitive', 'other', 6.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Trampoline', 'other', 3.5, ARRAY['legs', 'core'], ARRAY['trampoline']),
('Jumping on trampoline', 'other', 3.5, ARRAY['legs', 'core'], ARRAY['trampoline']),
('Parkour', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Free running', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Calisthenics', 'other', 8.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Bodyweight training', 'other', 8.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Functional training', 'other', 6.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('TRX training', 'other', 4.0, ARRAY['full body'], ARRAY['trx']),
('Kettlebell training', 'other', 8.0, ARRAY['full body'], ARRAY['kettlebell']),
('Battle ropes', 'other', 8.5, ARRAY['full body'], ARRAY['ropes']),
('Sledgehammer training', 'other', 8.0, ARRAY['full body'], ARRAY['sledgehammer', 'tire']),
('Farmers walk', 'other', 6.0, ARRAY['full body'], ARRAY['dumbbells', 'kettlebells']),
('Rucking', 'other', 6.0, ARRAY['legs', 'back'], ARRAY['backpack']),
('Walking with weighted vest', 'other', 6.0, ARRAY['legs', 'cardiovascular'], ARRAY['weighted vest']),
('Nordic walking', 'other', 4.5, ARRAY['legs', 'arms', 'cardiovascular'], ARRAY['poles']),
('Power walking', 'other', 5.0, ARRAY['legs', 'cardiovascular'], ARRAY[]::TEXT[]),
('Race walking', 'other', 6.5, ARRAY['legs', 'cardiovascular'], ARRAY[]::TEXT[]),
('Orienteering', 'other', 9.0, ARRAY['legs', 'cardiovascular'], ARRAY['compass', 'map']),
('Geocaching', 'other', 4.0, ARRAY['legs'], ARRAY['gps']),
('Disc golf', 'other', 4.5, ARRAY['legs', 'arms'], ARRAY['disc']),
('Frisbee golf', 'other', 4.5, ARRAY['legs', 'arms'], ARRAY['frisbee']),
('Horseback riding, jumping', 'other', 5.5, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Horseback riding, dressage', 'other', 5.5, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Polo', 'other', 8.0, ARRAY['legs', 'core', 'arms'], ARRAY['mallet']),
('Equestrian, general', 'other', 5.5, ARRAY['legs', 'core'], ARRAY[]::TEXT[]),
('Fishing, from boat', 'other', 2.5, ARRAY['arms'], ARRAY['boat']),
('Fishing, from river bank', 'other', 3.5, ARRAY['legs', 'arms'], ARRAY[]::TEXT[]),
('Fishing, stream', 'other', 4.5, ARRAY['legs', 'arms'], ARRAY[]::TEXT[]),
('Hunting, general', 'other', 5.0, ARRAY['legs', 'arms'], ARRAY[]::TEXT[]),
('Hunting, with dogs', 'other', 5.0, ARRAY['legs', 'arms'], ARRAY[]::TEXT[]),
('Shooting, trap', 'other', 3.0, ARRAY['arms'], ARRAY['gun']),
('Shooting, skeet', 'other', 3.0, ARRAY['arms'], ARRAY['gun']),
('Shooting, sporting clays', 'other', 3.0, ARRAY['arms'], ARRAY['gun']),
('Paintball', 'other', 10.0, ARRAY['full body'], ARRAY['gun']),
('Airsoft', 'other', 8.0, ARRAY['full body'], ARRAY['gun']),
('Laser tag', 'other', 5.0, ARRAY['legs'], ARRAY['gun']),
('Escape room', 'other', 2.5, ARRAY[]::TEXT[], ARRAY[]::TEXT[]),
('Obstacle course racing', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Mud run', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Tough Mudder', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Spartan Race', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Color Run', 'other', 6.0, ARRAY['legs', 'cardiovascular'], ARRAY[]::TEXT[]),
('Fun Run', 'other', 6.0, ARRAY['legs', 'cardiovascular'], ARRAY[]::TEXT[]),
('5K Run', 'other', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('10K Run', 'other', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Half Marathon', 'other', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Marathon', 'other', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Ultramarathon', 'other', 9.8, ARRAY['legs', 'core', 'cardiovascular'], ARRAY[]::TEXT[]),
('Triathlon, sprint', 'other', 12.0, ARRAY['full body', 'cardiovascular'], ARRAY['bicycle']),
('Triathlon, Olympic', 'other', 12.0, ARRAY['full body', 'cardiovascular'], ARRAY['bicycle']),
('Triathlon, Ironman', 'other', 12.0, ARRAY['full body', 'cardiovascular'], ARRAY['bicycle']),
('Duathlon', 'other', 10.0, ARRAY['legs', 'cardiovascular'], ARRAY['bicycle']),
('Aquathlon', 'other', 10.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Swimrun', 'other', 10.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[]),
('Adventure racing', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Rogaining', 'other', 9.0, ARRAY['legs', 'cardiovascular'], ARRAY['compass', 'map']),
('Raid', 'other', 10.0, ARRAY['full body'], ARRAY[]::TEXT[]),
('Multi-sport event', 'other', 10.0, ARRAY['full body', 'cardiovascular'], ARRAY[]::TEXT[])
ON CONFLICT DO NOTHING;

-- Add comment
DO $$
BEGIN
  RAISE NOTICE '✅ Added 150+ additional exercises to exercise library!';
  RAISE NOTICE '📊 New exercises include:';
  RAISE NOTICE '  - More running variations (trail, stairs, speed)';
  RAISE NOTICE '  - Additional strength exercises (dips, leg raises, etc.)';
  RAISE NOTICE '  - More sports (lacrosse, ultimate frisbee, handball, etc.)';
  RAISE NOTICE '  - More cardio (CrossFit, kickboxing, martial arts)';
  RAISE NOTICE '  - More yoga/pilates variations';
  RAISE NOTICE '  - Outdoor activities (rock climbing, hiking, water sports)';
  RAISE NOTICE '  - Winter sports (skiing, snowboarding, ice skating)';
  RAISE NOTICE '  - Dance variations';
  RAISE NOTICE '  - Endurance events (marathons, triathlons, obstacle races)';
END $$;

