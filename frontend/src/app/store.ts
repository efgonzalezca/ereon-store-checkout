import { combineReducers, configureStore } from '@reduxjs/toolkit';
import productsReducer from '@/features/products/products-slice';
import { ThunkExtra } from './thunk-extra';

const rootReducer = combineReducers({ products: productsReducer });

export function setupStore(extra: ThunkExtra) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
