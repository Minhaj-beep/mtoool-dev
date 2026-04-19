import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

const DEFAULT_SEAT_COUNT = 4;

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
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const serviceSupabase = getSupabaseServiceRole();

    const { data: session } = await serviceSupabase
      .from('table_sessions')
      .select('*, restaurant_tables(*)')
      .eq('id', session_id)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'pending') {
      return NextResponse.json({ error: 'Session is not pending' }, { status: 400 });
    }

    const { data: updatedSession, error: updateError } = await serviceSupabase
      .from('table_sessions')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', session_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { data: existingSeats } = await serviceSupabase
      .from('table_seats')
      .select('id')
      .eq('session_id', session_id);

    let seats = existingSeats || [];

    if (seats.length === 0) {
      const seatRows = Array.from({ length: DEFAULT_SEAT_COUNT }, (_, i) => ({
        session_id,
        seat_number: i + 1,
        status: 'open',
      }));

      const { data: newSeats, error: seatsError } = await serviceSupabase
        .from('table_seats')
        .insert(seatRows)
        .select();

      if (seatsError) {
        return NextResponse.json({ error: seatsError.message }, { status: 400 });
      }

      seats = newSeats || [];
    }

    return NextResponse.json({ session: updatedSession, seats });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
