import { createContext, useContext, useState, ReactNode } from 'react';

interface CurrencyContextType {
  currency: string;
  loading: boolean;
  updateCurrency: (newCurrency: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  // Simplified: use ZMW as default currency without database operations
  const [currencyState, setCurrencyState] = useState<string>('ZMW');
  const [loading] = useState<boolean>(false);

  const updateCurrency = async (newCurrencyValue: string) => {
    setCurrencyState(newCurrencyValue);
  };

  return (
    <CurrencyContext.Provider value={{ currency: currencyState, loading, updateCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}
