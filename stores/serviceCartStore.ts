import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ServiceCartItem {
  partId: string
  name: string
  partNumber?: string
  manufacturerPartNumber?: string
  type: string
  photoURL?: string
  quantity: number
}

export interface ServiceCartState {
  // Cart data
  items: ServiceCartItem[]
  
  // UI state
  isSubmitting: boolean
  lastSubmittedOrderId: string | null
  
  // Actions
  addItem: (part: Omit<ServiceCartItem, 'quantity'>, quantity?: number) => void
  removeItem: (partId: string) => void
  updateQuantity: (partId: string, quantity: number) => void
  clearCart: () => void
  
  // Computed getters
  getTotalItems: () => number
  getCartTotal: () => number // For future pricing integration
  
  // Submission state
  setSubmitting: (submitting: boolean) => void
  setLastSubmittedOrderId: (orderId: string | null) => void
}

export const useServiceCartStore = create<ServiceCartState>()(
  persist(
    (set, get) => ({
      items: [],
      isSubmitting: false,
      lastSubmittedOrderId: null,

      addItem: (part, quantity = 1) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            item => item.partId === part.partId
          )
          
          if (existingItemIndex >= 0) {
            // Update existing item quantity
            const updatedItems = [...state.items]
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + quantity
            }
            return { items: updatedItems }
          } else {
            // Add new item
            return {
              items: [...state.items, { ...part, quantity }]
            }
          }
        })
      },

      removeItem: (partId) => {
        set((state) => ({
          items: state.items.filter(item => item.partId !== partId)
        }))
      },

      updateQuantity: (partId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(partId)
          return
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.partId === partId
              ? { ...item, quantity }
              : item
          )
        }))
      },

      clearCart: () => {
        set({
          items: [],
          lastSubmittedOrderId: null
        })
      },

      getTotalItems: () => {
        const state = get()
        return state.items.reduce((total, item) => total + item.quantity, 0)
      },

      getCartTotal: () => {
        // For future pricing integration
        // Currently returns 0 as pricing is not implemented
        return 0
      },

      setSubmitting: (submitting) => {
        set({ isSubmitting: submitting })
      },

      setLastSubmittedOrderId: (orderId) => {
        set({ lastSubmittedOrderId: orderId })
      }
    }),
    {
      name: 'service-cart-state',
      // Persist cart items but not UI state
      partialize: (state) => ({
        items: state.items,
        lastSubmittedOrderId: state.lastSubmittedOrderId
      })
    }
  )
)