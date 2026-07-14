import React from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

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

type UsePoToReviewColumnsParams = {
  theme: Theme;
  statusColors: Record<PurchaseOrderStatus, StatusColor>;
  pinnedPOToReviewLineItemIds: string[];
  togglePOToReviewLinePin: (lineItemRowId: string) => void;
  openActionMenu: (event: React.MouseEvent<HTMLElement>, row: LineItemTabRow) => void;
  userRole?: string;
};

export const usePoToReviewColumns = ({
  theme,
  statusColors,
  pinnedPOToReviewLineItemIds,
  togglePOToReviewLinePin,
  openActionMenu,
  userRole,
}: UsePoToReviewColumnsParams): GridColDef[] =>
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
          const isPinned = pinnedPOToReviewLineItemIds.includes(lineItemRowId);

          return (
            <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePOToReviewLinePin(lineItemRowId);
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
        field: 'line_number',
        headerName: 'PO Line',
        width: 85,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'schedule_line',
        headerName: 'Schedule Line',
        width: 80,
        renderCell: (params) => {
          const scheduleLine = params.row.schedule_line ?? params.row.po_line_revision_no ?? '--';

          return scheduleLine;
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
            Schedule Line
          </Typography>
        ),
      },
      {
        field: 'material_code',
        headerName: 'Material No',
        width: 105,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'description',
        headerName: 'Short Description',
        width: 135,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'unit',
        headerName: 'UOM',
        width: 55,
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
        headerName: 'Revised QTY',
        width: 150,
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
            Revised QTY
          </Typography>
        ),
      },
      {
        field: 'unit_price',
        headerName: 'Unit Price',
        width: 90,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'currency_code',
        headerName: 'Currency',
        width: 80,
        renderCell: (params) => params.value || params.row.currency || '--',
      },
      {
        field: 'updated_unit_price',
        headerName: 'Revised Unit Price',
        width: 105,
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
            Revised Unit Price
          </Typography>
        ),
      },
      {
        field: 'net_value',
        headerName: 'Total Value',
        width: 100,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'updated_net_value',
        headerName: 'Revised Total',
        width: 105,
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
            Revised Total
          </Typography>
        ),
      },
      {
        field: 'required_in_house_date',
        headerName: 'Need by Date',
        width: 115,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'updated_delivery_date',
        headerName: 'Revised Date',
        width: 110,
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
        field: 'supplier_confirmation_date',
        headerName: 'Supplier Confirmation Date',
        width: 160,
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
            Supplier Confirmation Date
          </Typography>
        ),
      },
      {
        field: 'concession',
        headerName: 'Concession',
        width: 105,
        renderCell: (params) =>
          hasCellValue(params.value) ? (
            <Typography
              height="100%"
              alignContent="center"
              fontSize="1rem"
              color="success.main"
              fontWeight={700}
            >
              ✓
            </Typography>
          ) : (
            '--'
          ),
      },
      {
        field: 'documents',
        headerName: 'Document',
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const docs = params.value as unknown;
          const hasDocs = Array.isArray(docs) ? docs.length > 0 : Boolean(docs);

          return hasDocs ? <AttachFileIcon fontSize="small" color="action" /> : '--';
        },
      },
      {
        field: 'line_status',
        headerName: 'Status',
        width: 120,
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
        field: 'action',
        headerName: 'Action',
        width: 75,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as LineItemTabRow;
          const isHold = String(row?.line_status || row?.status || '')
            .toUpperCase()
            .includes('HOLD');

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
      pinnedPOToReviewLineItemIds,
      togglePOToReviewLinePin,
      openActionMenu,
      userRole,
    ]
  );
