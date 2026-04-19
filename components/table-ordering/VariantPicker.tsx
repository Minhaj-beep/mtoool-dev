'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

type Variant = {
  id: string;
  name: string;
  price: number;
};

type Props = {
  dishName: string;
  variants: Variant[];
  themeColor: string;
  onSelect: (variant: Variant) => void;
  onClose: () => void;
};

export default function VariantPicker({ dishName, variants, themeColor, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<Variant | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{dishName}</h3>
            <p className="text-sm text-slate-500">Choose a variant to continue</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                selected?.id === v.id
                  ? 'border-current text-white'
                  : 'border-slate-200 text-slate-800 hover:border-slate-300 bg-white'
              }`}
              style={selected?.id === v.id ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
            >
              <span className="font-medium">{v.name}</span>
              <span className="font-bold">₹{v.price}</span>
            </button>
          ))}
        </div>

        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full h-12 text-base font-semibold text-white"
          style={{ backgroundColor: themeColor }}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
