import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const tableToken = searchParams.get('table');

    if (!slug || !tableToken) {
      return NextResponse.json({ error: 'Missing slug or table token' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, slug, theme_color, subscription_status, is_on_hold')
      .eq('slug', slug)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { data: table } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, is_active, restaurant_id')
      .eq('restaurant_id', restaurant.id)
      .eq('table_token', tableToken)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (!table.is_active) {
      return NextResponse.json({ error: 'Table is not active' }, { status: 400 });
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
    if (session) {
      const { data: seatsData } = await supabase
        .from('table_seats')
        .select('id, seat_number, status, claimed_name, device_id, claimed_at')
        .eq('session_id', session.id)
        .order('seat_number', { ascending: true });

      seats = seatsData || [];
    }

    return NextResponse.json({ restaurant, table, session: session || null, seats });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
