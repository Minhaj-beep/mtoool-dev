import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

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

    const serviceSupabase = getSupabaseServiceRole();

    const { data: table } = await serviceSupabase
      .from('restaurant_tables')
      .select('*')
      .eq('id', params.id)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const { data: session } = await serviceSupabase
      .from('table_sessions')
      .select('*')
      .eq('table_id', table.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seats: unknown[] = [];
    let orders: unknown[] = [];

    if (session) {
      const [seatsRes, ordersRes] = await Promise.all([
        serviceSupabase
          .from('table_seats')
          .select('*')
          .eq('session_id', session.id)
          .order('seat_number', { ascending: true }),
        serviceSupabase
          .from('orders')
          .select('*, order_items(*), table_seats(seat_number, claimed_name), restaurant_tables(table_number)')
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
