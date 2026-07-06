// Stok Yönetimi — istemci tarafı tipler
export interface StokProduct {
  id: number;
  code: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  store_boxed: number;      // Mağaza Kutulu
  store_unboxed: number;    // Mağaza Kutusuz
  warehouse_boxed: number;  // Alt Depo Kutulu
  warehouse_unboxed: number;// Alt Depo Kutusuz
  cost: number;             // maliyet (girildiği para biriminde)
  cost_currency: string;    // 'TRY' | 'USD' | 'EUR'
  sale_price: number;       // satış fiyatı (₺)
  sale_manual: boolean;     // satış elle mi girildi
}

export const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
export const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
export const SALE_MARKUP = 1.25; // maliyet + %25

export const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Maliyeti ₺'ye çevirir (rates: 1 birim = kaç ₺)
export const costToTRY = (cost: number, currency: string, rates: { usd: number; eur: number }) => {
  const rate = currency === 'USD' ? rates.usd : currency === 'EUR' ? rates.eur : 1;
  return (Number(cost) || 0) * rate;
};

// Stok kovaları — yer + paket türü
export type StokLocation = 'store' | 'warehouse';
export type StokPack = 'boxed' | 'unboxed';

export const LOCATION_LABELS: Record<StokLocation, string> = {
  store: 'Mağaza',
  warehouse: 'Alt Depo',
};

export const PACK_LABELS: Record<StokPack, string> = {
  boxed: 'Kutulu',
  unboxed: 'Kutusuz',
};

// Kova alan adını üretir: store+boxed -> 'store_boxed'
export const bucketField = (loc: StokLocation, pack: StokPack) =>
  `${loc}_${pack}` as keyof Pick<StokProduct, 'store_boxed' | 'store_unboxed' | 'warehouse_boxed' | 'warehouse_unboxed'>;

export const storeTotal = (p: StokProduct) => p.store_boxed + p.store_unboxed;
export const warehouseTotal = (p: StokProduct) => p.warehouse_boxed + p.warehouse_unboxed;
export const grandTotal = (p: StokProduct) => storeTotal(p) + warehouseTotal(p);

export const numberFmt = new Intl.NumberFormat('tr-TR');
