import { Selector, ActionCreatorWithPayload } from '@reduxjs/toolkit';

interface CompanyData {
  id?: string;
  name?: string;
  code?: string;
  currency?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  tax_percentage?: number;
  email?: string;
}

interface UserData {
  id: string;
  email: string;
  email_confirmed?: boolean;
  created_at?: string;
  last_sign_in?: string;
  first_name?: string | null;
  last_name?: string | null;
  role_id?: string | null;
  status?: string | null;
  is_active?: boolean;
  company_data?: CompanyData | null;
  company_id?: string | null;
  full_name?: string | null;
  role_name?: string | null;
}

export interface UserState {
  userData: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const setUser: ActionCreatorWithPayload<UserData, string>;
export const setLoading: ActionCreatorWithPayload<boolean, string>;
export const setError: ActionCreatorWithPayload<string, string>;
export const clearUser: ActionCreatorWithPayload<void, string>;

export const selectUser: Selector<{ user: UserState }, UserData | null>;
export const selectIsAuthenticated: Selector<{ user: UserState }, boolean>;
export const selectIsLoading: Selector<{ user: UserState }, boolean>;
export const selectError: Selector<{ user: UserState }, string | null>;

export default function userReducer(state: UserState | undefined, action: any): UserState;