import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { getSupabaseServer } from '@/lib/supabase/server';

type CartItem = {
  dish_id: string;
  variant_id?: string | null;
  quantity: number;
  notes?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, seat_id, device_id, items } = body as {
      session_id: string;
      seat_id: string;
      device_id: string;
      items: CartItem[];
    };

    if (!session_id || !seat_id || !device_id || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: session } = await supabase
      .from('table_sessions')
      .select('id, status, restaurant_id, table_id')
      .eq('id', session_id)
      .maybeSingle();

    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    const { data: seat } = await supabase
      .from('table_seats')
      .select('id, session_id, device_id, status')
      .eq('id', seat_id)
      .eq('session_id', session_id)
      .maybeSingle();

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 });
    }

    if (seat.device_id !== device_id) {
      return NextResponse.json({ error: 'Device does not own this seat' }, { status: 403 });
    }

    const dishIdSet: { [k: string]: true } = {};
    items.forEach((i) => { dishIdSet[i.dish_id] = true; });
    const dishIds = Object.keys(dishIdSet);

    const variantIdSet: { [k: string]: true } = {};
    items.filter((i) => i.variant_id).forEach((i) => { variantIdSet[i.variant_id as string] = true; });
    const variantIds = Object.keys(variantIdSet);

    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, name, price')
      .in('id', dishIds);

    const dishMap = new Map((dishes || []).map((d) => [d.id, d]));

    let variantMap = new Map<string, { id: string; name: string; price: number }>();
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from('dish_variants')
        .select('id, dish_id, name, price')
        .in('id', variantIds);
      variantMap = new Map((variants || []).map((v) => [v.id, v]));
    }

    let totalAmount = 0;
    const orderItemRows: Array<{
      dish_id: string;
      variant_id: string | null;
      item_name: string;
      variant_name: string | null;
      quantity: number;
      unit_price: number;
      line_total: number;
      notes: string | null;
      order_id?: string;
    }> = [];

    for (const item of items) {
      const dish = dishMap.get(item.dish_id);
      if (!dish) {
        return NextResponse.json({ error: `Dish not found: ${item.dish_id}` }, { status: 400 });
      }

      let unitPrice = Number(dish.price);
      let variantName: string | null = null;

      if (item.variant_id) {
        const variant = variantMap.get(item.variant_id);
        if (!variant) {
          return NextResponse.json({ error: `Variant not found: ${item.variant_id}` }, { status: 400 });
        }
        unitPrice = Number(variant.price);
        variantName = variant.name;
      }

      const qty = Math.max(1, Math.floor(Number(item.quantity)));
      const lineTotal = unitPrice * qty;
      totalAmount += lineTotal;

      orderItemRows.push({
        dish_id: item.dish_id,
        variant_id: item.variant_id || null,
        item_name: dish.name,
        variant_name: variantName,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal,
        notes: item.notes || null,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: session.restaurant_id,
        table_id: session.table_id,
        table_session_id: session_id,
        seat_id,
        status: 'placed',
        total_amount: totalAmount,
      })
      .select('id, status, total_amount, created_at')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Failed to create order' }, { status: 400 });
    }

    const itemsWithOrderId = orderItemRows.map((row) => ({ ...row, order_id: order.id }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    return NextResponse.json({ order: { ...order, items: itemsWithOrderId } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    let query = supabase
      .from('orders')
      .select('*, order_items(*), table_seats(seat_number, claimed_name), restaurant_tables(table_number)')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (sessionId) {
      query = query.eq('table_session_id', sessionId);
    }

    const { data: orders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
