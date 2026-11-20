import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ThunkExtra } from '@/app/thunk-extra';
import {
  attemptClosed,
  checkoutCancelled,
  checkoutStarted,
  paymentAborted,
  paymentStarted,
  transactionCreated,
} from './checkout-slice';
import { CheckoutState } from './checkout.types';
import {
  classifyError,
  RESULT_ERRORS,
  RETRYABLE_ERRORS,
} from './payment-errors';
import {
  Amounts,
  ApiErrorKind,
  PaymentState,
  SubmitPaymentArgs,
  TransactionResult,
} from './payment.types';

const PAY_TIMEOUT_MS = 35000;

const initialPaymentState: PaymentState = {
  quote: { status: 'idle', amounts: null, error: null },
  submission: { status: 'idle', result: null, error: null },
};

type ThunkConfig = {
  extra: ThunkExtra;
  state: { checkout: CheckoutState; payment: PaymentState };
  rejectValue: ApiErrorKind;
};

export const fetchQuote = createAsyncThunk<
  Amounts,
  { productId: string; quantity: number },
  ThunkConfig
>(
  'payment/fetchQuote',
  async ({ productId, quantity }, { extra, getState, rejectWithValue }) => {
    try {
      const { data } = await extra.api.get<Amounts>('/api/quote', {
        params: { productId, quantity },
        headers: { 'X-Trace-Id': getState().checkout.traceId },
      });
      return data;
    } catch (error) {
      return rejectWithValue(classifyError(error));
    }
  },
  {
    condition: (_arg, { getState }) =>
      getState().payment.quote.status !== 'loading',
  },
);

export const submitPayment = createAsyncThunk<
  TransactionResult,
  SubmitPaymentArgs,
  ThunkConfig
>(
  'payment/submit',
  async (args, { extra, getState, dispatch, rejectWithValue }) => {
    const checkout = getState().checkout;
    const headers = { 'X-Trace-Id': checkout.traceId };

    try {
      let transactionId = checkout.transactionId;
      if (!transactionId) {
        const { data: created } = await extra.api.post<TransactionResult>(
          '/api/transactions',
          {
            productId: checkout.productId,
            quantity: checkout.quantity,
            installments: checkout.installments,
            reference: checkout.reference,
            customer: checkout.customer,
          },
          { headers },
        );
        transactionId = created.id;
        dispatch(transactionCreated(transactionId));
      }

      dispatch(paymentStarted());
      const { data } = await extra.api.post<TransactionResult>(
        `/api/transactions/${transactionId}/pay`,
        {
          card: args.card,
          shipping: checkout.shipping,
          acceptanceToken: args.acceptanceToken,
          personalAuthToken: args.personalAuthToken,
        },
        { headers, timeout: PAY_TIMEOUT_MS },
      );

      return data;
    } catch (error) {
      const kind = classifyError(error);
      if (!RESULT_ERRORS.includes(kind)) {
        dispatch(paymentAborted({ toCard: RETRYABLE_ERRORS.includes(kind) }));
      }
      return rejectWithValue(kind);
    }
  },
  {
    condition: (_arg, { getState }) =>
      getState().payment.submission.status !== 'submitting',
  },
);

export const checkStatus = createAsyncThunk<
  TransactionResult,
  void,
  ThunkConfig
>(
  'payment/checkStatus',
  async (_arg, { extra, getState, rejectWithValue }) => {
    const { transactionId, traceId } = getState().checkout;
    try {
      const { data } = await extra.api.get<TransactionResult>(
        `/api/transactions/${transactionId}`,
        { headers: { 'X-Trace-Id': traceId } },
      );
      return data;
    } catch (error) {
      return rejectWithValue(classifyError(error));
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { checkout, payment } = getState();
      return (
        checkout.transactionId !== null &&
        payment.submission.status !== 'submitting' &&
        payment.submission.status !== 'checking'
      );
    },
  },
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: initialPaymentState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkoutStarted, () => initialPaymentState)
      .addCase(checkoutCancelled, () => initialPaymentState)
      .addCase(attemptClosed, (state) => {
        state.submission = initialPaymentState.submission;
      })
      .addCase(paymentAborted, (state) => {
        state.submission = initialPaymentState.submission;
      })
      .addCase(fetchQuote.pending, (state) => {
        state.quote = { status: 'loading', amounts: null, error: null };
      })
      .addCase(fetchQuote.fulfilled, (state, action) => {
        state.quote = {
          status: 'succeeded',
          amounts: action.payload,
          error: null,
        };
      })
      .addCase(fetchQuote.rejected, (state, action) => {
        state.quote = {
          status: 'failed',
          amounts: null,
          error: action.payload ?? 'unexpected',
        };
      })
      .addCase(submitPayment.pending, (state) => {
        state.submission = { status: 'submitting', result: null, error: null };
      })
      .addCase(submitPayment.fulfilled, (state, action) => {
        state.submission = {
          status: 'done',
          result: action.payload,
          error: null,
        };
      })
      .addCase(submitPayment.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.submission = {
          status: 'failed',
          result: null,
          error: action.payload ?? 'unexpected',
        };
      })
      .addCase(checkStatus.pending, (state) => {
        state.submission.status = 'checking';
      })
      .addCase(checkStatus.fulfilled, (state, action) => {
        state.submission = {
          status: 'done',
          result: action.payload,
          error: null,
        };
      })
      .addCase(checkStatus.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.submission.status = 'failed';
        state.submission.error ??= action.payload ?? 'unexpected';
      });
  },
});

export default paymentSlice.reducer;

type StateWithPayment = { payment: PaymentState };

export const selectQuote = (state: StateWithPayment) => state.payment.quote;
export const selectSubmission = (state: StateWithPayment) =>
  state.payment.submission;
