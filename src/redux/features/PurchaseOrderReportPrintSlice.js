// store/slices/printSlice.js
import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  reportData: null,
  selectedReportType: '',
  dateRange: [null, null],
  lastUpdated: null,
  statusMessages: {},
  reportConfigs: {
    'purchase-order': {},
    'sales': {},
    'stock': {},
  },
};

const printSlice = createSlice({
  name: 'print',
  initialState,
  reducers: {
    setPrintData: (state, action) => {
      state.reportData = action.payload.reportData;
      state.selectedReportType = action.payload.selectedReportType;
      state.dateRange = action.payload.dateRange;
      state.statusMessages = action.payload.statusMessages;
      state.lastUpdated = new Date().toISOString();
    },
    clearPrintData: (state) => {
      state.reportData = null;
      state.selectedReportType = '';
      state.dateRange = [null, null];
      state.lastUpdated = null;
      state.statusMessages = {};
    },
    updateStatusMessages: (state, action) => {
      state.statusMessages = action.payload;
    },
    setReportConfigs: (state, action) => {
      state.reportConfigs = action.payload;
    },
  },
});

export const { setPrintData, clearPrintData, updateStatusMessages, setReportConfigs } = printSlice.actions;
export default printSlice.reducer;

// Memoized Selectors
const selectPrintState = (state) => state.print;

export const selectPrintData = createSelector(selectPrintState, (print) => print.reportData);
export const selectSelectedReportType = createSelector(selectPrintState, (print) => print.selectedReportType);
export const selectDateRange = createSelector(selectPrintState, (print) => print.dateRange);
export const selectStatusMessages = createSelector(selectPrintState, (print) => print.statusMessages);
export const selectLastUpdated = createSelector(selectPrintState, (print) => print.lastUpdated);
export const selectReportConfigs = createSelector(selectPrintState, (print) => print.reportConfigs);

