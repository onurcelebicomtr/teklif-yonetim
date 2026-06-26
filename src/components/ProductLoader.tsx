'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchExchangeRates } from '@/lib/helpers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const BRAND_FILES: Record<string, string> = {
  guclumutfak: '/products-guclumutfak.json',
  mutpro: '/products-mutpro.json',
  inoks: '/products-inoks.json',
};

const PACKAGE_FILES: Record<string, string> = {
  guclumutfak: '/packages-guclumutfak.json',
  mutpro: '/packages-mutpro.json',
  inoks: '/packages-inoks.json',
};

export default function ProductLoader() {
  const { setProducts, setRates, setPackages, fetchCustomers, fetchProposals, fetchOrders } = useAppStore();
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const loaded = useRef(false);

  useEffect(() => {
    if (!hasHydrated || loaded.current) return;
    loaded.current = true;

    // Load products: Supabase first, then merge with JSON seed data
    const loadProducts = async () => {
      // 1. JSON dosyalarından seed ürünleri yükle
      const jsonProducts: any[] = [];
      for (const [brandId, file] of Object.entries(BRAND_FILES)) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            jsonProducts.push(...data);
            console.log(`✅ ${data.length} ${brandId} ürünü JSON'dan yüklendi.`);
          }
        } catch (err) {
          console.warn(`${brandId} ürünleri yüklenemedi:`, err);
        }
      }

      // Önce JSON ürünlerini hemen göster (hızlı yükleme)
      if (jsonProducts.length > 0) {
        const currentProducts = useAppStore.getState().products;
        const manualProducts = currentProducts.filter(
          (p) => !jsonProducts.some((jp) => jp.id === p.id)
        );
        setProducts([...jsonProducts, ...manualProducts]);
        console.log(`✅ ${jsonProducts.length} ürün JSON'dan hemen yüklendi.`);
      }

      if (isSupabaseConfigured()) {
        // Arka planda Supabase'den tüm ürünleri çek (1000 limit aşımı için pagination)
        let dbList: any[] = [];
        let page = 0;
        const PAGE_SIZE = 1000;
        while (true) {
          const { data, error } = await supabase.from('products').select('*').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (error) { console.error('Supabase products fetch error:', error); break; }
          if (!data || data.length === 0) break;
          dbList = dbList.concat(data);
          if (data.length < PAGE_SIZE) break;
          page++;
        }

        if (dbList.length > 0) {
          const dbIds = new Set(dbList.map((p) => p.id));

          // JSON'daki ürünleri Supabase'de yoksa ekle (seed)
          const newJsonProducts = jsonProducts.filter((p) => !dbIds.has(p.id));
          if (newJsonProducts.length > 0) {
            const { error: seedErr } = await supabase.from('products').upsert(newJsonProducts);
            if (seedErr) console.error('Supabase product seed error:', seedErr);
            else console.log(`✅ ${newJsonProducts.length} yeni ürün Supabase'e aktarıldı.`);
          }

          // Supabase verisiyle güncelle (JSON + Supabase birleşik)
          const jsonFresh = jsonProducts.filter((p) => !dbIds.has(p.id));
          setProducts([...dbList, ...jsonFresh]);
          console.log(`✅ Ürünler Supabase'den güncellendi: ${dbList.length + jsonFresh.length} ürün`);
        }
      }
    };

    // Load exchange rates from TCMB
    const loadRates = async () => {
      try {
        const rates = await fetchExchangeRates();
        setRates(rates);
        console.log(`✅ Döviz kurları yüklendi: €1 = ₺${rates.eur}`);
      } catch (err) {
        console.warn('Döviz kurları yüklenemedi:', err);
      }
    };

    // Load packages: Supabase first, then merge with JSON seed data
    const loadPackages = async () => {
      const jsonPackages: any[] = [];
      const seenIds = new Set<string>();
      for (const [brandId, file] of Object.entries(PACKAGE_FILES)) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            const unique = data.filter((p: any) => {
              if (seenIds.has(p.id)) return false;
              seenIds.add(p.id);
              return true;
            });
            jsonPackages.push(...unique);
            console.log(`✅ ${unique.length} ${brandId} paketi JSON'dan yüklendi.`);
          }
        } catch (err) {
          console.warn(`${brandId} paketleri yüklenemedi:`, err);
        }
      }

      if (isSupabaseConfigured()) {
        const { data: dbPackages, error } = await supabase.from('packages').select('*');
        if (error) {
          console.error('Supabase packages fetch error:', error);
        }

        const dbList = (dbPackages || []) as any[];
        const dbIds = new Set(dbList.map((p) => p.id));

        // JSON'daki paketleri Supabase'e seed et (sadece Supabase'de hiç yoksa)
        const newJsonPkgs = jsonPackages.filter((p) => !dbIds.has(p.id));
        if (newJsonPkgs.length > 0) {
          const seedData = newJsonPkgs.map((p) => ({ id: p.id, brand_id: p.brand_id, name: p.name, items: p.items || [] }));
          const { error: seedErr } = await supabase.from('packages').upsert(seedData);
          if (seedErr) console.error('Supabase package seed error:', seedErr);
          else console.log(`✅ ${newJsonPkgs.length} yeni paket Supabase'e aktarıldı.`);
        }

        // Supabase = tek kaynak (source of truth). Local veri karıştırılmaz.
        const dbPkgs = dbList.map((row: any) => ({ id: row.id, brand_id: row.brand_id, name: row.name, items: row.items || [] }));
        const seedPkgs = newJsonPkgs.map((p: any) => ({ id: p.id, brand_id: p.brand_id, name: p.name, items: p.items || [] }));
        setPackages([...dbPkgs, ...seedPkgs]);
        console.log(`✅ Paketler Supabase'den yüklendi: ${dbPkgs.length + seedPkgs.length} paket`);
      } else {
        if (jsonPackages.length > 0) {
          const currentPackages = useAppStore.getState().packages;
          const jsonIds = new Set(jsonPackages.map((p) => p.id));
          const localOnlyPkgs = currentPackages.filter((p) => !jsonIds.has(p.id));
          setPackages([...jsonPackages, ...localOnlyPkgs]);
        }
      }
    };

    loadProducts();
    loadRates();
    loadPackages();
    // Müşteri ve teklifleri de Supabase'den çek
    if (isSupabaseConfigured()) {
      fetchCustomers();
      fetchProposals();
      fetchOrders();
    }
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
