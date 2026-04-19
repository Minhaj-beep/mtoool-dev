import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, seat_id, device_id, claimed_name } = body;

    if (!session_id || !seat_id || !device_id || !claimed_name) {
      return NextResponse.json(
        { error: 'session_id, seat_id, device_id, and claimed_name are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRole();

    const { data: session } = await supabase
      .from('table_sessions')
      .select('id, status')
      .eq('id', session_id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    const { data: alreadyClaimed } = await supabase
      .from('table_seats')
      .select('id')
      .eq('session_id', session_id)
      .eq('device_id', device_id)
      .maybeSingle();

    if (alreadyClaimed) {
      return NextResponse.json({ error: 'This device has already claimed a seat in this session' }, { status: 409 });
    }

    const { data: seat } = await supabase
      .from('table_seats')
      .select('*')
      .eq('id', seat_id)
      .eq('session_id', session_id)
      .maybeSingle();

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found in this session' }, { status: 404 });
    }

    if (seat.status !== 'open') {
      return NextResponse.json({ error: 'Seat is already claimed' }, { status: 409 });
    }

    const { data: updatedSeat, error } = await supabase
      .from('table_seats')
      .update({
        status: 'claimed',
        claimed_name: claimed_name.trim(),
        device_id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', seat_id)
      .eq('status', 'open')
      .select()
      .single();

    if (error || !updatedSeat) {
      return NextResponse.json({ error: 'Seat was just taken. Please choose another.' }, { status: 409 });
    }

    return NextResponse.json({ seat: updatedSeat });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
