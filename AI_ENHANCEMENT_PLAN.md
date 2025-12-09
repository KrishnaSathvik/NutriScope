# AI Capability Enhancement Plan

## Overview
Enhancing the AI chat assistant to understand natural language meal logging, generate recipes, manage meal plans, and handle grocery lists with confirmation flows.

## Features to Implement

### 1. **Natural Language Meal Logging**
- **Input:** "I had chicken salad for lunch" or "I hate eggs for breakfast"
- **Process:**
  1. AI extracts meal type (breakfast/lunch/dinner)
  2. AI calculates nutrition from food description
  3. AI shows summary: "I found: Chicken salad (350 cal, 30g protein) for lunch"
  4. AI asks: "Do you want me to log this?"
  5. If yes → logs automatically

### 2. **Food Questions with Images**
- **Input:** "Can I eat this for lunch?" + image
- **Process:**
  1. AI analyzes image
  2. AI answers question based on user goals/preferences
  3. Can optionally log if user confirms

### 3. **Recipe Generation**
- **Input:** "Can I eat this?" + "generate recipe" or "recipe for chicken curry"
- **Process:**
  1. AI generates recipe with ingredients, instructions, nutrition
  2. AI shows recipe summary
  3. AI asks: "Should I save this to your recipes?"
  4. If yes → saves to recipes page

### 4. **Meal Plan Integration**
- **Input:** "Save this meal to meal plan" or "Add chicken curry to Monday lunch"
- **Process:**
  1. AI extracts meal details
  2. AI adds to meal plan for specified day/meal
  3. Confirms action

### 5. **Grocery List Integration**
- **Input:** "Add chicken, rice, vegetables to grocery list"
- **Process:**
  1. AI extracts items
  2. AI adds to grocery list
  3. Confirms action

### 6. **Workout Integration**
- Similar natural language processing for workouts
- "I ran for 30 minutes" → logs workout

## Implementation Steps

### Step 1: Enhance AI Types
- Add new action types: `generate_recipe`, `save_recipe`, `add_to_meal_plan`, `add_to_grocery_list`, `log_meal_with_confirmation`
- Add confirmation flow types

### Step 2: Create Nutrition Calculation Service
- Service to extract food items and amounts from natural language
- Calculate nutrition using OpenAI + USDA API fallback

### Step 3: Enhance AI System Prompt
- Add instructions for:
  - Meal logging with confirmation
  - Recipe generation
  - Meal plan management
  - Grocery list management
  - Food questions with images

### Step 4: Enhance executeAction
- Handle new action types
- Add recipe generation logic
- Add meal plan addition logic
- Add grocery list addition logic

### Step 5: Add Confirmation UI
- Confirmation buttons in chat messages
- Handle yes/no responses
- Update chat state accordingly

### Step 6: Enhance Image Analysis
- Better food recognition
- Recipe generation from images
- Nutrition estimation from images

### Step 7: Update ChatPage
- Handle confirmation flows
- Display action buttons
- Process confirmations

## Technical Details

### New Action Types
```typescript
type: 'log_meal_with_confirmation' | 'generate_recipe' | 'save_recipe' | 
      'add_to_meal_plan' | 'add_to_grocery_list' | 'answer_food_question'
```

### Confirmation Flow
1. AI detects intent → returns action with `requires_confirmation: true`
2. ChatPage displays confirmation buttons
3. User clicks yes/no
4. If yes → execute action
5. If no → cancel action

### Nutrition Calculation
- Use OpenAI to extract food items and amounts
- Calculate nutrition per item
- Sum totals
- Return structured data

