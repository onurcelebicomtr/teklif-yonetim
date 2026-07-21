'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { formatCurrency, getCurrencySymbol, numberToText, generateProposalNo, getTodayDate, getValidityDate, getValidityText } from '@/lib/helpers';
import type { ProposalItem, Proposal, PackageTemplate, PackageItem } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import RichEditor, { renderRichHtml } from '@/components/RichEditor';
import AutoTextarea from '@/components/AutoTextarea';
import {
  Plus, Trash2, Copy, GripVertical, Eye, EyeOff, Truck, Save, FileDown,
  Printer, ArrowLeft, Search, Users, ChevronDown, RefreshCw, Package, UserCheck, AlertCircle, Boxes, X, Edit2,
  List, LayoutGrid, ImagePlus, Type, MessageCircle, StickyNote
} from 'lucide-react';

export default function YeniTeklifPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { products, customers, proposals, addProposal, updateProposal, addCustomer, addProduct, updateProduct, removeProduct, setProducts, rates, packages, addPackage, removePackage, setPackages } = useAppStore();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const editingProposal = editId ? proposals.find(p => p.id === editId) : null;
  const printRef = useRef<HTMLDivElement>(null);

  // Editable exchange rate (TCMB'den gelir, kullanıcı değiştirebilir)
  const [eurRate, setEurRate] = useState(rates.eur || 41);
  const [usdRate, setUsdRate] = useState(rates.usd || 38);
  const [gbpRate, setGbpRate] = useState(rates.gbp || 48);

  // Sync rates from store when they update
  useEffect(() => {
    if (rates.eur > 0) setEurRate(rates.eur);
    if (rates.usd > 0) setUsdRate(rates.usd);
    if (rates.gbp > 0) setGbpRate(rates.gbp);
  }, [rates]);

  const brandProducts = products.filter((p) => p.brand_id === brandId);
  const brandCustomers = customers.filter((c) => c.brand_id === brandId);

  const [proposalTitle, setProposalTitle] = useState('FİYAT TEKLİFİ');
  const [proposalNo, setProposalNo] = useState(generateProposalNo(brandId));
  const [proposalDate, setProposalDate] = useState(getTodayDate());
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [currency, setCurrency] = useState('TRY');
  const [inputCurrency] = useState('EUR'); // Ürünler EUR bazlı gelir
  const [discountValue, setDiscountValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [showVAT, setShowVAT] = useState(true);
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  const [preparedBy, setPreparedBy] = useState('');
  const [showIban, setShowIban] = useState(false);
  const [selectedIban, setSelectedIban] = useState<number>(0); // 0=hepsi, 1=kurumsal(güçlü reklam), 2=bireysel(buse), 3=kurumsal(güçlü inoks)
  const [installment, setInstallment] = useState<number>(0); // 0=taksit yok, 2-12=taksit sayısı
  const [showInstallment, setShowInstallment] = useState(false);
  const [conditions, setConditions] = useState(
    `- Bu teklif 3 gün süreyle geçerlidir.\n- Stok durumuna göre tarafınıza bilgilendirilmektedir.\n- Fiyatlarımıza KDV hariçtir (Listede hariç gösterilir, toplamda eklenir).`
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [viewMode, setViewMode] = useState<'liste' | 'katalog'>('liste');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // New item form
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });

  // New product form (kataloga kaydetme)
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', cost: '', image: '', product_link: '', sku: '' });
  const [newPriceList, setNewPriceList] = useState(''); // liste fiyatı (fiyat için)
  const [newPriceDiscount, setNewPriceDiscount] = useState(''); // iskonto % (fiyat için)
  const [newCostList, setNewCostList] = useState(''); // liste fiyatı (maliyet için)
  const [newCostDiscount, setNewCostDiscount] = useState(''); // iskonto % (maliyet için)
  const [newProductCurrency, setNewProductCurrency] = useState<'EUR' | 'TRY' | 'USD' | 'GBP'>('EUR');

  // Livesearch state for product name input
  const [nameSuggestions, setNameSuggestions] = useState<typeof brandProducts>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Package management
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageTemplate | null>(null);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPkgItem, setNewPkgItem] = useState({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  const [newPkgItemCurrency, setNewPkgItemCurrency] = useState<'TRY' | 'EUR' | 'USD' | 'GBP'>('TRY');
  const [pkgProductSearch, setPkgProductSearch] = useState('');
  const [showPkgProductSearch, setShowPkgProductSearch] = useState(false);
  const SHARED_PACKAGE_BRANDS = ['mutpro', 'guclumutfak'];
  const brandPackages = SHARED_PACKAGE_BRANDS.includes(brandId)
    ? packages.filter(p => SHARED_PACKAGE_BRANDS.includes(p.brand_id))
    : packages.filter(p => p.brand_id === brandId);

  // Load existing proposal for editing
  useEffect(() => {
    if (editingProposal && !isLoaded) {
      setProposalNo(editingProposal.proposal_no);
      setProposalDate(editingProposal.proposal_date);
      setProjectName(editingProposal.project_name);
      setCustomerName(editingProposal.customer_name);
      setCustomerPhone(editingProposal.customer_phone);
      setCustomerCity(editingProposal.customer_city);
      setCustomerAddress(editingProposal.customer_address);
      setPreparedBy(editingProposal.prepared_by);
      setItems(editingProposal.items || []);
      setCurrency(editingProposal.currency);
      setDiscountValue(editingProposal.discount_value);
      setGlobalHidePrices(editingProposal.global_hide_prices);
      setConditions(editingProposal.conditions);
      setIsLoaded(true);
    }
  }, [editingProposal, isLoaded]);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const addItem = useCallback((item?: Partial<ProposalItem>, skipCatalog?: boolean) => {
    const newEntry: ProposalItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: item?.name || newItem.name || '',
      description: item?.description || newItem.description || '',
      sku: item?.sku || '',
      price: item?.price || parseFloat(newItem.price) || 0,
      cost: item?.cost || parseFloat(newItem.cost) || 0,
      quantity: item?.quantity || parseInt(newItem.quantity) || 1,
      image: item?.image || newItem.image || '',
      product_link: item?.product_link || newItem.product_link || '',
      item_discount: item?.item_discount || 0,
      total: 0,
      input_currency: currency,
      exchange_rate: 1,
      hide_price: false,
      shipped: false,
    };
    if (!newEntry.name) return;
    newEntry.total = newEntry.price * (1 - newEntry.item_discount / 100) * newEntry.quantity;
    setItems((prev) => [...prev, newEntry]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  }, [newItem, currency]);

  const updateItem = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (['price', 'quantity', 'item_discount'].includes(field)) {
          const p = field === 'price' ? parseFloat(value) || 0 : updated.price;
          const q = field === 'quantity' ? parseInt(value) || 1 : updated.quantity;
          const d = field === 'item_discount' ? parseFloat(value) || 0 : updated.item_discount;
          updated.total = p * (1 - d / 100) * q;
        }
        return updated;
      })
    );
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const addSectionDivider = () => {
    const section: ProposalItem = {
      id: 'section-' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: 'ARA BÖLME',
      description: '',
      sku: '',
      price: 0,
      cost: 0,
      quantity: 0,
      image: '',
      product_link: '',
      item_discount: 0,
      total: 0,
      input_currency: 'TRY',
      exchange_rate: 1,
      hide_price: false,
      shipped: false,
      type: 'section',
    };
    setItems((prev) => [...prev, section]);
  };
  const duplicateItem = (index: number) => {
    const item = items[index];
    const dup = { ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) };
    setItems((prev) => [...prev.slice(0, index + 1), dup, ...prev.slice(index + 1)]);
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...items];
    const dragged = copy.splice(dragItem.current, 1)[0];
    copy.splice(dragOverItem.current, 0, dragged);
    setItems(copy);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Numaralı alana yazarak ürünü o ürün sırasına taşı (ara başlıklar hariç sayılır)
  const moveItemToPosition = (itemId: string, targetPos: number) => {
    setItems((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((i) => i.id === itemId);
      if (from === -1) return prev;
      const [moved] = arr.splice(from, 1);
      const productCount = arr.filter((i) => i.type !== 'section').length;
      const pos = Math.max(1, Math.min(targetPos, productCount + 1));
      let count = 0, insertAt = arr.length;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].type !== 'section') {
          count++;
          if (count === pos) { insertAt = i; break; }
        }
      }
      arr.splice(insertAt, 0, moved);
      return arr;
    });
  };

  // Ürün fiyatını TRY'ye çevir (ürün currency'sine göre)
  const productPriceToTry = (amount: number, productCurrency?: string) => {
    const cur = (productCurrency || 'TRY').toUpperCase();
    if (cur === 'TRY') return amount;
    if (cur === 'EUR') return Math.round(amount * eurRate * 100) / 100;
    if (cur === 'USD') return Math.round(amount * usdRate * 100) / 100;
    if (cur === 'GBP') return Math.round(amount * gbpRate * 100) / 100;
    return amount;
  };

  const addFromProduct = (p: any) => {
    const priceInTry = productPriceToTry(p.price, p.currency);
    const costInTry = productPriceToTry(p.cost || 0, p.currency);
    addItem({ name: p.name, description: '', sku: p.sku || '', price: priceInTry, cost: costInTry, image: p.image, product_link: p.product_link, quantity: 1 });
    setShowProductSearch(false);
    setProductSearch('');
    setShowNameSuggestions(false);
    setNameSuggestions([]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  };

  const handleNameInput = (value: string) => {
    setNewItem({ ...newItem, name: value });
    if (value.length >= 2 && brandProducts.length > 0) {
      const words = value.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      const matches = brandProducts.filter((p) => {
        const text = [p.name, p.sku || '', p.category || '', p.manufacturer || ''].join(' ').toLowerCase();
        return words.every(w => text.includes(w));
      }).slice(0, 30);
      setNameSuggestions(matches);
      setShowNameSuggestions(matches.length > 0);
    } else {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
  };

  const selectSuggestion = (p: any) => {
    const priceInTry = productPriceToTry(p.price, p.currency);
    const costInTry = productPriceToTry(p.cost || 0, p.currency);
    addItem({ name: p.name, description: '', sku: p.sku || '', price: priceInTry, cost: costInTry, image: p.image, product_link: p.product_link, quantity: 1 });
    setShowNameSuggestions(false);
    setNameSuggestions([]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  };

  const selectCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerCity(c.city);
    setCustomerAddress(c.address);
    setShowCustomerPicker(false);
  };

  const convertToTry = (amount: number, fromCurrency: string) => {
    if (fromCurrency === 'TRY') return amount;
    if (fromCurrency === 'EUR') return Math.round(amount * eurRate * 100) / 100;
    if (fromCurrency === 'USD') return Math.round(amount * usdRate * 100) / 100;
    if (fromCurrency === 'GBP') return Math.round(amount * gbpRate * 100) / 100;
    return amount;
  };

  // Yeni ürün oluştur ve kataloga kaydet
  const saveNewProduct = () => {
    if (!newProduct.name.trim()) return alert('Ürün adı zorunludur');
    const price = parseFloat(newProduct.price) || 0;
    const cost = parseFloat(newProduct.cost) || 0;
    const product = {
      id: `custom-${Date.now()}`,
      brand_id: brandId,
      name: newProduct.name.trim(),
      description: '',
      price,
      cost,
      image: newProduct.image.trim(),
      product_link: newProduct.product_link.trim(),
      category: newProduct.category.trim(),
      currency: newProductCurrency,
      sku: newProduct.sku.trim(),
    };
    addProduct(product);
    // Teklife eklerken TRY'ye dönüştür
    const priceInTry = convertToTry(price, newProductCurrency);
    const costInTry = convertToTry(cost, newProductCurrency);
    addItem({ name: product.name, description: '', sku: product.sku, price: priceInTry, cost: costInTry, image: product.image, product_link: product.product_link, quantity: 1 });
    setNewProduct({ name: '', category: '', price: '', cost: '', image: '', product_link: '', sku: '' });
    setNewPriceList(''); setNewPriceDiscount(''); setNewCostList(''); setNewCostDiscount('');
    setShowNewProductForm(false);
  };

  // Sadece kataloga kaydet (teklife ekleme)
  const saveNewProductOnly = () => {
    if (!newProduct.name.trim()) return alert('Ürün adı zorunludur');
    const price = parseFloat(newProduct.price) || 0;
    const cost = parseFloat(newProduct.cost) || 0;
    const product = {
      id: `custom-${Date.now()}`,
      brand_id: brandId,
      name: newProduct.name.trim(),
      description: '',
      price,
      cost,
      image: newProduct.image.trim(),
      product_link: newProduct.product_link.trim(),
      category: newProduct.category.trim(),
      currency: newProductCurrency,
      sku: newProduct.sku.trim(),
    };
    addProduct(product);
    setNewProduct({ name: '', category: '', price: '', cost: '', image: '', product_link: '', sku: '' });
    setNewPriceList(''); setNewPriceDiscount(''); setNewCostList(''); setNewCostDiscount('');
    alert('Ürün kataloga kaydedildi!');
  };

  // Hazır paketi teklife yükle (kataloga eklemez)
  const loadPackageToProposal = (pkg: PackageTemplate) => {
    for (const item of pkg.items) {
      addItem({
        name: item.name,
        description: item.description || '',
        price: item.price,
        cost: item.cost,
        image: item.image,
        product_link: item.product_link,
        quantity: item.quantity || 1,
      }, true);
    }
    setShowPackageDropdown(false);
  };

  // Paketleri JSON dosyasına kaydet (cihazlar arası senkronizasyon) — debounced
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncPackagesToFile = useCallback((updatedPackages: PackageTemplate[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const SHARED_BRANDS = ['mutpro', 'guclumutfak'];
      const sharedPkgs = updatedPackages.filter(p => SHARED_BRANDS.includes(p.brand_id));
      const otherPkgs = updatedPackages.filter(p => !SHARED_BRANDS.includes(p.brand_id));

      // Paylaşılan markalar için aynı paketleri her iki dosyaya da yaz
      if (sharedPkgs.length > 0) {
        SHARED_BRANDS.forEach(bid => {
          fetch('/api/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand_id: bid, packages: sharedPkgs }),
          }).catch(err => console.warn('Paket senkronizasyon hatası:', err));
        });
      }

      // Diğer markalar normal şekilde
      const byBrand: Record<string, PackageTemplate[]> = {};
      otherPkgs.forEach(p => {
        if (!byBrand[p.brand_id]) byBrand[p.brand_id] = [];
        byBrand[p.brand_id].push(p);
      });
      Object.entries(byBrand).forEach(([bid, pkgs]) => {
        fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_id: bid, packages: pkgs }),
        }).catch(err => console.warn('Paket senkronizasyon hatası:', err));
      });
    }, 800);
  }, []);

  // Paket yönetimi: yeni paket oluştur
  const createNewPackage = () => {
    if (!newPackageName.trim()) return alert('Paket adı giriniz.');
    const pkg: PackageTemplate = {
      id: `pkg-${Date.now()}`,
      brand_id: brandId,
      name: newPackageName.trim(),
      items: [],
    };
    addPackage(pkg);
    setEditingPackage(pkg);
    setNewPackageName('');
    syncPackagesToFile([...useAppStore.getState().packages, pkg]);
  };

  // Paket yönetimi: pakete ürün ekle
  const addItemToPackage = () => {
    if (!editingPackage || !newPkgItem.name.trim()) return;
    const item: PackageItem = {
      name: newPkgItem.name.trim(),
      description: newPkgItem.description,
      price: parseFloat(newPkgItem.price) || 0,
      cost: parseFloat(newPkgItem.cost) || 0,
      quantity: parseInt(newPkgItem.quantity) || 1,
      image: newPkgItem.image,
      product_link: newPkgItem.product_link,
      currency: newPkgItemCurrency,
    };
    const updated = { ...editingPackage, items: [...editingPackage.items, item] };
    const newPkgs = packages.map(p => p.id === updated.id ? updated : p);
    setPackages(newPkgs);
    setEditingPackage(updated);
    setNewPkgItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
    setNewPkgItemCurrency('TRY');
    setPkgProductSearch('');
    setShowPkgProductSearch(false);
    syncPackagesToFile(newPkgs);
    if (isSupabaseConfigured()) supabase.from('packages').upsert({ id: updated.id, brand_id: updated.brand_id, name: updated.name, items: updated.items });
  };

  const updatePackageItem = (idx: number, field: string, value: any) => {
    if (!editingPackage) return;
    const updatedItems = editingPackage.items.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, [field]: field === 'price' || field === 'cost' ? (parseFloat(value) || 0) : field === 'quantity' ? (parseInt(value) || 1) : value };
    });
    const updated = { ...editingPackage, items: updatedItems };
    const newPkgs = packages.map(p => p.id === updated.id ? updated : p);
    setPackages(newPkgs);
    setEditingPackage(updated);
    syncPackagesToFile(newPkgs);
    if (isSupabaseConfigured()) supabase.from('packages').upsert({ id: updated.id, brand_id: updated.brand_id, name: updated.name, items: updated.items });
  };

  const renamePackage = (newName: string) => {
    if (!editingPackage) return;
    const updated = { ...editingPackage, name: newName };
    const newPkgs = packages.map(p => p.id === updated.id ? updated : p);
    setPackages(newPkgs);
    setEditingPackage(updated);
    syncPackagesToFile(newPkgs);
    if (isSupabaseConfigured()) supabase.from('packages').upsert({ id: updated.id, brand_id: updated.brand_id, name: updated.name, items: updated.items });
  };

  const duplicatePackage = (pkg: PackageTemplate) => {
    const dup: PackageTemplate = {
      ...pkg,
      id: `pkg-${Date.now()}`,
      name: pkg.name + ' (Kopya)',
      items: pkg.items.map(i => ({ ...i })),
    };
    const currentPkgs = useAppStore.getState().packages;
    const newPkgs = [...currentPkgs, dup];
    setPackages(newPkgs);
    syncPackagesToFile(newPkgs);
  };

  const addProductToPackage = (product: any) => {
    if (!editingPackage) return;
    const item: PackageItem = {
      name: product.name,
      description: '',
      price: product.price || 0,
      cost: product.cost || 0,
      quantity: 1,
      image: product.image || '',
      product_link: product.product_link || '',
      currency: product.currency || 'TRY',
    };
    const updated = { ...editingPackage, items: [...editingPackage.items, item] };
    const newPkgs = packages.map(p => p.id === updated.id ? updated : p);
    setPackages(newPkgs);
    setEditingPackage(updated);
    setPkgProductSearch('');
    setShowPkgProductSearch(false);
    syncPackagesToFile(newPkgs);
    if (isSupabaseConfigured()) supabase.from('packages').upsert({ id: updated.id, brand_id: updated.brand_id, name: updated.name, items: updated.items });
  };

  // Paket yönetimi: paketten ürün sil
  const removeItemFromPackage = (idx: number) => {
    if (!editingPackage) return;
    const currentPkgs = useAppStore.getState().packages;
    const updated = { ...editingPackage, items: editingPackage.items.filter((_, i) => i !== idx) };
    const newPkgs = currentPkgs.map(p => p.id === updated.id ? updated : p);
    setPackages(newPkgs);
    setEditingPackage(updated);
    syncPackagesToFile(newPkgs);
    if (isSupabaseConfigured()) supabase.from('packages').upsert({ id: updated.id, brand_id: updated.brand_id, name: updated.name, items: updated.items });
  };

  // Paket yönetimi: paketi teklife yükle
  const loadEditingPackageToProposal = () => {
    if (!editingPackage) return;
    loadPackageToProposal(editingPackage);
    setShowPackageManager(false);
  };

  // Calculations — Girilen fiyatlar KDV hariç (net)
  const KDV_RATE = 0.20;
  const productItems = items.filter(i => i.type !== 'section');
  const subTotal = productItems.reduce((sum, i) => sum + i.total, 0); // KDV hariç ara toplam
  const discountedSubTotal = subTotal - discountValue;
  const kdvTotal = showVAT ? discountedSubTotal * KDV_RATE : 0;
  const installmentRate = installment > 0 ? installment * 0.03 : 0; // taksit sayısı × %3
  const installmentExtra = (discountedSubTotal + kdvTotal + shippingCost) * installmentRate;
  const finalTotal = discountedSubTotal + kdvTotal + shippingCost + installmentExtra; // Genel Toplam (KDV dahil + kargo + taksit farkı)
  const totalCost = productItems.reduce((sum, i) => sum + i.cost * i.quantity, 0);
  const netProfit = discountedSubTotal - totalCost;
  const profitMargin = discountedSubTotal > 0 ? (netProfit / discountedSubTotal) * 100 : 0;
  const sym = getCurrencySymbol(currency);

  const convertCurrency = (amount: number) => {
    if (currency === 'TRY') return amount;
    if (currency === 'USD') return amount / usdRate;
    if (currency === 'EUR') return amount / eurRate;
    if (currency === 'GBP') return amount / gbpRate;
    return amount;
  };

  const isFormValid = preparedBy.trim().length > 0;

  const [saving, setSaving] = useState(false);
  const [custDismissed, setCustDismissed] = useState(false);
  useEffect(() => { setCustDismissed(false); }, [customerName, customerPhone]);

  // Hazır açıklama/not kütüphanesi
  const [snippets, setSnippets] = useState<{ id: number; text: string }[]>([]);
  const [snippetTargetId, setSnippetTargetId] = useState<string | null>(null); // notu ekleyecek kalem
  const [newSnippet, setNewSnippet] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('teklif_snippets').select('id, text').eq('brand_id', brandId).order('created_at');
        if (data) setSnippets(data as { id: number; text: string }[]);
      } catch { /* tablo yoksa boş kalır */ }
    })();
  }, [brandId]);
  const addSnippet = async () => {
    const html = newSnippet.trim();
    if (!stripHtml(html)) return; // görünür içerik yoksa ekleme
    const id = Date.now();
    setSnippets((s) => [...s, { id, text: html }]);
    setNewSnippet('');
    try { await supabase.from('teklif_snippets').insert({ id, brand_id: brandId, text: html }); } catch {}
  };
  const deleteSnippet = async (id: number) => {
    setSnippets((s) => s.filter((x) => x.id !== id));
    try { await supabase.from('teklif_snippets').delete().eq('id', id); } catch {}
  };
  const insertSnippet = (text: string) => {
    if (!snippetTargetId) return;
    const item = items.find((i) => i.id === snippetTargetId);
    const cur = (item?.description || '').trim();
    updateItem(snippetTargetId, 'description', cur ? cur + text : text);
  };

  // Müşteri adını (HTML olabilir) düz metne çevirir
  const stripHtml = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  // Teklifteki müşteriyi Müşteriler'e kaydeder (yoksa)
  const saveCustomerFromProposal = async () => {
    const plainName = stripHtml(customerName);
    if (!plainName) return;
    const key = plainName.toLocaleLowerCase('tr');
    const exists = customers.some((c) => c.brand_id === brandId && (c.name || '').trim().toLocaleLowerCase('tr') === key);
    if (exists) return;
    try {
      await addCustomer({
        id: `cust-${Date.now()}`,
        brand_id: brandId,
        name: plainName,
        phone: customerPhone || '',
        city: customerCity || '',
        address: customerAddress || '',
      });
    } catch (e) {
      console.error('Müşteri otomatik kaydı hatası:', e);
    }
  };

  const handleSave = async () => {
    if (!isFormValid) return alert('Teklifi Hazırlayan alanı zorunludur!');
    if (saving) return;
    setSaving(true);
    try {
      if (editId) {
        await updateProposal(editId, {
          proposal_no: proposalNo,
          proposal_date: proposalDate,
          project_name: projectName,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_city: customerCity,
          customer_address: customerAddress,
          prepared_by: preparedBy.trim(),
          items,
          discount_value: discountValue,
          currency,
          include_vat: showVAT,
          conditions,
          global_hide_prices: globalHidePrices,
          total: finalTotal,
        });
      } else {
        const proposal: Proposal = {
          id: Date.now().toString(),
          brand_id: brandId,
          proposal_no: proposalNo,
          proposal_date: proposalDate,
          project_name: projectName,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_city: customerCity,
          customer_address: customerAddress,
          prepared_by: preparedBy.trim(),
          items,
          discount_value: discountValue,
          currency,
          include_vat: showVAT,
          conditions,
          global_hide_prices: globalHidePrices,
          status: 'draft',
          total: finalTotal,
        };
        await addProposal(proposal);
      }
      // Müşteri adını Müşteriler listesine de kaydet (yoksa)
      await saveCustomerFromProposal();
      // IndexedDB yazmasının tamamlanması için kısa bekleme (alert event loop'u bloklar)
      await new Promise((r) => setTimeout(r, 300));
      router.push(`/${brandId}/teklifler`);
    } catch (err) {
      console.error('handleSave error:', err);
      alert('Kaydetme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const [waBusy, setWaBusy] = useState(false);
  // WhatsApp'tan gönder: mobilde PDF'i dosya olarak paylaşır (navigator.share),
  // masaüstü/desteklenmeyen yerde hazır metinle WhatsApp'ı açar.
  const sendWhatsApp = async () => {
    if (waBusy) return;
    const plainName = stripHtml(customerName);
    const digits = (customerPhone || '').replace(/\D/g, '');
    let intl = '';
    if (digits) {
      if (digits.startsWith('90')) intl = digits;
      else if (digits.startsWith('0')) intl = '90' + digits.slice(1);
      else if (digits.length === 10) intl = '90' + digits;
      else intl = digits;
    }
    const message = [
      plainName ? `Sayın ${plainName},` : 'Merhaba,',
      `${brand.fullName} tarafından hazırlanan teklifiniz:`,
      `📄 Teklif No: ${proposalNo}`,
      projectName ? `🏷️ Proje: ${projectName}` : '',
      `💰 Genel Toplam: ${formatCurrency(finalTotal, currency)}`,
      `📞 ${brand.phone} · 🌐 ${brand.website}`,
    ].filter(Boolean).join('\n');
    const fileName = `${proposalNo}_${(projectName || 'Teklif').replace(/[\\/]/g, '-')}.pdf`;

    // 1) PDF'i doğrudan paylaş (mobil cihazlarda WhatsApp'a dosya olarak eklenir)
    try {
      const nav = navigator as any;
      if (printRef.current && nav.canShare && typeof nav.share === 'function') {
        setWaBusy(true);
        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin: [5, 5, 10, 5],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
          pagebreak: { mode: ['css'] },
        };
        const blob: Blob = await (html2pdf().set(opt).from(printRef.current) as any).outputPdf('blob');
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text: message, title: 'Teklif' });
          setWaBusy(false);
          return;
        }
        setWaBusy(false);
      }
    } catch (e: any) {
      setWaBusy(false);
      if (e && e.name === 'AbortError') return; // kullanıcı paylaşımı iptal etti
      // diğer hatalar → aşağıdaki metin fallback'ine düş
    }

    // 2) Fallback (masaüstü / dosya paylaşımı desteklenmiyor): hazır metinle WhatsApp aç
    const url = intl ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Yeni teklifte: girilen ad/telefon mevcut müşteriyle eşleşirse öneri göster
  const custNameQ = stripHtml(customerName).toLocaleLowerCase('tr');
  const custPhoneQ = (customerPhone || '').replace(/\s/g, '');
  const custExactApplied = customers.some((c) => c.brand_id === brandId && custNameQ.length > 0 && (c.name || '').trim().toLocaleLowerCase('tr') === custNameQ && (c.phone || '').replace(/\s/g, '') === custPhoneQ);
  const custSuggestions = (!editId && !custDismissed && !custExactApplied && (custNameQ.length >= 2 || custPhoneQ.length >= 3))
    ? customers.filter((c) => c.brand_id === brandId).filter((c) => {
        const cn = (c.name || '').trim().toLocaleLowerCase('tr');
        const cp = (c.phone || '').replace(/\s/g, '');
        const nameHit = custNameQ.length >= 2 && cn.includes(custNameQ);
        const phoneHit = custPhoneQ.length >= 3 && cp.length > 0 && cp.includes(custPhoneQ);
        return nameHit || phoneHit;
      }).slice(0, 4)
    : [];

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    if (!isFormValid) return alert('PDF oluşturmak için "Teklifi Hazırlayan" alanı zorunludur!');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [5, 5, 10, 5],
        filename: `${proposalNo}_${projectName || 'Teklif'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css'] },
      };
      await html2pdf().set(opt).from(printRef.current).save();

      // PDF indirildiğinde otomatik olarak geçmişe kaydet veya güncelle
      if (editId) {
        await updateProposal(editId, {
          proposal_no: proposalNo,
          proposal_date: proposalDate,
          project_name: projectName,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_city: customerCity,
          customer_address: customerAddress,
          prepared_by: preparedBy.trim(),
          items,
          discount_value: discountValue,
          currency,
          include_vat: showVAT,
          conditions,
          global_hide_prices: globalHidePrices,
          status: 'sent',
          total: finalTotal,
        });
      } else {
        const proposal: Proposal = {
          id: Date.now().toString(),
          brand_id: brandId,
          proposal_no: proposalNo,
          proposal_date: proposalDate,
          project_name: projectName,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_city: customerCity,
          customer_address: customerAddress,
          prepared_by: preparedBy.trim(),
          items,
          discount_value: discountValue,
          currency,
          include_vat: showVAT,
          conditions,
          global_hide_prices: globalHidePrices,
          status: 'sent',
          total: finalTotal,
        };
        await addProposal(proposal);
      }
    } catch {
      alert('PDF oluşturulurken hata oluştu.');
    }
  };

  const handleDownloadJSON = () => {
    const data = {
      id: editId || Date.now().toString(),
      brand_id: brandId,
      proposal_no: proposalNo,
      proposal_date: proposalDate,
      project_name: projectName,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_city: customerCity,
      customer_address: customerAddress,
      prepared_by: preparedBy.trim(),
      items,
      discount_value: discountValue,
      currency,
      include_vat: showVAT,
      conditions,
      global_hide_prices: globalHidePrices,
      status: 'sent',
      total: finalTotal,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposalNo}_${projectName || 'Teklif'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProducts = brandProducts.filter((p) => {
    if (!productSearch) return true;
    const words = productSearch.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const text = [p.name, p.sku || '', p.category || '', p.manufacturer || ''].join(' ').toLowerCase();
    return words.every(w => text.includes(w));
  });

  if (isPrintMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="no-print flex items-center gap-2 mb-4 p-3 bg-white rounded-xl border shadow-sm flex-wrap [&>button]:flex-1 sm:[&>button]:flex-none [&>button]:justify-center">
          <button onClick={() => setIsPrintMode(false)} className="h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 transition"><ArrowLeft className="w-4 h-4" /> Geri</button>
          <button
            onClick={() => setViewMode(viewMode === 'liste' ? 'katalog' : 'liste')}
            className={`h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 transition ${viewMode === 'katalog' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'}`}
          >
            {viewMode === 'liste' ? <><List className="w-4 h-4" /> Liste</> : <><LayoutGrid className="w-4 h-4" /> Katalog</>}
          </button>
          <select value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} className="h-9 px-3 rounded-lg text-sm font-bold border border-gray-300 bg-white text-gray-700">
            <option value="FİYAT TEKLİFİ">Fiyat Teklifi</option>
            <option value="PROFORMA FATURA">Proforma Fatura</option>
          </select>
          <div className="flex-1" />
          <button onClick={handlePrint} className="h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 bg-gray-800 text-white hover:bg-gray-900 transition"><Printer className="w-4 h-4" /> Yazdır</button>
          <button onClick={handleDownloadPDF} disabled={!isFormValid} className={`h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 transition ${isFormValid ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><FileDown className="w-4 h-4" /> PDF</button>
          <button onClick={handleDownloadJSON} className="h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 bg-orange-500 text-white hover:bg-orange-600 transition"><FileDown className="w-4 h-4" /> JSON</button>
          <button onClick={handleSave} disabled={!isFormValid} className={`h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 transition ${isFormValid ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Save className="w-4 h-4" /> Kaydet</button>
          <button onClick={sendWhatsApp} disabled={waBusy} className="h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 bg-[#25D366] text-white hover:bg-[#1eb457] transition disabled:opacity-60" title="Teklifi WhatsApp'tan gönder (mobilde PDF ekli)"><MessageCircle className="w-4 h-4" /> {waBusy ? 'Hazırlanıyor…' : 'WhatsApp'}</button>
          {!isFormValid && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Hazırlayan alanını doldurun</span>}
        </div>

        <div className="overflow-x-auto -mx-1 sm:mx-0">
        <div ref={printRef} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg page-container min-w-[720px]">
          {/* Header */}
          <div className="mb-6 pb-4 border-b-2" style={{ borderColor: brand.accentColor }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ maxWidth: '55%' }}>
                <img src={brand.logo} alt={brand.name} style={{ maxHeight: '88px', maxWidth: '340px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div style={{ textAlign: 'right', paddingTop: 0, marginTop: 0 }}>
                <h1 className="text-lg font-extrabold" style={{ margin: 0, padding: 0, lineHeight: 1, color: brand.accentColor }}>{proposalTitle}</h1>
                <div className="text-xs text-gray-600" style={{ marginTop: '6px' }}>
                  <div><span className="font-bold">Teklif No:</span> {proposalNo}</div>
                  <div><span className="font-bold">Tarih:</span> {proposalDate}</div>
                  <div><span className="font-bold">Geçerlilik:</span> {getValidityDate()}</div>
                  {preparedBy && <div><span className="font-bold">Hazırlayan:</span> {preparedBy}</div>}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 leading-tight" style={{ marginTop: '6px' }}>
              {brand.address.map((line, i) => <div key={i}>{line}</div>)}
              <div>{brand.phone} • {brand.email}</div>
              <div className="font-semibold">{brand.website}</div>
            </div>
          </div>

          {/* Customer + Project */}
          <div className="grid grid-cols-2 gap-6 mb-8" style={{ pageBreakAfter: 'avoid' }}>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Müşteri Bilgileri</h3>
              {customerName ? <div className="text-sm font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: renderRichHtml(customerName) }} /> : <div className="text-sm font-bold text-gray-900">-</div>}
              {customerPhone && <div className="text-xs text-gray-600">{customerPhone}</div>}
              {customerCity && <div className="text-xs text-gray-600" style={{ whiteSpace: 'pre-line' }}>{customerCity}</div>}
              {customerAddress && <div className="text-xs text-gray-500 mt-1">{customerAddress}</div>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Proje</h3>
              <div className="text-sm font-bold text-gray-900">{projectName || '-'}</div>
            </div>
          </div>

          {/* Items — Liste veya Katalog Görünüm */}
          {items.length > 0 && viewMode === 'liste' && (
            <table className="w-full text-sm mb-8" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-10 text-[11px] font-bold tracking-wide uppercase">#</th>
                  {!isCompactMode && <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-24 text-[11px] font-bold tracking-wide uppercase">Görsel</th>}
                  <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center text-[11px] font-bold tracking-wide uppercase">Ürün Adı / Açıklama (Opsiyonel)</th>
                  <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-14 text-[11px] font-bold tracking-wide uppercase">Adet</th>
                  {!globalHidePrices && <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-32 text-[11px] font-bold tracking-wide uppercase">Birim Fiyat</th>}
                  {!globalHidePrices && <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-32 text-[11px] font-bold tracking-wide uppercase">Toplam Fiyat</th>}
                </tr>
              </thead>
              <tbody>
                {(() => { let pIdx = 0; return items.map((item, idx) => {
                  if (item.type === 'section') {
                    const colCount = (!isCompactMode ? 1 : 0) + (!globalHidePrices ? 2 : 0) + 3;
                    return (
                      <tr key={item.id} style={{ borderBottom: `2px solid ${brand.tableBorderHex}`, backgroundColor: brand.tableHeaderBgHex + '22', pageBreakInside: 'avoid' }}>
                        <td colSpan={colCount} className="py-3 px-4 text-center font-bold text-sm uppercase tracking-wide text-gray-700">{item.name}</td>
                      </tr>
                    );
                  }
                  pIdx++;
                  const netUnitPrice = item.price * (1 - item.item_discount / 100);
                  const netLineTotal = item.total;
                  const isHidden = globalHidePrices || item.hide_price;
                  return (
                    <tr key={item.id} className={item.shipped ? 'line-through opacity-50' : ''} style={{ borderBottom: `1px solid ${brand.tableBorderHex}`, backgroundColor: idx % 2 === 1 ? brand.tableStripeBgHex : '#ffffff', pageBreakInside: 'avoid' }}>
                      <td className="py-5 px-3 text-center text-gray-500 font-medium text-sm">{pIdx}</td>
                      {!isCompactMode && (
                        <td className="py-4 px-3">
                          <div style={{ width: '80px', height: '80px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.image ? <img src={item.image} crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', width: 'auto', height: 'auto' }} /> : <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }} />}
                          </div>
                        </td>
                      )}
                      <td className="py-5 px-3">
                        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                        {item.sku && <div className="text-[10px] text-gray-400 mt-0.5">Ürün Kodu: {item.sku}</div>}
                        {item.description && <div className="text-xs text-gray-500 mt-0.5 rich-content" dangerouslySetInnerHTML={{ __html: renderRichHtml(item.description) }} />}
                      </td>
                      <td className="py-5 px-3 text-center font-semibold text-sm">{item.quantity}</td>
                      {!isHidden && <td className="py-5 px-3 text-right font-bold text-sm">{formatCurrency(convertCurrency(netUnitPrice), sym)}</td>}
                      {!isHidden && <td className="py-5 px-3 text-right font-bold text-sm">{formatCurrency(convertCurrency(netLineTotal), sym)}</td>}
                      {isHidden && !globalHidePrices && <td className="py-3 px-2 text-center text-gray-400">-</td>}
                      {isHidden && !globalHidePrices && <td className="py-3 px-2 text-center text-gray-400">-</td>}
                    </tr>
                  );
                }); })()}
              </tbody>
            </table>
          )}

          {/* Katalog Görünüm */}
          {items.length > 0 && viewMode === 'katalog' && (
            <div className="space-y-4 mb-8">
              {items.map((item, idx) => {
                if (item.type === 'section') {
                  return (
                    <div key={item.id} className="py-3 px-4 text-center font-bold text-sm uppercase tracking-wide text-gray-700 border-b-2" style={{ borderColor: brand.tableBorderHex, backgroundColor: brand.tableHeaderBgHex + '22', pageBreakInside: 'avoid' }}>{item.name}</div>
                  );
                }
                const netUnitPrice = item.price * (1 - item.item_discount / 100);
                const netLineTotal = item.total;
                const isHidden = globalHidePrices || item.hide_price;
                return (
                  <div key={item.id} className={`flex gap-5 p-4 rounded-xl border ${item.shipped ? 'opacity-50 line-through' : ''}`} style={{ borderColor: brand.tableBorderHex, pageBreakInside: 'avoid' }}>
                    <div style={{ width: '144px', height: '144px', flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.image ? <img src={item.image} crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', width: 'auto', height: 'auto' }} /> : <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-base">{item.name}</div>
                      {item.sku && <div className="text-xs text-gray-400 mt-0.5">Ürün Kodu: {item.sku}</div>}
                      {item.description && <div className="text-sm text-gray-500 mt-1 rich-content" dangerouslySetInnerHTML={{ __html: renderRichHtml(item.description) }} />}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-sm text-gray-500">{item.quantity} Adet x {!isHidden ? formatCurrency(convertCurrency(netUnitPrice), sym) : '-'}</span>
                        {!isHidden && <span className="text-lg font-extrabold text-gray-900 ml-auto">{formatCurrency(convertCurrency(netLineTotal), sym)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals — KDV hariç ara toplam + KDV satırı + Kargo + Genel Toplam */}
          {!globalHidePrices && (
            <div className="flex justify-end mb-8" style={{ pageBreakInside: 'avoid' }}>
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Ara Toplam (KDV Hariç):</span><span className="font-semibold">{formatCurrency(convertCurrency(subTotal), sym)}</span></div>
                {discountValue > 0 && <div className="flex justify-between text-red-600"><span>İndirim:</span><span>-{formatCurrency(convertCurrency(discountValue), sym)}</span></div>}
                {discountValue > 0 && <div className="flex justify-between border-t pt-1"><span className="text-gray-600">İndirimli Toplam:</span><span className="font-semibold">{formatCurrency(convertCurrency(discountedSubTotal), sym)}</span></div>}
                {showVAT && <div className="flex justify-between"><span className="text-gray-600">KDV (%20):</span><span>{formatCurrency(convertCurrency(kdvTotal), sym)}</span></div>}
                {shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Kargo / Taşıma Bedeli:</span><span>{formatCurrency(convertCurrency(shippingCost), sym)}</span></div>}
                {installment > 0 && <div className="flex justify-between text-orange-600"><span>Taksit Farkı ({installment} taksit, %{installment*3}):</span><span>+{formatCurrency(convertCurrency(installmentExtra), sym)}</span></div>}
                <div className="flex justify-between text-lg font-extrabold border-t-2 border-gray-800 pt-2 mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(convertCurrency(finalTotal), sym)}</span></div>
                <div className="text-right text-xs text-gray-500 italic">{numberToText(convertCurrency(finalTotal), currency)}</div>
              </div>
            </div>
          )}

          {/* IBAN / Ödeme Bilgileri */}
          {showIban && (
            <div className="mb-6 border border-gray-200 rounded-lg p-4" style={{ pageBreakInside: 'avoid' }}>
              <h4 className="font-bold text-gray-900 uppercase mb-3 text-xs">Ödeme Bilgileri</h4>
              <div className="space-y-3 text-xs">
                {(selectedIban === 0 || selectedIban === 1) && (
                  <div className="border-l-4 border-blue-500 pl-3">
                    <p className="font-bold text-gray-800">GÜÇLÜ REKLAM METAL ENDÜSTRİYEL TİCARET LİMİTED ŞİRKETİ</p>
                    <p className="font-mono text-gray-600 mt-0.5">TR43 0006 7010 0000 0011 6944 20</p>
                    <p className="text-gray-500">Yapı Kredi Bankası</p>
                  </div>
                )}
                {(selectedIban === 0 || selectedIban === 2) && (
                  <div className="border-l-4 border-green-500 pl-3">
                    <p className="font-bold text-gray-800">Buse Turancı</p>
                    <p className="font-mono text-gray-600 mt-0.5">TR37 0006 7010 0000 0021 0036 18</p>
                    <p className="text-gray-500">Yapı Kredi Bankası</p>
                  </div>
                )}
                {(selectedIban === 0 || selectedIban === 3) && (
                  <div className="border-l-4 border-orange-500 pl-3">
                    <p className="font-bold text-gray-800">GÜÇLÜ İNOKS ENDÜSTRİYEL MUTFAK SANAYİ VE TİCARET LİMİTED ŞİRKETİ</p>
                    <p className="font-mono text-gray-600 mt-0.5">TR57 0001 2001 8160 0010 1006 91</p>
                    <p className="text-gray-500">Halkbank</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms + Footer */}
          <div className="grid grid-cols-2 gap-6 text-[10px] text-gray-500 border-t pt-4 mt-6" style={{ pageBreakInside: 'avoid' }}>
            <div>
              <h4 className="font-bold text-gray-900 uppercase mb-1 text-xs">Şartlar ve Koşullar</h4>
              <div className="whitespace-pre-wrap leading-relaxed">{conditions}</div>
            </div>
            <div className="text-right">
              {preparedBy && (
                <div className="mb-3 pb-2 border-b border-gray-200">
                  <p className="text-[10px] text-gray-400 uppercase">Teklifi Hazırlayan</p>
                  <p className="text-xs font-bold text-gray-800">{preparedBy}</p>
                </div>
              )}
              <p className="font-bold text-gray-900 text-sm">{brand.fullName}</p>
              <p className="text-[10px]">{brand.slogan}</p>
              <div className="mt-2 flex justify-end"><img src={brand.qrUrl} alt="QR" className="w-12 h-12" crossOrigin="anonymous" /></div>
            </div>
          </div>

          {/* Brand Logos */}
          {brand.brandLogos.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200" style={{ pageBreakInside: 'avoid' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px 16px', alignItems: 'center', justifyItems: 'center' }}>
                {brand.brandLogos.map((logo, i) => (
                  <img key={i} src={logo} style={{ height: '61px', width: 'auto', objectFit: 'contain', opacity: 0.7 }} alt="" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Teklif Oluştur</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{brand.fullName} •</span>
            <input
              type="text"
              value={proposalNo}
              onChange={(e) => setProposalNo(e.target.value)}
              className="text-sm text-gray-500 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 font-medium"
              style={{ width: `${Math.max(proposalNo.length * 8, 80)}px` }}
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none [&>button]:justify-center">
          <button onClick={() => setIsPrintMode(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-900"><Eye className="w-4 h-4" /> Önizle</button>
          <button onClick={handleDownloadJSON} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-600"><FileDown className="w-4 h-4" /> JSON</button>
          <button onClick={handleSave} disabled={!isFormValid || saving} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isFormValid && !saving ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Save className="w-4 h-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </div>

      {/* Customer & Project Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Müşteri & Proje Bilgileri</h3>
          <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1">
            <Users className="w-3 h-3" /> Kayıtlı Müşteri Seç
          </button>
        </div>

        {showCustomerPicker && brandCustomers.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-40 overflow-y-auto">
            {brandCustomers.map((c) => (
              <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-100 text-sm transition">
                <span className="font-semibold">{c.name}</span>
                {c.phone && <span className="text-gray-500 ml-2">{c.phone}</span>}
                {c.city && <span className="text-gray-500 ml-2">• {c.city}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Teklifi Hazırlayan — Zorunlu Alan */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Teklifi Hazırlayan *
          </label>
          <div className="relative">
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className={`w-full md:w-80 p-2 border rounded-lg text-sm font-semibold ${!preparedBy.trim() ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'}`}
              placeholder="Adınızı yazın (zorunlu)"
            />
            {!preparedBy.trim() && (
              <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                <AlertCircle className="w-3 h-3" /> Bu alan zorunludur — doldurmadan Kaydet ve PDF oluşturulamaz
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Müşteri Adı</label>
            <RichEditor value={customerName} onChange={setCustomerName} placeholder="Firma / Kişi (yazmak için tıklayın)" toolbarOnFocus />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Proje Adı</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Proje Adı" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Telefon</label>
            <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Telefon" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Adres</label>
            <AutoTextarea value={customerCity} onChange={setCustomerCity} className="w-full p-2 border border-gray-300 rounded-lg text-sm block" placeholder="Adres" />
          </div>
        </div>

        {custSuggestions.length > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Kayıtlı müşteriniz olabilir — bilgileri doldurmak için seçin
              </span>
              <button onClick={() => setCustDismissed(true)} className="text-blue-400 hover:text-blue-700" title="Kapat"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {custSuggestions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { selectCustomer(c); setCustDismissed(true); }}
                  className="text-left bg-white border border-blue-200 rounded-lg px-3 py-1.5 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                  {(c.phone || c.city) && <div className="text-[10px] text-gray-500">{[c.phone, c.city].filter(Boolean).join(' • ')}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Row + Exchange Rates */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">Para Birimi:</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="p-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="TRY">TL (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={isCompactMode} onChange={(e) => setIsCompactMode(e.target.checked)} className="accent-blue-600" />
          <label className="text-xs font-bold text-gray-500">Kompakt Görünüm</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={globalHidePrices} onChange={(e) => setGlobalHidePrices(e.target.checked)} className="accent-orange-600" />
          <label className="text-xs font-bold text-orange-600">Fiyatları Gizle</label>
        </div>

        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-blue-600 uppercase">TCMB Kur</span>
            <RefreshCw className="w-3 h-3 text-blue-400 cursor-pointer hover:text-blue-600" onClick={async () => {
              try {
                const res = await fetch('/api/tcmb-kur');
                const data = await res.json();
                if (data.eur) setEurRate(data.eur);
                if (data.usd) setUsdRate(data.usd);
                if (data.gbp) setGbpRate(data.gbp);
              } catch {}
            }} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">€1=</span>
            <input type="number" step="0.01" value={eurRate} onChange={(e) => setEurRate(parseFloat(e.target.value) || 0)} className="w-16 text-xs font-bold text-center border border-blue-300 rounded px-1 py-0.5 bg-white" />
            <span className="text-[10px] text-gray-500">₺</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">$1=</span>
            <input type="number" step="0.01" value={usdRate} onChange={(e) => setUsdRate(parseFloat(e.target.value) || 0)} className="w-16 text-xs font-bold text-center border border-blue-300 rounded px-1 py-0.5 bg-white" />
            <span className="text-[10px] text-gray-500">₺</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">£1=</span>
            <input type="number" step="0.01" value={gbpRate} onChange={(e) => setGbpRate(parseFloat(e.target.value) || 0)} className="w-16 text-xs font-bold text-center border border-blue-300 rounded px-1 py-0.5 bg-white" />
            <span className="text-[10px] text-gray-500">₺</span>
          </div>
        </div>
      </div>

      {/* Add Item Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Ürün Ekle</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPackageManager(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
              <Boxes className="w-3.5 h-3.5" /> Paketleri Yönet
            </button>
            <div className="relative">
              <button onClick={() => setShowPackageDropdown(!showPackageDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-300 rounded-lg text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition">
                <Package className="w-3.5 h-3.5" /> Hazır Paket Yükle
              </button>
              {showPackageDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[240px]">
                  {brandPackages.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400">Henüz paket yok</div>
                  ) : (
                    brandPackages.map(pkg => (
                      <button key={pkg.id} onClick={() => loadPackageToProposal(pkg)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 transition">
                        <div className="font-semibold text-sm text-gray-900">{pkg.name}</div>
                        <div className="text-[10px] text-gray-400">{pkg.items.length} Ürün</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Adı *</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400 w-3.5 h-3.5" />
              <input
                ref={nameInputRef}
                type="text"
                value={newItem.name}
                onChange={(e) => handleNameInput(e.target.value)}
                onFocus={() => { if (newItem.name.length >= 2 && nameSuggestions.length > 0) setShowNameSuggestions(true); }}
                onBlur={() => { setTimeout(() => setShowNameSuggestions(false), 200); }}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Ürün adı veya marka yazın..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showNameSuggestions) addItem();
                  if (e.key === 'Escape') setShowNameSuggestions(false);
                }}
              />
            </div>

            {/* Livesearch Dropdown */}
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase sticky top-0">
                  {nameSuggestions.length} ürün bulundu — seçmek için tıklayın
                </div>
                {nameSuggestions.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 transition flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded border bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full bg-gray-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-700">{p.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.manufacturer && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{p.manufacturer}</span>
                        )}
                        {p.category && (
                          <span className="text-[10px] text-gray-400 line-clamp-1">{p.category.split('>').pop()?.trim()}</span>
                        )}
                        {p.sku && (
                          <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">₺{productPriceToTry(p.price, p.currency).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                      {p.currency && p.currency !== 'TRY' && (
                        <div className="text-[10px] text-gray-400">{p.currency} {p.price.toLocaleString('tr-TR')}</div>
                      )}
                      <div className="text-[10px] text-green-600 font-bold opacity-0 group-hover:opacity-100 transition">+ Ekle</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Fiyat (₺)</label>
            <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Maliyet (₺)</label>
            <input type="number" value={newItem.cost} onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Adet</label>
            <input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="1" min="1" />
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => addItem()} className={`w-full py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 ${brand.buttonColor} hover:opacity-90`}>
              <Plus className="w-4 h-4" /> Ekle
            </button>
            <button onClick={addSectionDivider} className="w-full py-1.5 rounded-lg text-gray-600 text-xs font-bold flex items-center justify-center gap-1.5 border border-gray-300 bg-gray-50 hover:bg-gray-100">
              <Type className="w-3.5 h-3.5" /> Ara Başlık
            </button>
          </div>
        </div>
      </div>

      {/* Yeni Ürün Oluştur ve Kaydet */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setShowNewProductForm(!showNewProductForm)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-gray-700 uppercase">Yeni Ürün Oluştur ve Kaydet</span>
            <span className="text-xs text-gray-400">Katalogda olmayan ürünleri sisteme kaydedin</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNewProductForm ? 'rotate-180' : ''}`} />
        </button>
        {showNewProductForm && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Adı *</label>
                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Ürün adı" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Kodu</label>
                <input type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="SKU / Ürün Kodu" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Kategori</label>
                <input type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Ör: Fırınlar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Para Birimi</label>
                <select value={newProductCurrency} onChange={(e) => setNewProductCurrency(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold">
                  <option value="TRY">₺ TRY</option>
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                  <option value="GBP">£ GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fiyat ({getCurrencySymbol(newProductCurrency)} {newProductCurrency})</label>
                <div className="flex gap-1 items-center">
                  <input type="number" value={newProduct.price} onChange={(e) => { setNewProduct({ ...newProduct, price: e.target.value }); setNewPriceList(''); setNewPriceDiscount(''); }} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                </div>
                <div className="flex gap-1 mt-1 items-center">
                  <input type="number" value={newPriceList} onChange={(e) => { const liste = e.target.value; setNewPriceList(liste); const l = parseFloat(liste) || 0; const d = parseFloat(newPriceDiscount) || 0; setNewProduct({ ...newProduct, price: l > 0 ? (l * (1 - d / 100)).toFixed(2) : '' }); }} className="flex-1 p-1.5 border border-blue-200 rounded text-xs bg-blue-50" placeholder="Liste fiyatı" />
                  <input type="number" value={newPriceDiscount} onChange={(e) => { const disc = e.target.value; setNewPriceDiscount(disc); const l = parseFloat(newPriceList) || 0; const d = parseFloat(disc) || 0; setNewProduct({ ...newProduct, price: l > 0 ? (l * (1 - d / 100)).toFixed(2) : '' }); }} className="w-16 p-1.5 border border-blue-200 rounded text-xs bg-blue-50 text-center" placeholder="%" />
                  <span className="text-xs text-blue-500 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Maliyet ({getCurrencySymbol(newProductCurrency)} {newProductCurrency})</label>
                <div className="flex gap-1 items-center">
                  <input type="number" value={newProduct.cost} onChange={(e) => { setNewProduct({ ...newProduct, cost: e.target.value }); setNewCostList(''); setNewCostDiscount(''); }} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                </div>
                <div className="flex gap-1 mt-1 items-center">
                  <input type="number" value={newCostList} onChange={(e) => { const liste = e.target.value; setNewCostList(liste); const l = parseFloat(liste) || 0; const d = parseFloat(newCostDiscount) || 0; setNewProduct({ ...newProduct, cost: l > 0 ? (l * (1 - d / 100)).toFixed(2) : '' }); }} className="flex-1 p-1.5 border border-orange-200 rounded text-xs bg-orange-50" placeholder="Liste fiyatı" />
                  <input type="number" value={newCostDiscount} onChange={(e) => { const disc = e.target.value; setNewCostDiscount(disc); const l = parseFloat(newCostList) || 0; const d = parseFloat(disc) || 0; setNewProduct({ ...newProduct, cost: l > 0 ? (l * (1 - d / 100)).toFixed(2) : '' }); }} className="w-16 p-1.5 border border-orange-200 rounded text-xs bg-orange-50 text-center" placeholder="%" />
                  <span className="text-xs text-orange-500 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Görsel URL</label>
                <input type="text" value={newProduct.image} onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Linki</label>
                <input type="text" value={newProduct.product_link} onChange={(e) => setNewProduct({ ...newProduct, product_link: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={saveNewProductOnly} className="flex-1 py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700">
                  <Save className="w-4 h-4" /> Kaydet
                </button>
                <button onClick={saveNewProduct} className="flex-1 py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Ekle
                </button>
              </div>
            </div>
            {newProduct.price && newProductCurrency !== 'TRY' && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                {getCurrencySymbol(newProductCurrency)}{parseFloat(newProduct.price).toLocaleString('tr-TR')} × {newProductCurrency === 'EUR' ? eurRate : newProductCurrency === 'USD' ? usdRate : gbpRate} = <span className="font-bold text-gray-900">₺{convertToTry(parseFloat(newProduct.price) || 0, newProductCurrency).toLocaleString('tr-TR')}</span> (TL karşılığı)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase text-left">
                <th className="py-2 px-2 w-8"></th>
                <th className="py-2 px-2 w-16">Görsel</th>
                <th className="py-2 px-2">Ürün</th>
                <th className="py-2 px-2 w-14 text-center">Adet</th>
                <th className="py-2 px-2 w-36 text-right">Fiyat ({sym})</th>
                <th className="py-2 px-2 w-28 text-right bg-orange-50/50">Kâr</th>
                <th className="py-2 px-2 w-28 text-right">Toplam</th>
                <th className="py-2 px-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {(() => { let pIdx = 0; return items.map((item, idx) => {
                if (item.type === 'section') {
                  return (
                    <tr key={item.id} onDragEnter={() => handleDragEnter(idx)} onDragOver={(e) => e.preventDefault()} className="bg-gray-100 border-b border-gray-200">
                      <td colSpan={8} className="py-2 px-4 relative cursor-move" draggable onDragStart={() => handleDragStart(idx)} onDragEnd={handleDrop}>
                        <input type="text" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="w-full text-center font-bold text-sm uppercase tracking-wide text-gray-700 bg-transparent outline-none" />
                        <button onClick={() => removeItem(item.id)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  );
                }
                pIdx++;
                const netUnitPrice = item.price * (1 - item.item_discount / 100);
                const displayUnitPrice = convertCurrency(netUnitPrice);
                const displayLineTotal = convertCurrency(item.total);
                const itemProfit = (item.price - item.cost) * item.quantity * (1 - item.item_discount / 100);
                const itemProfitPercent = item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : 0;
                return (
                  <tr key={item.id} onDragEnter={() => handleDragEnter(idx)} onDragOver={(e) => e.preventDefault()} className={`border-b border-gray-100 hover:bg-blue-50/30 transition ${item.shipped ? 'opacity-40 line-through' : ''}`}>
                    <td className="py-3 px-2 cursor-move text-center" draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(idx); }} onDragEnd={handleDrop}>
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 inline" />
                      <input
                        key={`pos-${item.id}-${pIdx}`}
                        type="number" min={1}
                        defaultValue={pIdx}
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        onBlur={(e) => { const v = parseInt(e.target.value); if (v && v !== pIdx) moveItemToPosition(item.id, v); else e.target.value = String(pIdx); }}
                        title="Sıra numarası — yazıp Enter'a basınca bu sıraya taşınır"
                        className="mt-0.5 w-8 text-[11px] text-center text-gray-500 font-bold bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="relative w-12 h-12 border rounded bg-white overflow-hidden group">
                        {item.image ? <img src={item.image} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-100" />}
                        <button onClick={() => { const url = prompt('Görsel URL:', item.image); if (url !== null) updateItem(item.id, 'image', url); }} className="absolute inset-0 bg-black/40 text-white text-[8px] font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center">Görseli değiştir</button>
                      </div>
                    </td>
                    <td className="py-3 px-2 max-w-xs">
                      <div className="flex items-center gap-1">
                        <input type="text" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="flex-1 font-bold text-sm text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none" />
                        {(() => {
                          const matchedProduct = products.find(p => p.brand_id === brandId && ((item.sku && p.sku === item.sku) || p.name === item.name));
                          const nameChanged = item.sku ? products.find(p => p.brand_id === brandId && p.sku === item.sku && p.name !== item.name) : null;
                          if (nameChanged) return (
                            <button onClick={() => { updateProduct(nameChanged.id, { name: item.name }); }} className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition" title="Ürün adını güncelle">✓ Kaydet</button>
                          );
                          if (!matchedProduct && item.name.trim()) return (
                            <button onClick={() => { addProduct({ id: `prod-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, brand_id: brandId, name: item.name, description: item.description || '', sku: item.sku || '', price: parseFloat(String(item.price)) || 0, cost: parseFloat(String(item.cost)) || 0, currency: item.input_currency || 'TRY', category: '', manufacturer: '', image: item.image || '', product_link: item.product_link || '' }); }} className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500 text-white hover:bg-green-600 transition" title="Ürünü veritabanına kaydet">✓ Kaydet</button>
                          );
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">Ürün kodu:</span>
                        <input type="text" value={item.sku || ''} onChange={(e) => updateItem(item.id, 'sku', e.target.value)} className="text-[10px] text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-32" placeholder="SKU girin" />
                      </div>
                      <div className="mt-1">
                        <RichEditor value={item.description || ''} onChange={(html) => updateItem(item.id, 'description', html)} placeholder="Teknik özellikler (yazmak için tıklayın)" minHeight={44} toolbarOnFocus onSnippetClick={() => setSnippetTargetId(item.id)} />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-12 text-center text-sm font-bold bg-gray-50 border border-gray-200 rounded" min="1" />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">{sym}</span>
                        <input
                          type="number"
                          value={Math.round(displayUnitPrice * 100) / 100}
                          onChange={(e) => {
                            const displayVal = parseFloat(e.target.value) || 0;
                            // Dövizden TL'ye çevir → dahili fiyatı TL olarak kaydet
                            const tryVal = currency === 'TRY' ? displayVal
                              : currency === 'EUR' ? displayVal * eurRate
                              : currency === 'USD' ? displayVal * usdRate
                              : currency === 'GBP' ? displayVal * gbpRate
                              : displayVal;
                            updateItem(item.id, 'price', tryVal.toFixed(2));
                          }}
                          className="w-28 text-right text-base font-bold text-gray-800 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                      <div className="text-[9px] text-gray-400 mt-0.5 text-right">KDV Dahil: {formatCurrency(displayUnitPrice * (1 + KDV_RATE), sym)}</div>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-[10px] text-red-400">İnd%:</span>
                        <input type="number" value={item.item_discount} onChange={(e) => updateItem(item.id, 'item_discount', e.target.value)} className="w-10 text-right text-xs border-b border-gray-200 outline-none text-red-500 font-bold" placeholder="0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right bg-orange-50/50">
                      <div className={`text-xs font-bold ${itemProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(convertCurrency(itemProfit), sym)}</div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded w-fit ml-auto mt-0.5 ${itemProfitPercent > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>%{itemProfitPercent.toFixed(0)}</div>
                      <div className="mt-1">
                        <span className="text-[9px] text-gray-400">Maliyet:</span>
                        <input type="number" value={Math.round(convertCurrency(item.cost) * 100) / 100} onChange={(e) => {
                          const displayCost = parseFloat(e.target.value) || 0;
                          const tryCost = currency === 'TRY' ? displayCost
                            : currency === 'EUR' ? displayCost * eurRate
                            : currency === 'USD' ? displayCost * usdRate
                            : currency === 'GBP' ? displayCost * gbpRate
                            : displayCost;
                          updateItem(item.id, 'cost', tryCost.toFixed(2));
                        }} className="w-20 text-center text-xs bg-white border border-gray-200 rounded px-1 py-0.5 mt-0.5" placeholder="0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-gray-800">{formatCurrency(displayLineTotal, sym)}</td>
                    <td className="py-3 px-2">
                      <div className="grid grid-cols-2 gap-1 w-fit mx-auto">
                        <button onClick={() => updateItem(item.id, 'hide_price', !item.hide_price)} className={`p-1.5 rounded ${item.hide_price ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'} hover:bg-orange-200`} title="Fiyatı Gizle">
                          {item.hide_price ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => updateItem(item.id, 'shipped', !item.shipped)} className={`p-1.5 rounded ${item.shipped ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'} hover:bg-red-200`} title="Sevk Edildi">
                          <Truck className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => duplicateItem(idx)} className="p-1.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-200" title="Kopyala"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeItem(item.id)} className="p-1.5 rounded bg-rose-50 text-rose-500 hover:bg-rose-200" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }); })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals + Profit */}
      {items.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 justify-end">
          {/* Profit Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 w-full lg:w-auto lg:min-w-[320px] shadow-sm">
            <h4 className="text-sm font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">📊 Kâr Analizi</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Satış Toplamı:</span><span className="font-semibold">{formatCurrency(convertCurrency(discountedSubTotal), sym)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Maliyet:</span><span className="font-semibold">{formatCurrency(convertCurrency(totalCost), sym)}</span></div>
              <div className="border-t border-orange-200 pt-2 flex justify-between bg-orange-100 p-2 rounded">
                <span className="font-bold text-orange-900">Net Kâr:</span>
                <span className={`font-bold text-lg ${netProfit > 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(convertCurrency(netProfit), sym)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500 text-xs">Marj:</span><span className={`font-bold text-sm ${profitMargin > 20 ? 'text-green-600' : 'text-orange-600'}`}>%{profitMargin.toFixed(1)}</span></div>
            </div>
          </div>

          {/* Totals Box */}
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm text-gray-600"><span>Ara Toplam:</span><span className="font-semibold">{formatCurrency(convertCurrency(subTotal), sym)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Genel İskonto:</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-20 text-right border-b border-gray-300 outline-none bg-transparent text-sm font-semibold" />
                <span className="text-red-500 font-semibold text-sm">-{formatCurrency(convertCurrency(discountValue), sym)}</span>
              </div>
            </div>
            {discountValue > 0 && <div className="flex justify-between text-sm border-t border-dashed pt-2"><span className="text-gray-600">İndirimli Ara Toplam:</span><span className="font-semibold">{formatCurrency(convertCurrency(discountedSubTotal), sym)}</span></div>}
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">KDV (%20):</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowVAT(true)} className={`px-2 py-0.5 rounded text-xs font-bold transition ${showVAT ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Göster</button>
                <button onClick={() => setShowVAT(false)} className={`px-2 py-0.5 rounded text-xs font-bold transition ${!showVAT ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Gizle</button>
                <span className="font-semibold">{formatCurrency(convertCurrency(kdvTotal), sym)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Kargo / Taşıma Bedeli:</span>
              <div className="flex items-center gap-1">
                <input type="number" min="0" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="w-20 text-right border-b border-gray-300 outline-none bg-transparent text-sm font-semibold" />
                <span className="text-sm">{formatCurrency(convertCurrency(shippingCost), sym)}</span>
              </div>
            </div>
            {installment > 0 && (
              <div className="flex justify-between text-sm text-orange-600 items-center">
                <span>Taksit Farkı ({installment} taksit, %{installment * 3}):</span>
                <span className="font-semibold">+{formatCurrency(convertCurrency(installmentExtra), sym)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-extrabold text-gray-900 border-t-2 border-gray-800 pt-3 mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(convertCurrency(finalTotal), sym)}</span></div>
            <div className="text-right text-xs text-gray-500 italic">{numberToText(convertCurrency(finalTotal), currency)}</div>
          </div>
        </div>
      )}

      {/* Taksit / Vade Seçimi */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Taksitli Ödeme (Kredi Kartı)</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showInstallment} onChange={(e) => { setShowInstallment(e.target.checked); if (!e.target.checked) setInstallment(0); }} className="accent-blue-600" />
            <label className="text-xs font-bold text-gray-500">Teklifte Göster</label>
          </div>
        </div>
        {showInstallment && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => setInstallment(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${installment === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Peşin</button>
            {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
              <button key={n} onClick={() => setInstallment(n)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${installment === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {n} Taksit <span className="text-[10px] opacity-75">(%{n*3})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* IBAN / Ödeme Bilgileri Ayarı */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Ödeme Bilgileri (IBAN)</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showIban} onChange={(e) => setShowIban(e.target.checked)} className="accent-blue-600" />
            <label className="text-xs font-bold text-gray-500">Teklifte Göster</label>
          </div>
        </div>
        {showIban && (
          <div className="flex gap-3">
            <button onClick={() => setSelectedIban(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Tümü</button>
            <button onClick={() => setSelectedIban(1)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Kurumsal (Güçlü Reklam)</button>
            <button onClick={() => setSelectedIban(2)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Bireysel (Buse Turancı)</button>
            <button onClick={() => setSelectedIban(3)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 3 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Kurumsal (Güçlü İnoks)</button>
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Şartlar ve Koşullar</h3>
        <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm outline-none resize-none focus:border-blue-500" />
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">{items.length} kalem ürün</div>
        <div className="flex gap-2">
          <button onClick={() => setIsPrintMode(true)} className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-900"><Eye className="w-5 h-5" /> Önizle ve Yazdır</button>
        </div>
      </div>

      {/* Paketleri Yönet Modal */}
      {showPackageManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2"><Boxes className="w-5 h-5" /> Paketleri Yönet</h2>
              <button onClick={() => { setShowPackageManager(false); setEditingPackage(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex min-h-[500px]">
              {/* Sol panel: Paket listesi */}
              <div className="w-72 border-r p-4 space-y-3 overflow-y-auto">
                <div className="flex gap-2">
                  <input type="text" value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} placeholder="Paket Adı" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm" onKeyDown={(e) => e.key === 'Enter' && createNewPackage()} />
                </div>
                <button onClick={createNewPackage} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Yeni Paket Oluştur</button>

                {brandPackages.map(pkg => (
                  <div key={pkg.id} className={`p-3 rounded-xl border cursor-pointer transition ${editingPackage?.id === pkg.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold text-sm text-gray-900" onClick={() => setEditingPackage(pkg)}>{pkg.name}</div>
                    <div className="text-[10px] text-gray-400">{pkg.items.length} Ürün</div>
                    <div className="flex items-center gap-1 mt-2">
                      <button onClick={() => loadPackageToProposal(pkg)} className="text-[10px] text-blue-600 font-bold hover:underline">Listeye Yükle</button>
                      <button onClick={() => setEditingPackage(pkg)} className="p-1 rounded hover:bg-gray-100"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                      <button onClick={() => duplicatePackage(pkg)} className="p-1 rounded hover:bg-blue-50" title="Çoğalt"><Copy className="w-3 h-3 text-blue-400" /></button>
                      <button onClick={() => { if (confirm('Bu paketi silmek istediğinize emin misiniz?')) { removePackage(pkg.id); if (editingPackage?.id === pkg.id) setEditingPackage(null); const remaining = useAppStore.getState().packages.filter(p => p.id !== pkg.id); syncPackagesToFile(remaining); } }} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sağ panel: Paket düzenleme */}
              <div className="flex-1 p-5 overflow-y-auto">
                {editingPackage ? (
                  <>
                    {/* Paket adı düzenlenebilir */}
                    <input
                      type="text"
                      value={editingPackage.name}
                      onChange={(e) => renamePackage(e.target.value)}
                      className="text-lg font-bold text-gray-900 mb-4 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none pb-1"
                    />

                    {/* Katalogdan Ürün Ara + Ekle */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-4 mb-4">
                      <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Pakete Ürün Ekle</h4>

                      {/* Ürün Arama */}
                      <div className="relative mb-3">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={pkgProductSearch}
                            onChange={(e) => { setPkgProductSearch(e.target.value); setShowPkgProductSearch(e.target.value.length >= 2); }}
                            placeholder="Katalogdan ürün ara (isim, SKU, kategori)..."
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                        {showPkgProductSearch && pkgProductSearch.length >= 2 && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {(() => {
                              const words = pkgProductSearch.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                              const results = brandProducts.filter(p => {
                                const text = [p.name, p.sku || '', p.category || '', p.manufacturer || ''].join(' ').toLowerCase();
                                return words.every(w => text.includes(w));
                              }).slice(0, 15);
                              return results.length > 0 ? results.map((p, i) => (
                                <button key={i} onClick={() => addProductToPackage(p)} className="w-full text-left p-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm">
                                  <div className="font-medium text-gray-900">{p.name}</div>
                                  <div className="text-[10px] text-gray-400">{p.manufacturer} • {p.sku} • {p.currency} {p.price?.toLocaleString('tr-TR')}</div>
                                </button>
                              )) : <div className="p-3 text-xs text-gray-400 text-center">Ürün bulunamadı</div>;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Manuel Ürün Ekleme */}
                      <details className="mb-3">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Manuel ürün ekle</summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 mb-3">
                          <input type="text" value={newPkgItem.product_link} onChange={(e) => setNewPkgItem({ ...newPkgItem, product_link: e.target.value })} placeholder="Link (Otomatik İsim)" className="p-2 border border-gray-200 rounded-lg text-sm" />
                          <input type="text" value={newPkgItem.name} onChange={(e) => setNewPkgItem({ ...newPkgItem, name: e.target.value })} placeholder="Ürün Adı" className="p-2 border border-gray-200 rounded-lg text-sm col-span-full" />
                          <input type="text" value={newPkgItem.image} onChange={(e) => setNewPkgItem({ ...newPkgItem, image: e.target.value })} placeholder="Görsel URL" className="p-2 border border-gray-200 rounded-lg text-sm" />
                          <input type="text" value={newPkgItem.description} onChange={(e) => setNewPkgItem({ ...newPkgItem, description: e.target.value })} placeholder="Açıklama" className="p-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <input type="number" value={newPkgItem.price} onChange={(e) => setNewPkgItem({ ...newPkgItem, price: e.target.value })} placeholder="Fiyat" className="p-2 border border-gray-200 rounded-lg text-sm" />
                          <input type="number" value={newPkgItem.cost} onChange={(e) => setNewPkgItem({ ...newPkgItem, cost: e.target.value })} placeholder="Maliyet" className="p-2 border border-gray-200 rounded-lg text-sm" />
                          <input type="number" value={newPkgItem.quantity} onChange={(e) => setNewPkgItem({ ...newPkgItem, quantity: e.target.value })} placeholder="Adet" className="p-2 border border-gray-200 rounded-lg text-sm" min="1" />
                          <select value={newPkgItemCurrency} onChange={(e) => setNewPkgItemCurrency(e.target.value as any)} className="p-2 border border-gray-200 rounded-lg text-sm">
                            <option value="TRY">₺ TRY</option>
                            <option value="EUR">€ EUR</option>
                            <option value="USD">$ USD</option>
                            <option value="GBP">£ GBP</option>
                          </select>
                        </div>
                        <button onClick={addItemToPackage} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Pakete Ekle</button>
                      </details>
                    </div>

                    {/* Paket içeriği — düzenlenebilir */}
                    <div className="space-y-2">
                      {editingPackage.items.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            {/* Görsel */}
                            <div className="relative w-12 h-12 flex-shrink-0 border rounded bg-white overflow-hidden group">
                              {item.image ? <img src={item.image} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-100" />}
                              <button
                                onClick={() => { const url = prompt('Yeni görsel URL:', item.image || ''); if (url !== null) updatePackageItem(idx, 'image', url); }}
                                className="absolute inset-0 bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              ><ImagePlus className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <input type="text" value={item.name} onChange={(e) => updatePackageItem(idx, 'name', e.target.value)} className="font-bold text-sm text-gray-900 w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none" />
                              <div className="flex gap-2 mt-1.5 items-center">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">Adet:</span>
                                  <input type="number" value={item.quantity} onChange={(e) => updatePackageItem(idx, 'quantity', e.target.value)} className="w-10 text-xs text-center bg-gray-50 border border-gray-200 rounded" min="1" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">Fiyat:</span>
                                  <input type="number" value={item.price} onChange={(e) => updatePackageItem(idx, 'price', e.target.value)} className="w-20 text-xs text-center bg-gray-50 border border-gray-200 rounded font-bold text-green-600" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">Mal:</span>
                                  <input type="number" value={item.cost} onChange={(e) => updatePackageItem(idx, 'cost', e.target.value)} className="w-20 text-xs text-center bg-gray-50 border border-gray-200 rounded" />
                                </div>
                                <select value={item.currency || 'TRY'} onChange={(e) => updatePackageItem(idx, 'currency', e.target.value)} className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                                  <option value="TRY">₺</option>
                                  <option value="EUR">€</option>
                                  <option value="USD">$</option>
                                  <option value="GBP">£</option>
                                </select>
                              </div>
                            </div>
                            <button onClick={() => removeItemFromPackage(idx)} className="p-1.5 hover:bg-red-50 rounded flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editingPackage.items.length > 0 && (
                      <button onClick={loadEditingPackageToProposal} className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                        <Package className="w-4 h-4" /> Teklife Yükle ({editingPackage.items.length} ürün)
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Sol taraftan bir paket seçin veya yeni paket oluşturun
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hazır Açıklama/Not kartı */}
      {snippetTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSnippetTargetId(null)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="font-extrabold text-gray-800 flex items-center gap-2"><StickyNote className="w-4 h-4 text-blue-600" /> Hazır Açıklamalar</h3>
              <button onClick={() => setSnippetTargetId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-4 overflow-auto space-y-2">
              <p className="text-xs text-gray-400 mb-1">Bir nota tıkla → seçili ürünün açıklamasına eklenir.</p>
              {snippets.length === 0 && <p className="text-sm text-gray-400 italic py-2">Henüz kayıtlı not yok. Aşağıdan ekleyebilirsin.</p>}
              {snippets.map((s) => (
                <div key={s.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-300 transition">
                  <button onClick={() => insertSnippet(s.text)} className="flex-1 text-left text-sm text-gray-700 rich-content" dangerouslySetInnerHTML={{ __html: renderRichHtml(s.text) }} />
                  <button onClick={() => insertSnippet(s.text)} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0 hover:bg-blue-100">+ Ekle</button>
                  <button onClick={() => deleteSnippet(s.id)} className="text-gray-300 hover:text-red-500 shrink-0" title="Notu sil"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Yeni Not Ekle (biçimlendirebilirsin)</label>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0"><RichEditor value={newSnippet} onChange={setNewSnippet} placeholder="Örn: Deterjan pompası hariçtir." minHeight={44} /></div>
                <button onClick={addSnippet} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shrink-0">Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
