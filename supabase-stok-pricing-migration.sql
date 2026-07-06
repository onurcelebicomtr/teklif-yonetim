-- ============================================
-- STOK: Fiyatlandırma sütunları (maliyet + satış)
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

ALTER TABLE stok_products
  ADD COLUMN IF NOT EXISTS cost NUMERIC NOT NULL DEFAULT 0,            -- maliyet tutarı (girildiği para biriminde)
  ADD COLUMN IF NOT EXISTS cost_currency TEXT NOT NULL DEFAULT 'TRY', -- 'TRY' | 'USD' | 'EUR'
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC NOT NULL DEFAULT 0,     -- satış fiyatı (₺)
  ADD COLUMN IF NOT EXISTS sale_manual BOOLEAN NOT NULL DEFAULT false;-- satış elle mi girildi (otomatik %25 kapalı mı)
