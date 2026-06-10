'use client';

import { useParams } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { useAppStore } from '@/lib/store';
import { useState, useRef, useEffect, useMemo } from 'react';
import { FileDown, Printer, RotateCcw, Shuffle, Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function KargoEtiketPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { customers } = useAppStore();
  const brandCustomers = customers.filter((c) => c.brand_id === brandId);

  const labelRef = useRef<HTMLDivElement>(null);

  // Form state
  const [tracking, setTracking] = useState('');
  const [payment, setPayment] = useState('ALICI ÖDEMELİ');
  const [ambar, setAmbar] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [desi, setDesi] = useState('');
  const [note, setNote] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Müşteri filtreleme
  const filteredCustomers = useMemo(() => {
    if (!customerSearch || customerSearch.length < 2) return [];
    const s = customerSearch.toLowerCase();
    return brandCustomers.filter(c =>
      c.name.toLowerCase().includes(s) || (c.phone || '').includes(s) || (c.city || '').toLowerCase().includes(s)
    ).slice(0, 10);
  }, [customerSearch, brandCustomers]);

  const selectCustomer = (c: any) => {
    setRecipientName(c.name || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setCity(c.city || '');
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  // Bugünün tarihi
  const today = new Date().toLocaleDateString('tr-TR');

  // Rastgele takip no
  const generateTracking = () => {
    const prefix = brandId === 'guclumutfak' ? 'GM' : brandId === 'mutpro' ? 'MP' : 'IN';
    const num = Math.floor(100000000 + Math.random() * 900000000);
    setTracking(prefix + num);
  };

  useEffect(() => { generateTracking(); }, []);

  // Barkod oluştur
  useEffect(() => {
    if (!tracking) return;
    const loadBarcode = async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        const el = document.getElementById('barcode-svg');
        if (el) {
          JsBarcode(el, tracking, {
            format: 'CODE128', width: 1.5, height: 30,
            displayValue: true, fontSize: 12, margin: 0, background: 'transparent',
          });
        }
      } catch {}
    };
    loadBarcode();
  }, [tracking]);

  // Formu temizle
  const clearForm = () => {
    setPayment('ALICI ÖDEMELİ');
    setAmbar('');
    setRecipientName('');
    setPhone('');
    setAddress('');
    setCity('');
    setProduct('');
    setQuantity('1');
    setDesi('');
    setNote('');
    setCustomerSearch('');
    generateTracking();
  };

  // PDF indir
  const downloadPDF = async () => {
    if (!labelRef.current) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      let fileName = recipientName.trim() || 'Kargo_Etiketi';
      if (city.trim().length > 2) fileName += ' - ' + city.trim();
      fileName += '.pdf';

      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0, scrollX: 0, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
        pagebreak: { mode: ['avoid-all'] },
      };
      await html2pdf().set(opt).from(labelRef.current).save();
    } catch (err) {
      console.error('PDF hatası:', err);
      alert('PDF oluşturulurken hata oluştu.');
    }
    setIsDownloading(false);
  };

  // Marka bazlı gönderici bilgileri
  const senderInfo = {
    guclumutfak: {
      name: 'GÜÇLÜ MUTFAK',
      logo: 'https://cdn.myikas.com/images/theme-images/4036443e-0fdf-43fc-9903-6a4ba22635d4/image_1080.webp',
      address1: 'Maltepe Mah. Davutpaşa Cad.',
      address2: 'Tim 1 İş Merkezi. No:6/24 Zeytinburnu/İstanbul',
      email: 'info@guclumutfak.com',
      website: 'www.guclumutfak.com',
      phone: '0541 480 8388',
      accentColor: '#dc2626',
      accentBg: 'bg-red-600',
    },
    mutpro: {
      name: 'MUTPRO',
      logo: 'https://cdn.myikas.com/images/theme-images/28f96c57-de53-42dc-96e5-988cf858f78b/image_540.webp',
      address1: 'Balaç Mahallesi Recep Tayyip Erdoğan Bulvarı',
      address2: 'No:114 Atakum / Samsun',
      email: 'info@mutpro.com',
      website: 'www.mutpro.com',
      phone: '0546 936 18 55',
      accentColor: '#f97316',
      accentBg: 'bg-orange-500',
    },
    inoks: {
      name: 'İNOKS ENDÜSTRİYEL MUTFAK',
      logo: '/logos/inoks-logo.png',
      address1: 'Bahçeşehir 1. Kısım, Doğa Parkı Cad M Blok',
      address2: '13-15MD Başakşehir/İstanbul',
      email: 'info@inoksendustriyel.com',
      website: 'www.inoksendustriyel.com',
      phone: '0532 219 21 60',
      accentColor: '#b91c1c',
      accentBg: 'bg-red-700',
    },
  };
  const sender = senderInfo[brandId as keyof typeof senderInfo] || senderInfo.mutpro;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kargo Etiketi</h1>
          <p className="text-sm text-gray-500">{brand.fullName} - Kargo etiketi oluşturun ve PDF olarak indirin</p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearForm} className="px-3 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Temizle
          </button>
          <button onClick={() => window.print()} className="px-3 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Yazdır
          </button>
          <button onClick={downloadPDF} disabled={isDownloading} className={`px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-1.5 ${sender.accentBg} hover:opacity-90 disabled:opacity-50`}>
            <FileDown className="w-4 h-4" /> {isDownloading ? 'Oluşturuluyor...' : 'PDF İndir'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* SOL: Form */}
        <div className="w-[380px] flex-shrink-0 space-y-3 print:hidden">
          {/* Müşteri Arama */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Müşteri Seç</h3>
            <div className="relative">
              <input
                type="text" value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Müşteri adı veya telefon ara..."
                className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-50">
                  {filteredCustomers.map((c) => (
                    <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.phone} • {c.city}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gönderim Detayları */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <button onClick={() => setShowForm(!showForm)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
              Gönderim Detayları
              {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showForm && (
              <div className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-0.5 block">Takip / Sipariş No</label>
                    <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono" />
                  </div>
                  <button onClick={generateTracking} className="self-end p-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Rastgele">
                    <Shuffle className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Ödeme Tipi</label>
                  <select value={payment} onChange={(e) => setPayment(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold">
                    <option>ALICI ÖDEMELİ</option>
                    <option>GÖNDERİCİ ÖDEMELİ</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Gönderici Ambarı (Opsiyonel)</label>
                  <input type="text" value={ambar} onChange={(e) => setAmbar(e.target.value)} placeholder="Örn: GÜVEN AMBARI" className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Alıcı Bilgileri */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Alıcı Bilgileri</h3>
            <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Alıcı Adı / Firma" className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon Numarası" className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Açık Adres" className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none" />
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="İlçe / İL (Örn: ZEYTİNBURNU / İSTANBUL)" className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold" />
          </div>

          {/* Paket İçeriği */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Paket İçeriği</h3>
            <textarea value={product} onChange={(e) => setProduct(e.target.value)} rows={3} placeholder="Ürünleri buraya listeleyin..." className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-0.5">Adet</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center font-bold" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-0.5">Desi</label>
                <input type="text" value={desi} onChange={(e) => setDesi(e.target.value)} placeholder="-" className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Özel Not</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn: KIRILACAK EŞYA" className="w-full p-2 border border-red-200 rounded-lg text-sm text-red-600 font-bold bg-red-50" />
            </div>
          </div>
        </div>

        {/* SAĞ: Önizleme */}
        <div className="flex-1 flex justify-center">
          <div className="origin-top" style={{ transform: 'scale(0.75)' }}>
            {/* A4 Yatay Kağıt */}
            <div ref={labelRef} style={{ width: '297mm', height: '208mm', background: 'white', padding: '5mm', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              <div style={{ border: '3px solid #000', height: '100%', display: 'flex', flexDirection: 'column', background: 'white' }}>

                {/* 1. SATIR: Gönderici */}
                <div style={{ display: 'flex', borderBottom: '2px solid #000', height: '25%' }}>
                  {/* Logo */}
                  <div style={{ width: '33.33%', borderRight: '2px solid #000', padding: '4mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={sender.logo} crossOrigin="anonymous" alt={sender.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                  {/* Gönderici Bilgi */}
                  <div style={{ width: '66.67%', padding: '4mm', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f9fafb', position: 'relative' }}>
                    {/* Barkod */}
                    <div style={{ position: 'absolute', top: '2mm', right: '2mm' }}>
                      <svg id="barcode-svg"></svg>
                    </div>

                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1mm', marginTop: '4mm' }}>GÖNDERİCİ / SENDER</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#111827', marginBottom: '1mm' }}>{sender.name}</div>
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>
                      <div><strong>Adres:</strong> {sender.address1}</div>
                      <div>{sender.address2}</div>
                      <div style={{ marginTop: '2mm', display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>
                        <span>{sender.email}</span>
                        <span>{sender.website}</span>
                        <span style={{ color: '#000', fontWeight: 700 }}>{sender.phone}</span>
                      </div>
                    </div>
                    {ambar && (
                      <div style={{ marginTop: '2mm' }}>
                        <span style={{ background: '#1f2937', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                          SEVK AMBARI: <span style={{ color: '#facc15', fontSize: '13px', textTransform: 'uppercase' }}>{ambar.toLocaleUpperCase('tr-TR')}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SATIR: Alıcı */}
                <div style={{ flexGrow: 1, borderBottom: '2px solid #000', padding: '8mm', background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Sağ üst: Etiket + Ödeme */}
                  <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 10 }}>
                    <div style={{ background: '#000', color: '#fff', padding: '2px 12px', fontSize: '10px', fontWeight: 700, borderBottomLeftRadius: '8px' }}>ALICI / CONSIGNEE</div>
                    <div style={{ background: '#000', color: '#fff', padding: '6px 12px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', borderLeft: '4px solid #fff', borderBottom: '4px solid #fff' }}>
                      {payment}
                    </div>
                  </div>

                  {/* İsim */}
                  <div style={{ fontSize: recipientName.length > 30 ? '36px' : '48px', fontWeight: 900, color: recipientName ? '#111827' : '#d1d5db', letterSpacing: '-0.5px', lineHeight: 1, paddingRight: '140px', wordBreak: 'break-word' }}>
                    {recipientName ? recipientName.toLocaleUpperCase('tr-TR') : 'ALICI İSMİ'}
                  </div>

                  {/* Adres */}
                  <div style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start', marginTop: '2mm', overflow: 'hidden' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: address.length > 100 ? '18px' : '22px', color: address ? '#1f2937' : '#d1d5db', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {address ? address.toLocaleUpperCase('tr-TR') : 'Teslimat adresi buraya gelecek...'}
                      </div>
                      {city && (
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#111827', marginTop: '2mm', textTransform: 'uppercase' }}>
                          {city.toLocaleUpperCase('tr-TR')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telefon */}
                  <div style={{ marginTop: '2mm', display: 'flex', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '2mm' }}>
                    <span style={{ color: '#6b7280', fontWeight: 700, marginRight: '16px', fontSize: '14px' }}>İLETİŞİM:</span>
                    <span style={{ fontSize: '22px', fontFamily: 'monospace', color: '#111827', fontWeight: 700 }}>{phone || '-'}</span>
                  </div>
                </div>

                {/* 3. SATIR: Ürün + Detaylar */}
                <div style={{ height: '33.33%', display: 'flex' }}>
                  {/* Ürün Listesi */}
                  <div style={{ width: '75%', borderRight: '2px solid #000', padding: '6mm', background: '#f9fafb', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '2mm', borderBottom: '1px solid #d1d5db', paddingBottom: '1mm' }}>İÇERİK BİLGİSİ / CONTENT</div>
                    <div style={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ fontSize: product.length > 200 ? '11px' : '14px', color: product ? '#1f2937' : '#9ca3af', fontWeight: product ? 500 : 400, whiteSpace: 'pre-wrap', lineHeight: 1.3, fontStyle: product ? 'normal' : 'italic' }}>
                        {product || 'Ürün içeriği girilmedi...'}
                      </div>
                    </div>
                    {note && (
                      <div style={{ position: 'absolute', bottom: '4mm', right: '4mm', border: '2px solid #dc2626', color: '#dc2626', padding: '4px 12px', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', transform: 'rotate(-2deg)', borderRadius: '4px', background: '#fff', zIndex: 20 }}>
                        {note.toLocaleUpperCase('tr-TR')}
                      </div>
                    )}
                  </div>

                  {/* Sağ: Tarih, Adet, Desi */}
                  <div style={{ width: '25%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, borderBottom: '2px solid #000', padding: '4mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>TARİH</span>
                      <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700 }}>{today}</span>
                    </div>
                    <div style={{ flex: 1, borderBottom: '2px solid #000', padding: '4mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>TOPLAM ADET</span>
                      <span style={{ fontSize: '36px', fontWeight: 900 }}>{quantity || '1'}</span>
                    </div>
                    <div style={{ flex: 1, padding: '4mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>DESİ</span>
                      <span style={{ fontSize: '22px', fontWeight: 700 }}>{desi || '-'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
