/** Which of the four main links a customer path belongs to, or `undefined` (notifications, support). */
export function currentCustomerTab(pathname: string): string | undefined {
  if (pathname === '/home') return '/home'
  if (pathname === '/order' || pathname.startsWith('/order/')) return '/order'
  if (pathname === '/orders' || pathname.startsWith('/orders/')) return '/orders'
  if (['/profile', '/settings', '/menu', '/addresses', '/points'].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return '/profile'
  return undefined
}
