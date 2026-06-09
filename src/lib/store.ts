'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { Product, Customer, Proposal, PackageTemplate, ProposalItem } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

// ---------- IndexedDB storage (localStorage 5 MB limitini kaldırır) ----------
const DB_NAME = 'teklif-yonetim-db';
const STORE_NAME = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      // Tek seferlik localStorage → IndexedDB göçü
      const local = localStorage.getItem(name);
      if (local) {
        try {
          const db = await getDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(local, name);
          await new Promise<void>((r) => { tx.oncomplete = () => r(); });
          localStorage.removeItem(name);
        } catch { /* göç başarısız, local veriyle devam */ }
        return local;
      }
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(name);
      return new Promise((resolve) => {
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, name);
      await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
    } catch (err) { console.error('IndexedDB setItem error:', err); }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(name);
      await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
    } catch (err) { console.error('IndexedDB removeItem error:', err); }
  },
};
// ---------- end IndexedDB storage ----------

interface AppState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  currentBrand: string;
  setCurrentBrand: (brand: string) => void;

  // Products (synced with Supabase)
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  fetchProducts: () => Promise<void>;

  // Customers (synced with Supabase)
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  fetchCustomers: () => Promise<void>;

  // Proposals (synced with Supabase)
  proposals: Proposal[];
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => Promise<void>;
  updateProposal: (id: string, data: Partial<Proposal>) => Promise<void>;
  removeProposal: (id: string) => Promise<void>;
  fetchProposals: () => Promise<void>;

  // Packages (synced with Supabase)
  packages: PackageTemplate[];
  setPackages: (packages: PackageTemplate[]) => void;
  addPackage: (pkg: PackageTemplate) => Promise<void>;
  updatePackage: (id: string, data: Partial<PackageTemplate>) => Promise<void>;
  removePackage: (id: string) => Promise<void>;
  fetchPackages: () => Promise<void>;

  // Fetch all data from Supabase at once
  fetchAllData: () => Promise<void>;

  // Current proposal being edited
  currentItems: ProposalItem[];
  setCurrentItems: (items: ProposalItem[]) => void;
  addCurrentItem: (item: ProposalItem) => void;
  removeCurrentItem: (id: string) => void;
  updateCurrentItem: (id: string, data: Partial<ProposalItem>) => void;

  // Exchange rates
  rates: { usd: number; eur: number; gbp: number };
  setRates: (rates: { usd: number; eur: number; gbp: number }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      currentBrand: '',
      setCurrentBrand: (brand) => set({ currentBrand: brand }),

      products: [],
      setProducts: (products) => set({ products }),
      addProduct: async (product) => {
        set((s) => ({ products: [...s.products, product] }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('products').upsert(product); if (error) console.error('Supabase addProduct error:', error); } catch (e: unknown) { console.error('Supabase addProduct network error:', e); } })();
        }
      },
      updateProduct: async (id, data) => {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id); if (error) console.error('Supabase updateProduct error:', error); } catch (e: unknown) { console.error('Supabase updateProduct network error:', e); } })();
        }
      },
      removeProduct: async (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('products').delete().eq('id', id); if (error) console.error('Supabase removeProduct error:', error); } catch (e: unknown) { console.error('Supabase removeProduct network error:', e); } })();
        }
      },
      fetchProducts: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
          if (error) { console.error('Supabase fetchProducts error:', error); return; }
          if (data) {
            // Supabase = tek kaynak (source of truth)
            set({ products: data as Product[] });
          }
        } catch (e) { console.error('Supabase fetchProducts network error:', e); }
      },

      customers: [],
      setCustomers: (customers) => set({ customers }),
      addCustomer: async (customer) => {
        set((s) => ({ customers: [...s.customers, customer] }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('customers').upsert(customer); if (error) console.error('Supabase addCustomer error:', error); } catch (e: unknown) { console.error('Supabase addCustomer network error:', e); } })();
        }
      },
      updateCustomer: async (id, data) => {
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('customers').update(data).eq('id', id); if (error) console.error('Supabase updateCustomer error:', error); } catch (e: unknown) { console.error('Supabase updateCustomer network error:', e); } })();
        }
      },
      removeCustomer: async (id) => {
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('customers').delete().eq('id', id); if (error) console.error('Supabase removeCustomer error:', error); } catch (e: unknown) { console.error('Supabase removeCustomer network error:', e); } })();
        }
      },
      fetchCustomers: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
          if (error) { console.error('Supabase fetchCustomers error:', error); return; }
          if (data) {
            // Supabase = tek kaynak (source of truth)
            set({ customers: data as Customer[] });
          }
        } catch (e) { console.error('Supabase fetchCustomers network error:', e); }
      },

      proposals: [],
      setProposals: (proposals) => set({ proposals }),

      addProposal: async (proposal) => {
        set((s) => ({ proposals: [proposal, ...s.proposals] }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('proposals').upsert({
              id: proposal.id, brand_id: proposal.brand_id, proposal_no: proposal.proposal_no,
              proposal_date: proposal.proposal_date, project_name: proposal.project_name,
              customer_name: proposal.customer_name, customer_phone: proposal.customer_phone,
              customer_city: proposal.customer_city, customer_address: proposal.customer_address,
              prepared_by: proposal.prepared_by, items: proposal.items,
              discount_value: proposal.discount_value, currency: proposal.currency,
              include_vat: proposal.include_vat, conditions: proposal.conditions,
              global_hide_prices: proposal.global_hide_prices, status: proposal.status, total: proposal.total,
            });
            if (error) console.error('Supabase addProposal error:', error);
          } catch (e: unknown) { console.error('Supabase addProposal network error:', e); }
        }
      },

      updateProposal: async (id, data) => {
        set((s) => ({
          proposals: s.proposals.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('proposals').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) console.error('Supabase updateProposal error:', error);
          } catch (e: unknown) { console.error('Supabase updateProposal network error:', e); }
        }
      },

      removeProposal: async (id) => {
        set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) }));
        // Supabase arka planda senkronize
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('proposals').delete().eq('id', id); if (error) console.error('Supabase removeProposal error:', error); } catch (e: unknown) { console.error('Supabase removeProposal network error:', e); } })();
        }
      },

      fetchProposals: async () => {
        if (!isSupabaseConfigured()) return;
        try {
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase fetchProposals error:', error);
          return;
        }
        if (data) {
          const supabaseProposals: Proposal[] = data.map((row: any) => ({
            id: row.id,
            brand_id: row.brand_id,
            proposal_no: row.proposal_no || '',
            proposal_date: row.proposal_date || '',
            project_name: row.project_name || '',
            customer_name: row.customer_name || '',
            customer_phone: row.customer_phone || '',
            customer_city: row.customer_city || '',
            customer_address: row.customer_address || '',
            prepared_by: row.prepared_by || '',
            items: row.items || [],
            discount_value: row.discount_value || 0,
            currency: row.currency || 'TRY',
            include_vat: row.include_vat ?? true,
            conditions: row.conditions || '',
            global_hide_prices: row.global_hide_prices || false,
            status: row.status || 'draft',
            total: row.total || 0,
          }));
          // Supabase = tek kaynak (source of truth)
          set({ proposals: supabaseProposals });
        }
        } catch (e) { console.error('Supabase fetchProposals network error:', e); }
      },

      packages: [],
      setPackages: (packages) => set({ packages }),
      addPackage: async (pkg) => {
        set((s) => ({ packages: [...s.packages, pkg] }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('packages').upsert({ id: pkg.id, brand_id: pkg.brand_id, name: pkg.name, items: pkg.items }); if (error) console.error('Supabase addPackage error:', error); } catch (e: unknown) { console.error('Supabase addPackage network error:', e); } })();
        }
      },
      updatePackage: async (id, data) => {
        set((s) => ({ packages: s.packages.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('packages').update(data).eq('id', id); if (error) console.error('Supabase updatePackage error:', error); } catch (e: unknown) { console.error('Supabase updatePackage network error:', e); } })();
        }
      },
      removePackage: async (id) => {
        set((s) => ({ packages: s.packages.filter((p) => p.id !== id) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('packages').delete().eq('id', id); if (error) console.error('Supabase removePackage error:', error); } catch (e: unknown) { console.error('Supabase removePackage network error:', e); } })();
        }
      },
      fetchPackages: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
          if (error) { console.error('Supabase fetchPackages error:', error); return; }
          if (data) {
            // Supabase = tek kaynak (source of truth)
            const dbPkgs: PackageTemplate[] = data.map((row: any) => ({ id: row.id, brand_id: row.brand_id, name: row.name, items: row.items || [] }));
            set({ packages: dbPkgs });
          }
        } catch (e) { console.error('Supabase fetchPackages network error:', e); }
      },

      fetchAllData: async () => {
        if (!isSupabaseConfigured()) return;
        const store = get() as AppState;
        await Promise.all([store.fetchProducts(), store.fetchCustomers(), store.fetchProposals(), store.fetchPackages()]);
      },

      currentItems: [],
      setCurrentItems: (items) => set({ currentItems: items }),
      addCurrentItem: (item) => set((s) => ({ currentItems: [...s.currentItems, item] })),
      removeCurrentItem: (id) => set((s) => ({ currentItems: s.currentItems.filter((i) => i.id !== id) })),
      updateCurrentItem: (id, data) =>
        set((s) => ({
          currentItems: s.currentItems.map((i) => (i.id === id ? { ...i, ...data } : i)),
        })),

      rates: { usd: 38, eur: 41, gbp: 48 },
      setRates: (rates) => set({ rates }),
    }),
    {
      name: 'teklif-yonetim-store',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        currentBrand: state.currentBrand,
        customers: state.customers,
        proposals: state.proposals,
        packages: state.packages,
        rates: state.rates,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
