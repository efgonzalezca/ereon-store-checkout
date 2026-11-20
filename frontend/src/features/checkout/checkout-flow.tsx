import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { CardSessionProvider } from './state/card-session';
import { CheckoutModal } from './components/checkout-modal';
import { checkoutCancelled, selectCheckout } from './state/checkout-slice';

function CheckoutSteps() {
  const dispatch = useAppDispatch();
  const { step, productId } = useAppSelector(selectCheckout);
  const productsStatus = useAppSelector((state) => state.products.status);
  const product = useAppSelector((state) =>
    state.products.items.find((item) => item.id === productId),
  );
  const isOrphan = step !== 1 && productsStatus === 'succeeded' && !product;

  useEffect(() => {
    if (isOrphan) dispatch(checkoutCancelled());
  }, [dispatch, isOrphan]);

  if (step !== 2 || !product) return null;
  return <CheckoutModal product={product} />;
}

export function CheckoutFlow() {
  const { traceId } = useAppSelector(selectCheckout);
  return (
    <CardSessionProvider key={traceId ?? 'idle'}>
      <CheckoutSteps />
    </CardSessionProvider>
  );
}
