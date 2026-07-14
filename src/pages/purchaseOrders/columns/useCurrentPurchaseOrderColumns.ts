import React from 'react';
import type { GridColDef } from '@mui/x-data-grid';

type UseCurrentPurchaseOrderColumnsParams = {
  isSupplierCollaboration: boolean;
  selectedTab: number;
  gridColumns: GridColDef[];
  poToReviewColumns: GridColDef[];
  mrpExceptionColumns: GridColDef[];
  supplierActionRequiredColumns: GridColDef[];
  supplierExceptionsAlertsColumns: GridColDef[];
};

export const useCurrentPurchaseOrderColumns = ({
  isSupplierCollaboration,
  selectedTab,
  gridColumns,
  poToReviewColumns,
  mrpExceptionColumns,
  supplierActionRequiredColumns,
  supplierExceptionsAlertsColumns,
}: UseCurrentPurchaseOrderColumnsParams): GridColDef[] =>
  React.useMemo(() => {
    if (isSupplierCollaboration) {
      switch (selectedTab) {
        case 2:
          return supplierActionRequiredColumns;

        case 3:
          return supplierExceptionsAlertsColumns;

        default:
          return gridColumns;
      }
    }

    switch (selectedTab) {
      case 2:
        return poToReviewColumns;

      case 3:
        return mrpExceptionColumns;

      default:
        return gridColumns;
    }
  }, [
    isSupplierCollaboration,
    selectedTab,
    gridColumns,
    poToReviewColumns,
    mrpExceptionColumns,
    supplierActionRequiredColumns,
    supplierExceptionsAlertsColumns,
  ]);