// Cari Takip — istemci tarafı tipler
export interface CariAccount {
  id: number;
  name: string;
  phone?: string | null;
  tax_info?: string | null;
  address?: string | null;
}

export type CariType = 'borc' | 'satis' | 'alacak';

export interface CariTransaction {
  id: number;
  account_id: number;
  date: string;
  description: string;
  type: CariType;
  amount: number;
  payment_method?: string | null;
  installments?: string | null;
}

export interface CariUser {
  id: number;
  username: string;
  created_at?: string;
}

export const PAYMENT_METHODS: Record<string, string> = {
  havale: 'Havale / EFT',
  'kart-tek': 'Kredi Kartı (Tek Çekim)',
  'kart-taksit': 'Kredi Kartı (Taksitli)',
  cek: 'Çek / Senet',
  nakit: 'Nakit Kasa',
};

export const PAYMENT_METHOD_SHORT: Record<string, string> = {
  havale: 'Havale',
  'kart-tek': 'KK Tek',
  'kart-taksit': 'KK Taksit',
  cek: 'Çek/Senet',
  nakit: 'Nakit',
};

export const currencyFmt = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

export const dateFmt = (d: string | Date) =>
  new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
