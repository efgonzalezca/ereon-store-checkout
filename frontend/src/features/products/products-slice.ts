import {
  createAsyncThunk,
  createSelector,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import { ThunkExtra } from '@/app/thunk-extra';
import { getErrorMessage } from '@/shared/api/http-client';
import { Product } from './product.types';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface ProductsState {
  items: Product[];
  status: RequestStatus;
  error: string | null;
  selectedProductId: string | null;
}

const initialState: ProductsState = {
  items: [],
  status: 'idle',
  error: null,
  selectedProductId: null,
};

export const fetchProducts = createAsyncThunk<
  Product[],
  void,
  { extra: ThunkExtra; state: { products: ProductsState }; rejectValue: string }
>(
  'products/fetch',
  async (_arg, { extra, rejectWithValue }) => {
    try {
      const { data } = await extra.api.get<Product[]>('/api/products');
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_arg, { getState }) => getState().products.status !== 'loading',
  },
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    productSelected: (state, action: PayloadAction<string>) => {
      state.selectedProductId = action.payload;
    },
    selectionCleared: (state) => {
      state.selectedProductId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unexpected error';
      });
  },
});

export const { productSelected, selectionCleared } = productsSlice.actions;
export default productsSlice.reducer;

type StateWithProducts = { products: ProductsState };

export const selectProducts = (state: StateWithProducts) =>
  state.products.items;
export const selectProductsStatus = (state: StateWithProducts) =>
  state.products.status;
export const selectProductsError = (state: StateWithProducts) =>
  state.products.error;
export const selectSelectedProduct = createSelector(
  [
    selectProducts,
    (state: StateWithProducts) => state.products.selectedProductId,
  ],
  (items, selectedId) =>
    items.find((product) => product.id === selectedId) ?? null,
);
