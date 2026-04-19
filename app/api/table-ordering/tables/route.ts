import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { generateQRCode } from '@/lib/qr/qr-generator';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { data: tables, error } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, table_token, is_active, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('table_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const tablesWithUrl = (tables || []).map((t) => ({
      ...t,
      table_url: `${appUrl}/menu/${restaurant.slug}?table=${t.table_token}`,
    }));

    return NextResponse.json({ tables: tablesWithUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { table_number } = body;

    if (!table_number) {
      return NextResponse.json({ error: 'table_number is required' }, { status: 400 });
    }

    const table_token = crypto.randomBytes(16).toString('hex');

    const { data: table, error } = await supabase
      .from('restaurant_tables')
      .insert({
        restaurant_id: restaurant.id,
        table_number: Number(table_number),
        table_token,
        is_active: true,
      })
      .select('id, table_number, table_token, is_active, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const table_url = `${appUrl}/menu/${restaurant.slug}?table=${table_token}`;
    const qrCode = await generateQRCode(table_url);

    return NextResponse.json({ table: { ...table, table_url, qrCode } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
