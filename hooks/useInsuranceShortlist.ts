import { create } from 'zustand';
import type { CatalogueItem } from '@/types/insurance';

const MAX_COMPARE = 4;

interface ShortlistState {
  items: CatalogueItem[];
  toggle: (item: CatalogueItem) => boolean; // returns false if limit reached
  has: (productVersionId: number) => boolean;
  clear: () => void;
}

/**
 * Shortlist is a device-local, in-memory comparison basket (max 4). It holds only public catalogue data -
 * no personal data - so nothing sensitive is persisted.
 */
export const useInsuranceShortlist = create<ShortlistState>((set, get) => ({
  items: [],
  toggle: (item) => {
    const cur = get().items;
    if (cur.some((i) => i.productVersionId === item.productVersionId)) {
      set({ items: cur.filter((i) => i.productVersionId !== item.productVersionId) });
      return true;
    }
    if (cur.length >= MAX_COMPARE) return false;
    set({ items: [...cur, item] });
    return true;
  },
  has: (id) => get().items.some((i) => i.productVersionId === id),
  clear: () => set({ items: [] }),
}));

export const MAX_SHORTLIST = MAX_COMPARE;
