'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList, Loader as Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  tableToken: string;
  themeColor: string;
  onRequested: () => void;
};

export default function RequestActivationCard({ tableToken, themeColor, onRequested }: Props) {
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/table-ordering/sessions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_token: tableToken, guest_name: guestName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Activation requested! Please wait for a staff member to activate your table.');
      onRequested();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request activation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <ClipboardList className="w-6 h-6" style={{ color: themeColor }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Request Table Activation</h2>
            <p className="text-sm text-slate-500">A staff member will activate your table shortly</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Your Name</label>
          <Input
            placeholder="Enter your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRequest()}
            className="h-12"
          />
        </div>

        <Button
          onClick={handleRequest}
          disabled={loading}
          className="w-full h-12 text-base font-semibold text-white"
          style={{ backgroundColor: themeColor }}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Requesting...</>
          ) : (
            'Request Activation'
          )}
        </Button>
      </div>
    </div>
  );
}
