import { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';

export const useAppDispatch: () => AppDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState>;