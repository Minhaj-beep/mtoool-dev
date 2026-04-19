export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'mtoool_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getCartKey(restaurantId: string, tableToken: string): string {
  return `mtoool_cart_${restaurantId}_${tableToken}`;
}
