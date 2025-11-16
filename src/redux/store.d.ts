import { Store } from '@reduxjs/toolkit';
import { Persistor } from 'redux-persist';
import { PrintState } from './features/PurchaseOrderReportPrintSlice';
import { UserState } from './features/userSlice';

export interface RootState {
  print: PrintState;
  user: UserState;
}

export type AppDispatch = typeof import('./store.js').store.dispatch;

export const store: Store<RootState>;
export const persistor: Persistor;