import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { seat_id } = body;

    if (!seat_id) {
      return NextResponse.json({ error: 'seat_id is required' }, { status: 400 });
    }

    const serviceSupabase = getSupabaseServiceRole();

    const { data: seat } = await serviceSupabase
      .from('table_seats')
      .select('id, session_id, table_sessions(restaurant_id)')
      .eq('id', seat_id)
      .maybeSingle();

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 });
    }

    const sessionRestaurantId = (seat as any).table_sessions?.restaurant_id;
    if (sessionRestaurantId !== restaurant.id) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 });
    }

    const { data: updatedSeat, error } = await serviceSupabase
      .from('table_seats')
      .update({
        status: 'open',
        claimed_name: null,
        device_id: null,
        claimed_at: null,
      })
      .eq('id', seat_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ seat: updatedSeat });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
