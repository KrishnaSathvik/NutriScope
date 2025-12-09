import { supabase, isUsingDummyClient } from "@/lib/supabase";
import type { MealTemplate, MealType } from "@/types";
import { handleSupabaseError } from "@/lib/errors";

/**
 * Get all meal templates for a user
 */
export async function getMealTemplates(
  userId: string,
  mealType?: MealType
): Promise<MealTemplate[]> {
  if (isUsingDummyClient) {
    return [];
  }

  try {
    let query = supabase
      .from("meal_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (mealType) {
      query = query.eq("meal_type", mealType);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, "getMealTemplates");
      throw error;
    }

    return (data as MealTemplate[]) || [];
  } catch (error) {
    console.error("Error fetching meal templates:", error);
    return [];
  }
}

/**
 * Create a meal template from a meal
 */
export async function createMealTemplate(
  userId: string,
  meal: {
    name: string;
    description?: string;
    meal_type: MealType;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    image_url?: string;
  }
): Promise<MealTemplate | null> {
  if (isUsingDummyClient) {
    console.log("Using dummy client - skipping template creation");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("meal_templates")
      .insert({
        user_id: userId,
        ...meal,
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "createMealTemplate");
      throw error;
    }

    return data as MealTemplate;
  } catch (error) {
    console.error("Error creating meal template:", error);
    return null;
  }
}

/**
 * Update a meal template
 */
export async function updateMealTemplate(
  templateId: string,
  updates: Partial<MealTemplate>
): Promise<MealTemplate | null> {
  if (isUsingDummyClient) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("meal_templates")
      .update(updates)
      .eq("id", templateId)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "updateMealTemplate");
      throw error;
    }

    return data as MealTemplate;
  } catch (error) {
    console.error("Error updating meal template:", error);
    return null;
  }
}

/**
 * Delete a meal template
 */
export async function deleteMealTemplate(templateId: string): Promise<boolean> {
  if (isUsingDummyClient) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("meal_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      handleSupabaseError(error, "deleteMealTemplate");
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error deleting meal template:", error);
    return false;
  }
}

/**
 * Use a template to create a meal log
 */
export async function useMealTemplate(
  userId: string,
  templateId: string,
  date: string
): Promise<boolean> {
  if (isUsingDummyClient) {
    return false;
  }

  try {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from("meal_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw templateError || new Error("Template not found");
    }

    // Create meal from template
    const { error: mealError } = await supabase.from("meals").insert({
      user_id: userId,
      date,
      meal_type: template.meal_type,
      calories: template.calories || 0,
      protein: template.protein || 0,
      carbs: template.carbs,
      fats: template.fats,
      food_items: [],
    });

    if (mealError) {
      handleSupabaseError(mealError, "useMealTemplate");
      throw mealError;
    }

    return true;
  } catch (error) {
    console.error("Error using meal template:", error);
    return false;
  }
}

