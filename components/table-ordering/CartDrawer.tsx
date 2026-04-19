'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus, ShoppingCart, Loader as Loader2, CircleCheck as CheckCircle } from 'lucide-react';
import { CartItem } from '@/lib/table-ordering/types';
import { toast } from 'sonner';

type Props = {
  items: CartItem[];
  sessionId: string;
  seatId: string;
  deviceId: string;
  themeColor: string;
  onUpdate: (items: CartItem[]) => void;
  onClose: () => void;
  onOrderPlaced: () => void;
};

export default function CartDrawer({
  items,
  sessionId,
  seatId,
  deviceId,
  themeColor,
  onUpdate,
  onClose,
  onOrderPlaced,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const changeQty = (index: number, delta: number) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    );
    onUpdate(updated);
  };

  const removeItem = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/table-ordering/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          seat_id: seatId,
          device_id: deviceId,
          items: items.map((item) => ({
            dish_id: item.dish_id,
            variant_id: item.variant_id || null,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      toast.success('Order placed successfully!');
      setTimeout(() => {
        onOrderPlaced();
        onClose();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" style={{ color: themeColor }} />
            <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
            <span className="text-sm text-slate-500">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-xl font-bold text-slate-900">Order Placed!</p>
            <p className="text-slate-500 text-center">Your order has been sent to the kitchen.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{item.dish_name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-slate-500">{item.variant_name}</p>
                      )}
                      <p className="text-sm font-medium" style={{ color: themeColor }}>
                        ₹{(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(index, -1)}
                        className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => changeQty(index, 1)}
                        className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(index)}
                        className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Total</span>
                  <span className="text-2xl font-bold text-slate-900">₹{total.toFixed(2)}</span>
                </div>
                <Button
                  onClick={placeOrder}
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold text-white"
                  style={{ backgroundColor: themeColor }}
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Placing Order...</>
                  ) : (
                    `Place Order • ₹${total.toFixed(2)}`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
