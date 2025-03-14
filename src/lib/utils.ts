import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'PHP') {
  // Handle Philippine Peso symbol and convert to PHP for formatting
  let currencyCode = currency;
  
  // Convert peso symbols to PHP code
  if (currency === 'â±' || currency === '₱') {
    currencyCode = 'PHP';
  }
  
  try {
    // Try to create formatter with the currency
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    });
    
    // For PHP, replace the currency symbol back to ₱
    let formatted = formatter.format(amount);
    if (currencyCode === 'PHP') {
      // Replace "PHP" with "₱" in the formatted string
      formatted = formatted.replace('PHP', '₱');
    }
    
    return formatted;
  } catch (error) {
    // Fallback to PHP if invalid currency code
    console.warn(`Invalid currency code: ${currency}, falling back to PHP`);
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    });
    return formatter.format(amount).replace('PHP', '₱');
  }
}

export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
} 