// Formatting Utils
export const formatEuro = (number: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(number);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const getProgressVariant = (value: number) => {
  if (value >= 90) return "success"; 
  if (value >= 75) return "default"; 
  if (value >= 60) return "warning"; 
  return "error";                    
};