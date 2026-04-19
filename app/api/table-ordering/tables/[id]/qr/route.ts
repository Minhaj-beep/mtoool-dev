import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { generateQRCode } from '@/lib/qr/qr-generator';

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
      .select('id, slug')
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

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const table_url = `${appUrl}/menu/${restaurant.slug}?table=${table.table_token}`;
    const qrCode = await generateQRCode(table_url);

    return NextResponse.json({ qrCode, table_url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
