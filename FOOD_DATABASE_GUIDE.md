# Food Database Search - Implementation Guide

## Overview

The Food Database Search feature integrates with the **USDA FoodData Central API** to provide accurate nutrition data for meal logging. Users can search for foods and automatically populate meal forms with verified nutrition information.

## Features

- **Real-time Search**: Search USDA's comprehensive food database with 500ms debounce
- **Accurate Nutrition Data**: Calories, protein, carbs, fats, fiber, sugar, sodium
- **Auto-fill Forms**: Selected foods automatically populate meal form fields
- **Brand Information**: Shows brand names and serving sizes when available
- **Free API**: Uses USDA's public API (no API key required)

## How It Works

### 1. User Flow

1. User clicks "Search Food" button in meal logging form
2. Food search dialog opens with search input
3. User types food name (e.g., "chicken breast", "apple")
4. Results appear after 2+ characters with debounce
5. User selects a food item
6. Form fields auto-populate with nutrition data
7. User can adjust values and submit meal

### 2. Technical Implementation

#### Service Layer (`src/services/foodDatabase.ts`)

- **`searchFoods(query, pageNumber, pageSize)`**: Searches USDA FoodData Central API
  - POST request to `https://api.nal.usda.gov/fdc/v1/foods/search`
  - Filters by Foundation Foods and Standard Reference Legacy
  - Transforms API response to `FoodItem` format
  - Extracts nutrients using USDA nutrient IDs:
    - 1008 = Energy (kcal)
    - 1003 = Protein
    - 1005 = Carbohydrate
    - 1004 = Total lipid (fat)
    - 1079 = Fiber
    - 2000 = Sugars
    - 1093 = Sodium

- **`getFoodDetails(fdcId)`**: Fetches detailed food information by FDC ID

- **`formatServingSize(food)`**: Formats serving size for display

#### Component (`src/components/FoodSearch.tsx`)

- Modal dialog with search input
- Debounced search (500ms delay)
- Results list with nutrition preview
- Loading states and error handling
- Responsive design for mobile/desktop

#### Integration (`src/pages/MealsPage.tsx`)

- "Search Food" button in meal form
- `FoodSearch` component integration
- Auto-fill form fields on food selection
- Form field IDs for programmatic updates

## API Details

### USDA FoodData Central API

- **Base URL**: `https://api.nal.usda.gov/fdc/v1`
- **Search Endpoint**: `POST /foods/search`
- **Details Endpoint**: `GET /food/{fdcId}`
- **Rate Limits**: Public API, reasonable use expected
- **Data Types**: Foundation Foods, SR Legacy, Branded Foods

### Request Format

```json
{
  "query": "chicken breast",
  "pageNumber": 1,
  "pageSize": 50,
  "dataType": ["Foundation", "SR Legacy"],
  "sortBy": "dataType.keyword",
  "sortOrder": "asc"
}
```

### Response Format

```json
{
  "foods": [
    {
      "fdcId": 171077,
      "description": "Chicken, broiler, rotisserie, BBQ, breast meat only",
      "foodNutrients": [
        { "nutrientId": 1008, "value": 144 },
        { "nutrientId": 1003, "value": 28.74 },
        ...
      ]
    }
  ],
  "totalHits": 150,
  "currentPage": 1
}
```

## Data Structure

### FoodItem Interface

```typescript
interface FoodItem {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber?: number
  sugar?: number
  sodium?: number
}
```

## Usage Example

```typescript
import { searchFoods } from '@/services/foodDatabase'

// Search for foods
const results = await searchFoods('chicken breast', 1, 20)

// Access results
results.foods.forEach(food => {
  console.log(`${food.description}: ${food.calories} kcal`)
})
```

## Benefits

1. **Accuracy**: USDA data is verified and standardized
2. **Comprehensive**: 300,000+ foods in database
3. **Free**: No API key or cost required
4. **Fast**: Cached results for 5 minutes
5. **User-Friendly**: Simple search interface

## Limitations

1. **USDA Focus**: Primarily US foods (some international)
2. **Serving Sizes**: May need adjustment for user portions
3. **Branded Foods**: Limited brand information
4. **API Rate Limits**: Public API has reasonable use limits

## Future Enhancements

- [ ] Cache frequently searched foods in Supabase
- [ ] Add portion size multiplier (e.g., 1.5x serving)
- [ ] Save favorite foods to user profile
- [ ] Integration with Chat AI for food suggestions
- [ ] Barcode scanning integration (planned feature)
- [ ] Custom food entries with nutrition data

## Testing

To test the food database search:

1. Navigate to Meals page
2. Click "Add Meal"
3. Click "Search Food" button
4. Type a food name (e.g., "apple", "chicken", "rice")
5. Select a food from results
6. Verify form fields are populated
7. Adjust values if needed and submit

## Troubleshooting

**No results found:**
- Try different search terms
- Check spelling
- Use generic terms (e.g., "chicken" instead of "organic chicken breast")

**API errors:**
- Check internet connection
- Verify API endpoint is accessible
- Check browser console for errors

**Form not auto-filling:**
- Ensure form is visible when selecting food
- Check browser console for JavaScript errors
- Verify form field IDs match

## References

- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [API Documentation](https://fdc.nal.usda.gov/api-guide.html)
- [FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide.html)

