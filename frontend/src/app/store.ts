import { combineReducers, configureStore } from '@reduxjs/toolkit';
import checkoutReducer from '@/features/checkout/state/checkout-slice';
import {
  loadCheckoutState,
  saveCheckoutState,
  StorageLike,
} from '@/features/checkout/state/checkout-storage';
import productsReducer from '@/features/products/state/products-slice';
import { ThunkExtra } from './thunk-extra';

const rootReducer = combineReducers({
  products: productsReducer,
  checkout: checkoutReducer,
});

export function setupStore(
  extra: ThunkExtra,
  storage: StorageLike | null = null,
) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { checkout: loadCheckoutState(storage) },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });

  let previous = store.getState().checkout;
  store.subscribe(() => {
    const current = store.getState().checkout;
    if (current !== previous) {
      previous = current;
      saveCheckoutState(storage, current);
    }
  });

  return store;
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
