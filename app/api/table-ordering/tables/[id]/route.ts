import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

export async function PATCH(
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

    const { data: existing } = await serviceSupabase
      .from('restaurant_tables')
      .select('id, restaurant_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!existing || existing.restaurant_id !== restaurant.id) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const body = await request.json();
    const { table_number, is_active } = body;

    const updates: Record<string, unknown> = {};
    if (table_number !== undefined) updates.table_number = Number(table_number);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data: table, error } = await serviceSupabase
      .from('restaurant_tables')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ table });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
