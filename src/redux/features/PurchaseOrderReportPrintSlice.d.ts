import { Selector, ActionCreatorWithPayload } from '@reduxjs/toolkit';

interface ReportConfigs {
  'purchase-order': Record<string, any>;
  sales: Record<string, any>;
  stock: Record<string, any>;
}

interface PrintState {
  reportData: any;
  selectedReportType: string;
  dateRange: [Date | null, Date | null];
  lastUpdated: string | null;
  statusMessages: Record<string, string>;
  reportConfigs: ReportConfigs;
}

export const setPrintData: ActionCreatorWithPayload<any, string>;
export const clearPrintData: ActionCreatorWithPayload<any, string>;
export const updateStatusMessages: ActionCreatorWithPayload<any, string>;
export const setReportConfigs: ActionCreatorWithPayload<any, string>;

export const selectPrintData: Selector<PrintState, any>;
export const selectSelectedReportType: Selector<PrintState, string>;
export const selectDateRange: Selector<PrintState, [Date | null, Date | null]>;
export const selectStatusMessages: Selector<PrintState, Record<string, string>>;
export const selectLastUpdated: Selector<PrintState, string | null>;
export const selectReportConfigs: Selector<PrintState, ReportConfigs>;