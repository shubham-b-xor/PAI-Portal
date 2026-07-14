import React from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

import type { PurchaseOrderStatus } from '@/models';
import { formatDateSafe } from '../../utils/formatters';

type StatusColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';

type UseOpenPoColumnsParams = {
  theme: Theme;
  pinnedPOIds: string[];
  togglePin: (poId: string) => void;
  statusColors: Record<PurchaseOrderStatus, StatusColor>;
  userRole?: string;
};

export const useOpenPoColumns = ({
  theme,
  pinnedPOIds,
  togglePin,
  statusColors,
  userRole,
}: UseOpenPoColumnsParams): GridColDef[] =>
  React.useMemo(
    () => [
      {
        field: 'pin',
        headerName: 'Pin',
        width: 40,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title={pinnedPOIds.includes(params.row.id) ? 'Unpin' : 'Pin'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(params.row.id);
              }}
              sx={{
                color: pinnedPOIds.includes(params.row.id) ? 'primary.main' : 'action.disabled',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {pinnedPOIds.includes(params.row.id) ? (
                <PushPinIcon sx={{ fontSize: '1.25rem' }} />
              ) : (
                <PushPinOutlinedIcon sx={{ fontSize: '1.25rem' }} />
              )}
            </IconButton>
          </Tooltip>
        ),
      },
      {
        field: 'po_number',
        headerName: 'PO Number',
        minWidth: 100,
        flex: 1,
        renderCell: (params) => (
          <Typography
            fontWeight="bold"
            height="100%"
            alignContent="center"
            fontSize="0.8rem"
            color={theme.palette.primary.light}
          >
            {params.value}
          </Typography>
        ),
        sx: {
          '&:hover': {
            color: theme.palette.primary.main,
            borderRadius: 0,
          },
        },
      },
      {
        field: 'revision_changes',
        headerName: 'Revision Changes',
        minWidth: 80,
        flex: 1,
        renderHeader: () => (
          <Typography
            variant="body2"
            textAlign="center"
            sx={{
              whiteSpace: 'normal',
              lineHeight: 1.2,
              fontWeight: 600,
            }}
          >
            Revision Changes
          </Typography>
        ),
      },
      {
        field: 'line_items',
        headerName: 'Line Items',
        minWidth: 60,
        flex: 1,
        renderCell: (params) => params.value.length,
        renderHeader: () => (
          <Typography
            variant="body2"
            textAlign="center"
            sx={{
              whiteSpace: 'normal',
              lineHeight: 1.2,
              fontWeight: 600,
            }}
          >
            Line Items
          </Typography>
        ),
      },
      {
        field: 'supplier_id',
        headerName: 'Supplier Number',
        minWidth: 140,
        flex: 1,
      },
      ...(userRole !== 'SUPPLIER'
        ? [
            {
              field: 'supplier_name',
              headerName: 'Supplier',
              minWidth: 200,
              flex: 1,
            },
          ]
        : []),
      {
        field: 'total_value',
        headerName: 'Total Value',
        minWidth: 110,
        flex: 1,
        renderCell: (params) => (
          <Typography height="100%" alignContent="center" fontSize="0.8rem">
            {params.row.currency} {params.value.toLocaleString()}
          </Typography>
        ),
      },
      {
        field: 'delivery_date',
        headerName: 'Need by Date',
        minWidth: 120,
        flex: 1,
        renderCell: (params) => formatDateSafe(params.value),
      },
      {
        field: 'site',
        headerName: 'Flowserve site',
        minWidth: 120,
        flex: 1,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 100,
        flex: 1,
        renderCell: (params) => (
          <Chip
            variant="outlined"
            label={params.value ? String(params.value).replace(/_/g, ' ') : '--'}
            color={statusColors[params.value as PurchaseOrderStatus] || 'warning'}
            size="small"
          />
        ),
      },
      {
        field: 'source_system',
        headerName: 'ERP',
        minWidth: 80,
        flex: 1,
      },
      ...(userRole === 'SUPPLIER'
        ? [
            {
              field: 'supplier_name',
              headerName: 'Supplier',
              minWidth: 150,
              flex: 1,
            },
          ]
        : []),
      ...(userRole === 'SUPPLIER'
        ? [
            {
              field: 'buyer_name',
              headerName: 'Buyer Name',
              minWidth: 150,
              flex: 1,
            },
            {
              field: 'buyer_email',
              headerName: 'Buyer Email',
              minWidth: 160,
              flex: 1,
            },
            {
              field: 'buyer_phone',
              headerName: 'Buyer Phone No',
              minWidth: 140,
              flex: 1,
            },
          ]
        : []),
      ...(userRole === 'SUPPLIER'
        ? [
            {
              field: 'site',
              headerName: 'Site',
              minWidth: 70,
              flex: 1,
            },
          ]
        : []),
    ],
    [theme, pinnedPOIds, togglePin, statusColors, userRole]
  );