import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThunkExtra } from '@/app/thunk-extra';
import { getErrorMessage } from '@/shared/api/http-client';
import {
  AcceptanceTokens,
  CheckoutSection,
  CheckoutState,
  CustomerForm,
  ShippingForm,
} from './checkout.types';
import { CardBrand } from '../form/validators/card.validators';

export const initialCheckoutState: CheckoutState = {
  step: 1,
  formSection: 1,
  productId: null,
  quantity: 1,
  traceId: null,
  reference: null,
  transactionId: null,
  paymentAttempted: false,
  customer: {
    documentType: 'CC',
    documentNumber: '',
    fullName: '',
    email: '',
    phone: '',
  },
  shipping: { address: '', city: '', region: '', postalCode: '' },
  installments: 1,
  cardLast4: null,
  cardBrand: null,
};

type StateWithCheckout = { checkout: CheckoutState };

export const fetchAcceptanceTokens = createAsyncThunk<
  AcceptanceTokens,
  void,
  { extra: ThunkExtra; state: StateWithCheckout; rejectValue: string }
>(
  'checkout/fetchAcceptanceTokens',
  async (_arg, { extra, getState, rejectWithValue }) => {
    try {
      const { data } = await extra.api.get<AcceptanceTokens>(
        '/api/payments/acceptance-tokens',
        { headers: { 'X-Trace-Id': getState().checkout.traceId } },
      );
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    checkoutStarted: {
      reducer: (
        _state,
        action: PayloadAction<{
          productId: string;
          quantity: number;
          traceId: string;
          reference: string;
        }>,
      ) => ({ ...initialCheckoutState, step: 2, ...action.payload }),
      prepare: (payload: { productId: string; quantity: number }) => ({
        payload: {
          ...payload,
          traceId: crypto.randomUUID(),
          reference: crypto.randomUUID(),
        },
      }),
    },
    customerChanged: (state, action: PayloadAction<Partial<CustomerForm>>) => {
      Object.assign(state.customer, action.payload);
    },
    shippingChanged: (state, action: PayloadAction<Partial<ShippingForm>>) => {
      Object.assign(state.shipping, action.payload);
    },
    sectionChanged: (state, action: PayloadAction<CheckoutSection>) => {
      state.formSection = action.payload;
    },
    installmentsChanged: (state, action: PayloadAction<number>) => {
      state.installments = action.payload;
    },
    detailsSubmitted: (
      state,
      action: PayloadAction<{ last4: string; brand: CardBrand }>,
    ) => {
      state.formSection = 4;
      state.cardLast4 = action.payload.last4;
      state.cardBrand = action.payload.brand;
    },
    transactionCreated: (state, action: PayloadAction<string>) => {
      state.transactionId = action.payload;
    },
    paymentStarted: (state) => {
      state.paymentAttempted = true;
    },
    paymentAborted: (state, action: PayloadAction<{ toCard: boolean }>) => {
      state.paymentAttempted = false;
      if (action.payload.toCard) state.formSection = 3;
    },
    attemptClosed: (state, action: PayloadAction<{ reference: string }>) => {
      state.reference = action.payload.reference;
      state.transactionId = null;
      state.paymentAttempted = false;
      state.formSection = 3;
    },
    checkoutCancelled: () => initialCheckoutState,
  },
});

export const {
  checkoutStarted,
  customerChanged,
  shippingChanged,
  installmentsChanged,
  sectionChanged,
  detailsSubmitted,
  transactionCreated,
  paymentStarted,
  paymentAborted,
  attemptClosed,
  checkoutCancelled,
} = checkoutSlice.actions;
export default checkoutSlice.reducer;

export const selectCheckout = (state: StateWithCheckout) => state.checkout;
