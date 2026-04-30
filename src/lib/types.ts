export interface Product {
  id: string;
  brand_id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  image: string;
  product_link: string;
  category: string;
  currency: string;
  manufacturer?: string;
  sku?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  brand_id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  created_at?: string;
}

export interface ProposalItem {
  id: string;
  name: string;
  description: string;
  sku?: string;
  price: number;
  cost: number;
  quantity: number;
  image: string;
  product_link: string;
  item_discount: number;
  total: number;
  input_currency: string;
  exchange_rate: number;
  hide_price: boolean;
  shipped: boolean;
  type?: 'section' | 'product';
  description_format?: 'none' | 'numbered' | 'bullet';
}

export interface Proposal {
  id: string;
  brand_id: string;
  proposal_no: string;
  proposal_date: string;
  project_name: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  prepared_by: string;
  items: ProposalItem[];
  discount_value: number;
  currency: string;
  include_vat: boolean;
  conditions: string;
  global_hide_prices: boolean;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';
  total: number;
  pdf_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PackageTemplate {
  id: string;
  brand_id: string;
  name: string;
  items: PackageItem[];
  created_at?: string;
}

export interface PackageItem {
  name: string;
  description: string;
  price: number;
  cost: number;
  quantity: number;
  image: string;
  product_link: string;
  currency?: 'TRY' | 'EUR' | 'USD' | 'GBP';
}

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  viewed: 'Görüntülendi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
