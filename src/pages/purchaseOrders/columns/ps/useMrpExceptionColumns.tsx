import React from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import type { PurchaseOrderStatus } from '@/models';
import type { LineItemTabRow } from '../../types';
import { formatCurrency, hasCellValue } from '../../utils/formatters';

type StatusColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';

type UseMrpExceptionColumnsParams = {
  theme: Theme;
  statusColors: Record<PurchaseOrderStatus, StatusColor>;
  pinnedMRPLineItemIds: string[];
  toggleMRPLinePin: (lineItemRowId: string) => void;
  renderNeedByDateCell: (value: unknown) => React.ReactNode;
  openActionMenu: (event: React.MouseEvent<HTMLElement>, row: LineItemTabRow) => void;
  userRole?: string;
};

export const useMrpExceptionColumns = ({
  theme,
  statusColors,
  pinnedMRPLineItemIds,
  toggleMRPLinePin,
  renderNeedByDateCell,
  openActionMenu,
  userRole,
}: UseMrpExceptionColumnsParams): GridColDef[] =>
  React.useMemo(
    () => [
      {
        field: 'pin',
        headerName: 'Pin',
        width: 40,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const lineItemRowId = String(params.row.id);
          const isPinned = pinnedMRPLineItemIds.includes(lineItemRowId);

          return (
            <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMRPLinePin(lineItemRowId);
                }}
                sx={{
                  color: isPinned ? 'primary.main' : 'action.disabled',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {isPinned ? (
                  <PushPinIcon sx={{ fontSize: '1.25rem' }} />
                ) : (
                  <PushPinOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                )}
              </IconButton>
            </Tooltip>
          );
        },
      },
      {
        field: 'po_number',
        headerName: 'PO Number',
        width: 115,
        renderCell: (params) => (
          <Typography
            fontWeight="bold"
            height="100%"
            alignContent="center"
            fontSize="0.8rem"
            color={theme.palette.primary.light}
          >
            {params.value || '--'}
          </Typography>
        ),
      },
      {
        field: 'po_line_revision_no',
        headerName: 'Revision No.',
        width: 70,
        renderCell: (params) => {
          const value = params.value ?? params.row.revision_changes ?? '--';
          return value;
        },
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
            Revision No.
          </Typography>
        ),
      },
      {
        field: 'line_number',
        headerName: 'Line Item',
        width: 95,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'description',
        headerName: 'Short Description',
        width: 150,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'supplier_name',
        headerName: 'Supplier',
        width: 170,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'recommendation',
        headerName: 'Recommendations',
        width: 150,
        renderCell: (params) => {
          const value =
            params.row.recommendation || params.row.except_message || params.row.po_feedback || '--';

          return value !== '--' ? (
            <Typography
              fontWeight="bold"
              height="100%"
              alignContent="center"
              fontSize="0.8rem"
              color={theme.palette.primary.light}
            >
              {String(value)}
            </Typography>
          ) : (
            '--'
          );
        },
      },
      {
        field: 'unit',
        headerName: 'Unit',
        width: 60,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'quantity',
        headerName: 'Qty',
        width: 55,
        renderCell: (params) => params.value ?? '--',
      },
      {
        field: 'updated_quantity',
        headerName: 'Revised Qty',
        width: 70,
        renderCell: (params) =>
          hasCellValue(params.value) ? (
            <Typography
              fontWeight="bold"
              height="100%"
              alignContent="center"
              fontSize="0.8rem"
              color={theme.palette.primary.light}
            >
              {params.value}
            </Typography>
          ) : (
            '--'
          ),
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
            Revised Qty
          </Typography>
        ),
      },
      {
        field: 'unit_price',
        headerName: 'Unit Price',
        width: 95,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'net_value',
        headerName: 'Total Value',
        width: 105,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'updated_net_value',
        headerName: 'Revised Value',
        width: 115,
        renderCell: (params) =>
          hasCellValue(params.value) ? (
            <Typography
              fontWeight="bold"
              height="100%"
              alignContent="center"
              fontSize="0.8rem"
              color={theme.palette.primary.light}
            >
              {formatCurrency(params.value)}
            </Typography>
          ) : (
            '--'
          ),
      },
      {
        field: 'required_in_house_date',
        headerName: 'Need by Date',
        width: 120,
        renderCell: (params) => renderNeedByDateCell(params.value),
      },
      {
        field: 'updated_delivery_date',
        headerName: 'Revised Date',
        width: 120,
        renderCell: (params) =>
          hasCellValue(params.value) ? (
            <Typography
              fontWeight="bold"
              height="100%"
              alignContent="center"
              fontSize="0.8rem"
              color={theme.palette.primary.light}
            >
              {params.value}
            </Typography>
          ) : (
            '--'
          ),
      },
      {
        field: 'site',
        headerName: 'Flowserve Site',
        width: 100,
        renderCell: (params) => params.value || '--',
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
            Flowserve Site
          </Typography>
        ),
      },
      {
        field: 'line_status',
        headerName: 'PO Status',
        width: 130,
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
        width: 95,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'action',
        headerName: 'Action',
        width: 75,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as LineItemTabRow;
          const isHold = String(row?.line_status || row?.status || '').toUpperCase().includes('HOLD');

          if (isHold && userRole === 'SUPPLIER') {
            return (
              <Tooltip title="Actions disabled while on hold">
                <span>
                  <IconButton size="small" disabled>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            );
          }

          return (
            <IconButton
              size="small"
              onClick={(event) => openActionMenu(event, params.row as LineItemTabRow)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          );
        },
      },
    ],
    [
      theme,
      statusColors,
      pinnedMRPLineItemIds,
      toggleMRPLinePin,
      renderNeedByDateCell,
      openActionMenu,
      userRole,
    ]
  );
