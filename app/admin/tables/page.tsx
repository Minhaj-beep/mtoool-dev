'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableProperties,
  Plus,
  QrCode,
  Download,
  Link as LinkIcon,
  Check,
  RefreshCw,
  Armchair,
  ClipboardList,
  X,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Users,
  Power,
  PowerOff,
  RotateCcw,
  Clock,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

type TableData = {
  id: string;
  table_number: number;
  table_token: string;
  is_active: boolean;
  table_url: string;
};

type Session = {
  id: string;
  status: 'pending' | 'active' | 'closed';
  host_name: string | null;
  created_at: string;
  activated_at: string | null;
};

type Seat = {
  id: string;
  seat_number: number;
  status: 'open' | 'claimed';
  claimed_name: string | null;
  device_id: string | null;
};

type OrderItem = {
  item_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  table_seats: { seat_number: number; claimed_name: string | null } | null;
  order_items: OrderItem[];
};

type TableDetails = {
  session: Session | null;
  seats: Seat[];
  orders: Order[];
};

const SESSION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  placed: { label: 'Placed', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'Preparing', color: 'bg-amber-100 text-amber-700' },
  served: { label: 'Served', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function TablesPage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableDetails, setTableDetails] = useState<Record<string, TableDetails>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [creating, setCreating] = useState(false);

  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode: string; table_url: string; tableNumber: number } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/table-ordering/tables');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables(data.tables || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const loadTableContext = async (tableId: string) => {
    setDetailsLoading((p) => ({ ...p, [tableId]: true }));
    try {
      const res = await fetch(`/api/table-ordering/admin/tables/${tableId}/context`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTableDetails((prev) => ({
        ...prev,
        [tableId]: {
          session: data.session || null,
          seats: data.seats || [],
          orders: data.orders || [],
        },
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load table details');
    } finally {
      setDetailsLoading((p) => ({ ...p, [tableId]: false }));
    }
  };

  const toggleExpand = async (tableId: string) => {
    if (expandedTable === tableId) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(tableId);
    await loadTableContext(tableId);
  };

  const handleCreateTable = async () => {
    if (!newTableNumber.trim()) {
      toast.error('Enter a table number');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/table-ordering/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: Number(newTableNumber) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Table ${newTableNumber} created`);
      setShowCreateDialog(false);
      setNewTableNumber('');
      await loadTables();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create table');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (table: TableData) => {
    try {
      const res = await fetch(`/api/table-ordering/tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !table.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Table ${table.table_number} ${!table.is_active ? 'enabled' : 'disabled'}`);
      await loadTables();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update table');
    }
  };

  const handleShowQR = async (table: TableData) => {
    setQrLoading(true);
    setShowQRDialog(true);
    setQrData(null);
    try {
      const res = await fetch(`/api/table-ordering/tables/${table.id}/qr`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrData({ qrCode: data.qrCode, table_url: data.table_url, tableNumber: table.table_number });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate QR');
      setShowQRDialog(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleActivateSession = async (tableId: string, sessionId: string) => {
    try {
      const res = await fetch('/api/table-ordering/sessions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Table activated — guests can now claim seats');
      await loadTableContext(tableId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate session');
    }
  };

  const handleCloseSession = async (tableId: string, sessionId: string) => {
    try {
      const res = await fetch('/api/table-ordering/sessions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Session closed');
      await loadTableContext(tableId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to close session');
    }
  };

  const handleResetSeat = async (tableId: string, seatId: string) => {
    try {
      const res = await fetch('/api/table-ordering/seats/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_id: seatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Seat reset');
      await loadTableContext(tableId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset seat');
    }
  };

  const handleUpdateOrderStatus = async (tableId: string, orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/table-ordering/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Order marked as ${status}`);
      await loadTableContext(tableId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    }
  };

  const getSessionStatusBadge = (session: Session | null) => {
    if (!session) return { label: 'No Session', color: 'bg-slate-100 text-slate-500' };
    return SESSION_STATUS_CONFIG[session.status] || { label: session.status, color: 'bg-slate-100 text-slate-500' };
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Table Management</h1>
          <p className="text-slate-600 mt-1">Manage tables, sessions, seats, and orders</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Table
        </Button>
      </div>

      {tables.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TableProperties className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No tables yet</h3>
            <p className="text-slate-500 mb-6">Create your first table to start accepting table orders</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tables.map((table) => {
            const isExpanded = expandedTable === table.id;
            const details = tableDetails[table.id];
            const isLoadingDetails = detailsLoading[table.id];
            const sessionBadge = details ? getSessionStatusBadge(details.session) : null;

            return (
              <div key={table.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TableProperties className="w-6 h-6 text-slate-700" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">Table {table.table_number}</h3>
                        {!table.is_active && (
                          <Badge className="bg-red-100 text-red-700 text-xs border-0">Disabled</Badge>
                        )}
                        {sessionBadge && (
                          <Badge className={`text-xs border-0 ${sessionBadge.color}`}>
                            {sessionBadge.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{table.table_url}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowQR(table)}
                        className="hidden sm:flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        QR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(table)}
                        className={table.is_active ? 'text-slate-700' : 'text-green-600 border-green-200'}
                        title={table.is_active ? 'Disable table' : 'Enable table'}
                      >
                        {table.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(table.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 sm:p-5 space-y-5 bg-slate-50/50">
                    {isLoadingDetails ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" />
                            Current Session
                          </h4>
                          <button
                            onClick={() => loadTableContext(table.id)}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            title="Refresh"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>

                        {!details?.session ? (
                          <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm font-medium">No active session</p>
                            <p className="text-xs text-slate-400 mt-1">Guests can scan the QR code to request activation</p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {details.session.host_name || 'Unknown Guest'}
                                  </span>
                                  <Badge className={`text-xs border-0 ${SESSION_STATUS_CONFIG[details.session.status]?.color || ''}`}>
                                    {SESSION_STATUS_CONFIG[details.session.status]?.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Requested at {new Date(details.session.created_at).toLocaleTimeString()}
                                  {details.session.activated_at && (
                                    <> · Activated at {new Date(details.session.activated_at).toLocaleTimeString()}</>
                                  )}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {details.session.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleActivateSession(table.id, details.session!.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                  >
                                    <Zap className="w-3.5 h-3.5" />
                                    Activate Table
                                  </Button>
                                )}
                                {details.session.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCloseSession(table.id, details.session!.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Close Session
                                  </Button>
                                )}
                              </div>
                            </div>

                            {details.session.status === 'pending' && (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-700 font-medium">
                                  Guest is waiting for you to activate this table. Click "Activate Table" to let them claim seats and order.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {details?.seats && details.seats.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Seats
                              <span className="text-xs font-normal text-slate-500">
                                ({details.seats.filter((s) => s.status === 'claimed').length}/{details.seats.length} claimed)
                              </span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {details.seats.map((seat) => (
                                <div
                                  key={seat.id}
                                  className={`p-3 rounded-xl border text-sm transition-colors ${
                                    seat.status === 'claimed'
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <Armchair className="w-3.5 h-3.5 text-slate-500" />
                                      <span className="font-semibold text-slate-700 text-xs">Seat {seat.seat_number}</span>
                                    </div>
                                    {seat.status === 'claimed' && (
                                      <button
                                        onClick={() => handleResetSeat(table.id, seat.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        title="Reset seat"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  {seat.status === 'claimed' ? (
                                    <p className="text-xs text-green-700 font-medium truncate">{seat.claimed_name}</p>
                                  ) : (
                                    <p className="text-xs text-slate-400">Open</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {details?.orders && details.orders.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4" />
                              Orders
                              <span className="text-xs font-normal text-slate-500">({details.orders.length})</span>
                            </h4>
                            <div className="space-y-2">
                              {details.orders.map((order) => (
                                <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-3">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-900">
                                          Seat {order.table_seats?.seat_number}{order.table_seats?.claimed_name ? ` — ${order.table_seats.claimed_name}` : ''}
                                        </span>
                                        <Badge className={`text-xs border-0 ${ORDER_STATUS_CONFIG[order.status]?.color || ''}`}>
                                          {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {new Date(order.created_at).toLocaleTimeString()} · ₹{Number(order.total_amount).toFixed(2)}
                                      </p>
                                    </div>
                                    <Select
                                      value={order.status}
                                      onValueChange={(val) => handleUpdateOrderStatus(table.id, order.id, val)}
                                    >
                                      <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(ORDER_STATUS_CONFIG).map(([val, cfg]) => (
                                          <SelectItem key={val} value={val} className="text-xs">
                                            {cfg.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {order.order_items && order.order_items.length > 0 && (
                                    <div className="text-xs text-slate-600 space-y-0.5 border-t border-slate-100 pt-2 mt-2">
                                      {order.order_items.map((item, i) => (
                                        <div key={i} className="flex justify-between">
                                          <span>
                                            {item.item_name}{item.variant_name ? ` (${item.variant_name})` : ''} ×{item.quantity}
                                          </span>
                                          <span className="font-medium">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 sm:hidden pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowQR(table)}
                            className="flex-1"
                          >
                            <QrCode className="w-4 h-4 mr-1.5" />
                            View QR
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Table Number</label>
              <Input
                type="number"
                placeholder="e.g. 1, 2, 3..."
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
                min="1"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTable} disabled={creating}>
              {creating ? 'Creating...' : 'Create Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {qrData ? `Table ${qrData.tableNumber} QR Code` : 'Generating QR...'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {qrLoading ? (
              <div className="flex justify-center py-8">
                <Skeleton className="w-56 h-56 rounded-xl" />
              </div>
            ) : qrData ? (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-md">
                    <img src={qrData.qrCode} alt="Table QR Code" className="w-48 h-48" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrData.table_url}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-mono focus:outline-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(qrData.table_url);
                      setUrlCopied(true);
                      toast.success('URL copied');
                      setTimeout(() => setUrlCopied(false), 2000);
                    }}
                  >
                    {urlCopied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrData.qrCode;
                    link.download = `table-${qrData.tableNumber}-qr.png`;
                    link.click();
                    toast.success('QR code downloaded');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
