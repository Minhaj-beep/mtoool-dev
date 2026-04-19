import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table_token, guest_name, party_size } = body;

    if (!table_token || !guest_name) {
      return NextResponse.json({ error: 'table_token and guest_name are required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();

    const { data: table } = await supabase
      .from('restaurant_tables')
      .select('id, restaurant_id, is_active')
      .eq('table_token', table_token)
      .maybeSingle();

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (!table.is_active) {
      return NextResponse.json({ error: 'Table is not active' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('table_sessions')
      .select('id, status')
      .eq('table_id', table.id)
      .in('status', ['pending', 'active'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ session: existing, already_exists: true });
    }

    const join_code = Math.floor(1000 + Math.random() * 9000).toString();

    const { data: session, error } = await supabase
      .from('table_sessions')
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        status: 'pending',
        host_name: guest_name.trim(),
        join_code,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
