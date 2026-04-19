export type TableContext = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    theme_color: string;
  };
  table: {
    id: string;
    table_number: number;
    table_token: string;
    is_active: boolean;
  };
  session: TableSession | null;
  seats: TableSeat[];
};

export type TableSession = {
  id: string;
  status: 'pending' | 'active' | 'closed';
  host_name: string | null;
  join_code: string | null;
  activated_at: string | null;
  closed_at: string | null;
};

export type TableSeat = {
  id: string;
  seat_number: number;
  status: 'open' | 'claimed';
  claimed_name: string | null;
  device_id: string | null;
  claimed_at: string | null;
};

export type CartItem = {
  dish_id: string;
  dish_name: string;
  variant_id: string | null;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  notes?: string;
};
