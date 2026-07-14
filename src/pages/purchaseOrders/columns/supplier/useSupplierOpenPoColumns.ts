import React from 'react';
import type { GridColDef } from '@mui/x-data-grid';

type UseSupplierOpenPoColumnsParams = {
  columns: GridColDef[];
};

export const useSupplierOpenPoColumns = ({
  columns,
}: UseSupplierOpenPoColumnsParams): GridColDef[] =>
  React.useMemo(() => {
    const map = new Map<string, GridColDef>(columns.map((col) => [col.field, col]));

    const orderedFields = [
      'pin',
      'po_number',
      'supplier_name',
      'total_value',
      'line_items',
      'revision_changes',
      'buyer_name',
      'buyer_email',
      'buyer_phone',
      'site',
      'status',
    ];

    return orderedFields
      .map((field): GridColDef | null => {
        const column = map.get(field);

        if (!column) {
          return null;
        }

        if (field === 'supplier_name') {
          return {
            ...column,
            headerName: 'Supplier Name',
            sortable: true,
          };
        }

        if (field === 'revision_changes') {
          return {
            ...column,
            headerName: 'Rev',
            width: 90,
            sortable: true,
          };
        }

        if (field === 'buyer_name') {
          return {
            ...column,
            sortable: true,
          };
        }

        if (field === 'buyer_email') {
          return {
            ...column,
            headerName: 'Buyer Email Id',
            sortable: true,
          };
        }

        if (field === 'buyer_phone') {
          return {
            ...column,
            sortable: true,
          };
        }

        return column;
      })
      .filter((column): column is GridColDef => column !== null);
  }, [columns]);