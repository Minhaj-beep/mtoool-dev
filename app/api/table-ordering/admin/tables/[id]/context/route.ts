import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { data: table } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, is_active, table_token')
      .eq('id', params.id)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const { data: session } = await supabase
      .from('table_sessions')
      .select('id, status, host_name, join_code, activated_at, closed_at, created_at')
      .eq('table_id', table.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seats: unknown[] = [];
    let orders: unknown[] = [];

    if (session) {
      const [seatsRes, ordersRes] = await Promise.all([
        supabase
          .from('table_seats')
          .select('id, seat_number, status, claimed_name, device_id, claimed_at')
          .eq('session_id', session.id)
          .order('seat_number', { ascending: true }),
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at, updated_at, order_items(id, item_name, variant_name, quantity, unit_price, line_total), table_seats(seat_number, claimed_name)')
          .eq('table_session_id', session.id)
          .order('created_at', { ascending: false }),
      ]);

      seats = seatsRes.data || [];
      orders = ordersRes.data || [];
    }

    return NextResponse.json({ table, session: session || null, seats, orders });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
