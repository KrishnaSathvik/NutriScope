import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getGroceryLists, createGroceryList, updateGroceryList, deleteGroceryList, toggleGroceryItem, generateGroceryListFromMealPlan } from '@/services/groceryLists'
import { getCurrentWeekMealPlan } from '@/services/mealPlanning'
import { GroceryList, GroceryItem } from '@/types'
import PullToRefresh from '@/components/PullToRefresh'
import { format, startOfWeek } from 'date-fns'
import { Plus, Trash2, X, ShoppingCart, CheckCircle2, Circle, Package, Edit, Check, ChefHat } from 'lucide-react'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export default function GroceryListPage() {
  const { user } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemUnit, setNewItemUnit] = useState('g')
  const [editingItemIndex, setEditingItemIndex] = useState<{ listId: string; itemIndex: number } | null>(null)
  const [editQuantity, setEditQuantity] = useState(1)
  const [editUnit, setEditUnit] = useState('g')
  const queryClient = useQueryClient()

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Set up realtime subscriptions
  useUserRealtimeSubscription('grocery_lists', ['groceryLists'], user?.id)
  useUserRealtimeSubscription('meal_plans', ['mealPlan'], user?.id)

  const { data: groceryLists = [], isLoading } = useQuery({
    queryKey: ['groceryLists'],
    queryFn: getGroceryLists,
    enabled: !!user,
  })

  const { data: mealPlan } = useQuery({
    queryKey: ['mealPlan', weekStart],
    queryFn: getCurrentWeekMealPlan,
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: createGroceryList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
      setShowAddForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<GroceryList> }) =>
      updateGroceryList(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGroceryList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const toggleItemMutation = useMutation({
    mutationFn: ({ listId, itemIndex }: { listId: string; itemIndex: number }) =>
      toggleGroceryItem(listId, itemIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const updateItemQuantityMutation = useMutation({
    mutationFn: ({ listId, itemIndex, quantity, unit }: { listId: string; itemIndex: number; quantity: number; unit: string }) => {
      const list = groceryLists.find(l => l.id === listId)
      if (!list) throw new Error('List not found')
      
      const updatedItems = [...list.items]
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity,
        unit,
      }
      
      return updateGroceryList(listId, { items: updatedItems })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
      setEditingItemIndex(null)
    },
  })

  const handleStartEdit = (listId: string, itemIndex: number) => {
    const list = groceryLists.find(l => l.id === listId)
    if (!list) return
    
    const item = list.items[itemIndex]
    setEditingItemIndex({ listId, itemIndex })
    setEditQuantity(item.quantity)
    setEditUnit(item.unit)
  }

  const handleSaveEdit = (listId: string, itemIndex: number) => {
    updateItemQuantityMutation.mutate({
      listId,
      itemIndex,
      quantity: editQuantity,
      unit: editUnit,
    })
  }

  const handleCancelEdit = () => {
    setEditingItemIndex(null)
    setEditQuantity(1)
    setEditUnit('g')
  }

  const generateFromPlanMutation = useMutation({
    mutationFn: (weekStartDate: string) => generateGroceryListFromMealPlan(weekStartDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
    },
  })

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
  }

  const handleAddItem = (listId: string) => {
    if (!newItemName.trim()) return

    const list = groceryLists.find(l => l.id === listId)
    if (!list) return

    const newItem: GroceryItem = {
      name: newItemName.trim(),
      quantity: newItemQuantity,
      unit: newItemUnit,
      checked: false,
      category: 'other',
    }

    updateMutation.mutate({
      id: listId,
      updates: {
        items: [...list.items, newItem],
      },
    })

    setNewItemName('')
    setNewItemQuantity(1)
    setNewItemUnit('g')
  }

  const handleCreateList = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      name: formData.get('name') as string,
      items: [],
    })
  }

  const getItemsByCategory = (items: GroceryItem[]) => {
    const categories: Record<string, GroceryItem[]> = {}
    items.forEach(item => {
      const cat = item.category || 'other'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(item)
    })
    return categories
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={!user}>
      <div className="space-y-4 md:space-y-8 px-3 md:px-0 pb-20 md:pb-0">
        {/* Header */}
        <div className="border-b border-border pb-4 md:pb-6 px-3 md:px-0 -mx-3 md:mx-0">
          <div className="px-3 md:px-0">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div className="h-px w-6 md:w-8 bg-acid"></div>
              <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">
                {format(new Date(), 'EEEE, MMMM d, yyyy').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter mt-2 md:mt-4">
                Grocery Lists
              </h1>
              <div className="flex gap-2">
                {mealPlan && (
                  <button
                    onClick={() => generateFromPlanMutation.mutate(weekStart)}
                    disabled={generateFromPlanMutation.isPending}
                    className="btn-secondary text-xs md:text-sm px-3 md:px-4 py-2 gap-2"
                    title="Generate grocery list from meal plan"
                  >
                    <ChefHat className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">From Meal Plan</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-secondary gap-2 text-xs md:text-sm px-3 md:px-4 py-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create New List Form */}
        {showAddForm && (
          <div className="card-modern border-acid/30 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-widest font-mono">
                New Grocery List
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-dim hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-wider text-dim mb-2">
                  List Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input-modern"
                  placeholder="e.g., Weekly Shopping"
                  defaultValue="Shopping List"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create List'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Grocery Lists */}
        {isLoading ? (
          <div className="text-center py-12 text-dim font-mono text-xs">Loading lists...</div>
        ) : groceryLists.length > 0 ? (
          <div className="space-y-4">
            {groceryLists.map((list) => {
              const itemsByCategory = getItemsByCategory(list.items)
              const checkedCount = list.items.filter(i => i.checked).length
              const totalItems = list.items.length

              return (
                <div key={list.id} className="card-modern p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-acid" />
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-text font-mono uppercase">
                          {list.name}
                        </h2>
                        <div className="text-[10px] md:text-xs text-dim font-mono">
                          {checkedCount} / {totalItems} items
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(list.id)}
                      className="text-error hover:text-error/80 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {totalItems > 0 && (
                    <div className="mb-4">
                      <div className="relative w-full bg-border h-2 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-emerald-500 dark:bg-emerald-500 transition-all duration-300"
                          style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Items by Category */}
                  {Object.keys(itemsByCategory).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(itemsByCategory).map(([category, items]) => (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-3 h-3 text-dim" />
                            <h3 className="text-xs font-mono uppercase text-dim">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {items.map((item, idx) => {
                              const itemIndex = list.items.indexOf(item)
                              const isEditing = editingItemIndex?.listId === list.id && editingItemIndex?.itemIndex === itemIndex
                              
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-3 p-2 rounded-sm border transition-all ${
                                    item.checked
                                      ? 'bg-panel border-success/30 opacity-60'
                                      : 'bg-surface border-border hover:border-acid/50'
                                  }`}
                                >
                                  <button
                                    onClick={() => toggleItemMutation.mutate({ listId: list.id, itemIndex })}
                                    className="flex-shrink-0"
                                    disabled={isEditing}
                                  >
                                    {item.checked ? (
                                      <CheckCircle2 className="w-5 h-5 text-success" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-dim" />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-mono text-sm ${item.checked ? 'line-through text-dim' : 'text-text'}`}>
                                      {item.name}
                                    </div>
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <input
                                        type="number"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(Number(e.target.value) || 0)}
                                        min="0"
                                        step="0.01"
                                        className="input-modern w-16 text-xs"
                                        autoFocus
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveEdit(list.id, itemIndex)
                                          } else if (e.key === 'Escape') {
                                            handleCancelEdit()
                                          }
                                        }}
                                      />
                                      <select
                                        value={editUnit}
                                        onChange={(e) => setEditUnit(e.target.value)}
                                        className="input-modern text-xs w-16"
                                      >
                                        <option value="g">g</option>
                                        <option value="kg">kg</option>
                                        <option value="ml">ml</option>
                                        <option value="l">l</option>
                                        <option value="cup">cup</option>
                                        <option value="piece">piece</option>
                                      </select>
                                      <button
                                        onClick={() => handleSaveEdit(list.id, itemIndex)}
                                        className="text-success hover:text-success/80 transition-colors p-1"
                                        disabled={updateItemQuantityMutation.isPending}
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="text-error hover:text-error/80 transition-colors p-1"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <div className="text-xs font-mono text-dim">
                                        {item.quantity} {item.unit}
                                      </div>
                                      {!item.checked && (
                                        <button
                                          onClick={() => handleStartEdit(list.id, itemIndex)}
                                          className="text-dim hover:text-acid transition-colors p-1"
                                          title="Edit quantity"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-dim font-mono text-xs">
                      No items yet. Add items below.
                    </div>
                  )}

                  {/* Add Item Form */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddItem(list.id)
                          }
                        }}
                        className="input-modern col-span-5"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(Number(e.target.value) || 1)}
                        min="0"
                        step="0.01"
                        className="input-modern col-span-2"
                        placeholder="Qty"
                      />
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="input-modern col-span-2"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="cup">cup</option>
                        <option value="piece">piece</option>
                      </select>
                      <button
                        onClick={() => handleAddItem(list.id)}
                        disabled={!newItemName.trim()}
                        className="btn-primary col-span-3 text-xs py-2"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card-modern text-center border-dashed py-12 md:py-16 px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-sm bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto mb-6 md:mb-8">
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-acid/60" />
            </div>
            <h3 className="text-text font-mono font-bold text-lg md:text-xl mb-3 md:mb-4">No grocery lists yet</h3>
            <p className="text-dim font-mono text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
              Create a list manually or use the button above to generate one from your meal plan
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary gap-2 text-sm md:text-base py-2.5 md:py-3 px-4 md:px-6"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>Create List</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}

