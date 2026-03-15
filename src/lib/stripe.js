export function startCheckout(userId, userEmail) {
  const payUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK
    + '?client_reference_id=' + encodeURIComponent(userId || '')
    + '&prefilled_email=' + encodeURIComponent(userEmail || '');
  window.location.href = payUrl;
}
