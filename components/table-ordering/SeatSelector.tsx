'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Armchair, Loader as Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { TableSeat, TableSession } from '@/lib/table-ordering/types';

type Props = {
  session: TableSession;
  seats: TableSeat[];
  deviceId: string;
  themeColor: string;
  onClaimed: (seat: TableSeat) => void;
  onDismiss?: () => void;
};

export default function SeatSelector({ session, seats, deviceId, themeColor, onClaimed, onDismiss }: Props) {
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    if (!selectedSeatId) {
      toast.error('Please select a seat');
      return;
    }
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/table-ordering/seats/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          seat_id: selectedSeatId,
          device_id: deviceId,
          claimed_name: guestName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Seat ${data.seat.seat_number} claimed!`);
      onClaimed(data.seat);
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim seat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Armchair className="w-6 h-6" style={{ color: themeColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Choose Your Seat</h2>
              <p className="text-sm text-slate-500">Select an available seat to start ordering</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {seats.map((seat) => {
            const isOpen = seat.status === 'open';
            const isSelected = seat.id === selectedSeatId;
            return (
              <button
                key={seat.id}
                disabled={!isOpen}
                onClick={() => isOpen && setSelectedSeatId(seat.id)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                  ${isOpen
                    ? isSelected
                      ? 'border-current text-white shadow-md'
                      : 'border-slate-200 text-slate-700 hover:border-slate-400 bg-white'
                    : 'border-slate-100 text-slate-400 bg-slate-50 cursor-not-allowed'
                  }
                `}
                style={isSelected ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
              >
                <Armchair className="w-5 h-5" />
                <span className="text-xs font-semibold">{seat.seat_number}</span>
                {!isOpen && <span className="text-[10px]">Taken</span>}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Your Name</label>
          <Input
            placeholder="Enter your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="h-12"
          />
        </div>

        <Button
          onClick={handleClaim}
          disabled={loading || !selectedSeatId}
          className="w-full h-12 text-base font-semibold text-white"
          style={{ backgroundColor: themeColor }}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Claiming...</>
          ) : (
            'Claim Seat & Start Ordering'
          )}
        </Button>
      </div>
    </div>
  );
}
