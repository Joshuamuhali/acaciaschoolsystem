import { useCurrency } from '@/contexts/CurrencyContext';

export function useCurrencyDisplay() {
  const { currency, loading } = useCurrency();

  const formatCurrency = (amount: number): string => {
    if (loading) {
      return `${amount.toLocaleString()}`;
    }
    
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatCurrencyCompact = (amount: number): string => {
    if (loading) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    
    if (amount >= 1000000) {
      return `${currency} ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currency} ${(amount / 1000).toFixed(0)}K`;
    }
    
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getCurrencyCode = (): string => {
    return loading ? 'ZMW' : currency;
  };

  return {
    currency,
    loading,
    formatCurrency,
    formatCurrencyCompact,
    getCurrencyCode
  };
}
