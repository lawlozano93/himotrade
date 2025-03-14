/**
 * Calculate the board lot size based on PSE rules
 * Reference: https://www.pse.com.ph/investing-at-pse/
 */
export function calculateBoardLot(price: number): number {
  if (price <= 0.01) return 1000000;
  if (price <= 0.05) return 200000;
  if (price <= 0.25) return 100000;
  if (price <= 0.50) return 10000;
  if (price <= 5.00) return 1000;
  if (price <= 10.00) return 100;
  if (price <= 50.00) return 10;
  if (price <= 100.00) return 10;
  if (price <= 200.00) return 5;
  if (price <= 500.00) return 5;
  if (price <= 1000.00) return 5;
  if (price <= 2000.00) return 5;
  return 5; // Default for prices above 2000
}

/**
 * Calculate the minimum investment amount based on board lot
 */
export function calculateMinimumInvestment(price: number): number {
  const boardLot = calculateBoardLot(price);
  return price * boardLot;
}

/**
 * Round quantity to nearest valid board lot
 */
export function roundToValidLot(price: number, quantity: number): number {
  const boardLot = calculateBoardLot(price);
  return Math.ceil(quantity / boardLot) * boardLot;
} 