import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppDispatch } from '@/app/hooks';
import { fetchAcceptanceTokens } from './checkout-slice';
import { AcceptanceTokens } from './checkout.types';

/**
 * Volatile checkout data. It lives only in this provider's memory: it is never
 * dispatched to the store and therefore never reaches localStorage.
 */
export interface CardInput {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvc: string;
}

export type TokensStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface CardSession {
  card: CardInput;
  setCardField: (field: keyof CardInput, value: string) => void;
  tokens: AcceptanceTokens | null;
  tokensStatus: TokensStatus;
  loadTokens: () => void;
}

const emptyCard: CardInput = {
  cardNumber: '',
  cardHolder: '',
  expiry: '',
  cvc: '',
};

const CardSessionContext = createContext<CardSession | null>(null);

export function CardSessionProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [card, setCard] = useState<CardInput>(emptyCard);
  const [tokens, setTokens] = useState<AcceptanceTokens | null>(null);
  const [tokensStatus, setTokensStatus] = useState<TokensStatus>('idle');
  const requested = useRef(false);

  const setCardField = useCallback(
    (field: keyof CardInput, value: string) =>
      setCard((current) => ({ ...current, [field]: value })),
    [],
  );

  const loadTokens = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setTokensStatus('loading');
    dispatch(fetchAcceptanceTokens())
      .unwrap()
      .then((value) => {
        setTokens(value);
        setTokensStatus('ready');
      })
      .catch(() => {
        requested.current = false;
        setTokensStatus('failed');
      });
  }, [dispatch]);

  const value = useMemo(
    () => ({ card, setCardField, tokens, tokensStatus, loadTokens }),
    [card, setCardField, tokens, tokensStatus, loadTokens],
  );

  return (
    <CardSessionContext.Provider value={value}>
      {children}
    </CardSessionContext.Provider>
  );
}

export function useCardSession(): CardSession {
  const context = useContext(CardSessionContext);
  if (!context) {
    throw new Error('useCardSession must be used inside CardSessionProvider');
  }
  return context;
}
