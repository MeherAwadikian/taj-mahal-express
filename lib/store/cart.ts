import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id:           string
  productId:    string
  variantId:    string
  title:        string
  variantTitle: string
  imageUrl:     string | null
  price:        number
  quantity:     number
  sellerId:     string
}

interface CartStore {
  items:     CartItem[]
  itemCount: number
  addItem:   (item: CartItem) => void
  updateQty: (variantId: string, quantity: number) => void
  removeItem:(variantId: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items:     [],
      itemCount: 0,

      addItem(item) {
        set(state => {
          const existing = state.items.find(i => i.variantId === item.variantId)
          const items = existing
            ? state.items.map(i =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              )
            : [...state.items, item]
          return { items, itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }
        })
      },

      updateQty(variantId, quantity) {
        set(state => {
          const items =
            quantity <= 0
              ? state.items.filter(i => i.variantId !== variantId)
              : state.items.map(i => (i.variantId === variantId ? { ...i, quantity } : i))
          return { items, itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }
        })
      },

      removeItem(variantId) {
        set(state => {
          const items = state.items.filter(i => i.variantId !== variantId)
          return { items, itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }
        })
      },

      clearCart() {
        set({ items: [], itemCount: 0 })
      },
    }),
    {
      name:    'tme-cart',
      version: 1,
    },
  ),
)
