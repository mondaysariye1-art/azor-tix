export const PLATFORM_COMMISSION_PERCENT = 5
export const CUSTOMER_SERVICE_FEE_PERCENT = 2

export function calculateOrderAmounts(subtotal: number, discountAmount = 0) {
  const discountedSubtotal = Math.max(0, subtotal - discountAmount)
  const serviceFeeAmount = Math.round(discountedSubtotal * (CUSTOMER_SERVICE_FEE_PERCENT / 100))
  const commissionAmount = Math.round(discountedSubtotal * (PLATFORM_COMMISSION_PERCENT / 100))
  return {
    subtotal: discountedSubtotal,
    serviceFeePercent: CUSTOMER_SERVICE_FEE_PERCENT,
    serviceFeeAmount,
    commissionPercent: PLATFORM_COMMISSION_PERCENT,
    commissionAmount,
    organizerEarnings: discountedSubtotal - commissionAmount,
    total: discountedSubtotal + serviceFeeAmount,
  }
}
