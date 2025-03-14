/**
 * Calculate PSE transaction fees and taxes
 * Reference: https://www.pse.com.ph/investing-at-pse/
 */
export function calculateTransactionFees(
  grossAmount: number, 
  isBuy: boolean = true
): { 
  commission: number;
  vat: number;
  pseTransFee: number;
  secFee: number;
  sccp: number;
  salesTax: number;
  totalFees: number;
  netAmount: number;
} {
  // Commission is 0.25% of gross amount (minimum of PHP 20)
  const commission = Math.max(grossAmount * 0.0025, 20);
  
  // VAT is 12% of commission
  const vat = commission * 0.12;
  
  // PSE Trans Fee is 0.005% of gross amount
  const pseTransFee = grossAmount * 0.00005;
  
  // SEC Fee is 0.01% of gross amount
  const secFee = grossAmount * 0.0001;
  
  // SCCP Fee is 0.01% of gross amount
  const sccp = grossAmount * 0.0001;
  
  // Sales Tax (only for selling transactions) is 0.6% of gross amount
  const salesTax = isBuy ? 0 : grossAmount * 0.006;
  
  // Total fees
  const totalFees = commission + vat + pseTransFee + secFee + sccp + salesTax;
  
  // Net amount (add fees for buy, subtract for sell)
  const netAmount = isBuy ? grossAmount + totalFees : grossAmount - totalFees;
  
  return {
    commission,
    vat,
    pseTransFee,
    secFee,
    sccp,
    salesTax,
    totalFees,
    netAmount
  };
}

/**
 * Calculate P&L with all fees considered
 */
export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  side: 'long' | 'short'
): number {
  const entryGrossAmount = entryPrice * quantity;
  const exitGrossAmount = exitPrice * quantity;
  
  const entryFees = calculateTransactionFees(entryGrossAmount, true).totalFees;
  const exitFees = calculateTransactionFees(exitGrossAmount, false).totalFees;
  
  if (side === 'long') {
    return exitGrossAmount - entryGrossAmount - entryFees - exitFees;
  } else {
    return entryGrossAmount - exitGrossAmount - entryFees - exitFees;
  }
} 