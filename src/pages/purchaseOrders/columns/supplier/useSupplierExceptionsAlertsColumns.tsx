import React from 'react';
import type { GridColDef } from '@mui/x-data-grid';

type UseSupplierExceptionsAlertsColumnsParams = {
  supplierActionRequiredColumns: GridColDef[];
  renderNeedByDateCell: (value: unknown) => React.ReactNode;
};

export const useSupplierExceptionsAlertsColumns = ({
  supplierActionRequiredColumns,
  renderNeedByDateCell,
}: UseSupplierExceptionsAlertsColumnsParams): GridColDef[] =>
  React.useMemo(
    () =>
      supplierActionRequiredColumns.map((column) => {
        if (column.field === 'required_in_house_date') {
          return {
            ...column,
            headerName: 'Need by Date',
            renderCell: (params) => renderNeedByDateCell(params.value),
          };
        }

        if (column.field === 'updated_delivery_date') {
          return {
            ...column,
            headerName: 'Revised Date',
            renderCell: (params) => renderNeedByDateCell(params.value),
          };
        }

        return column;
      }),
    [supplierActionRequiredColumns, renderNeedByDateCell]
  );