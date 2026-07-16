'use client';

import { useRef, useEffect } from 'react';

// Basit zengin metin editörü (contentEditable). Kalın/italik/altı çizili,
// yazı boyutu, renk, madde/numaralı liste, alt satır. Değer HTML olarak tutulur.
const COLORS = ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#ffffff'];
const SIZES: Array<{ l: string; v: string }> = [
  { l: 'S', v: '2' },
  { l: 'M', v: '3' },
  { l: 'L', v: '5' },
];

export default function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 40,
  lists = true,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  lists?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // İçeriği yalnızca dışarıdan farklıysa güncelle (imleç zıplamasın)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:border-blue-500">
      <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1 bg-gray-50 border-b border-gray-200">
        <TB onClick={() => exec('bold')} title="Kalın"><b>B</b></TB>
        <TB onClick={() => exec('italic')} title="İtalik"><i>I</i></TB>
        <TB onClick={() => exec('underline')} title="Altı çizili"><u>U</u></TB>
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
        {SIZES.map((s) => (
          <TB key={s.v} onClick={() => exec('fontSize', s.v)} title={`Yazı boyutu ${s.l}`}><span className="font-bold">{s.l}</span></TB>
        ))}
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('foreColor', c)}
            className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
            style={{ background: c }}
            title="Yazı rengi"
          />
        ))}
        {lists && (
          <>
            <span className="w-px h-4 bg-gray-300 mx-0.5" />
            <TB onClick={() => exec('insertUnorderedList')} title="Madde işaretli liste">•</TB>
            <TB onClick={() => exec('insertOrderedList')} title="Numaralı liste">1.</TB>
          </>
        )}
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
        <TB onClick={() => exec('removeFormat')} title="Biçimi temizle"><span className="text-[10px]">✕</span></TB>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || '')}
        data-ph={placeholder || ''}
        className="px-2 py-1.5 text-sm outline-none rich-ce"
        style={{ minHeight }}
      />
      <style jsx global>{`
        .rich-ce:empty:before { content: attr(data-ph); color: #9ca3af; pointer-events: none; }
        .rich-ce ul { list-style: disc; padding-left: 20px; margin: 2px 0; }
        .rich-ce ol { list-style: decimal; padding-left: 20px; margin: 2px 0; }
      `}</style>
    </div>
  );
}

function TB({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors"
    >
      {children}
    </button>
  );
}

// HTML render yardımcısı: düz metin (etiket yok) ise alt satırları <br>'e çevirir
export function renderRichHtml(v: string): string {
  if (!v) return '';
  return /<[a-z][\s\S]*>/i.test(v) ? v : v.replace(/\n/g, '<br>');
}
