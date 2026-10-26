// Builds a upi:// payment link that opens GPay, PhonePe, Paytm etc. on Android.
export function upiLink(opts: { upiId: string; payee: string; amount: number; note: string }) {
  const params = [
    `pa=${opts.upiId.trim()}`,
    `pn=${encodeURIComponent(opts.payee)}`,
    `am=${opts.amount.toFixed(2)}`,
    'cu=INR',
    `tn=${encodeURIComponent(opts.note)}`,
  ]
  return `upi://pay?${params.join('&')}`
}
