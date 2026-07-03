import React from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Check, Close, InfoOutlined, MoreVert, PushPin, PushPinOutlined, Download, Replay } from '@mui/icons-material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AttachFileIcon from '@mui/icons-material/AttachFile';

import { LineItem } from '@/models';
import { DocsRow } from './types';
import { formatLineId, isSupplierRole } from './utils';

type LineColumnOptions = {
  pinnedLineIds: string[];
  toggleLinePin: (lineId: string) => void;
  openMenu: (event: React.MouseEvent<HTMLElement>, line: LineItem) => void;
  role?: string;
  highlightNeedByDate?: boolean;
  onConcessionClick?: (line: LineItem) => void;
  onSupplierConfirmationClick?: (line: LineItem) => void;
  onDocumentsClick?: (line: LineItem) => void;
};

type DocumentColumnOptions = {
  role: string;
  onReviewDocument: (document: DocsRow, action: 'ACCEPT' | 'REJECT' | 'NEED_MORE_INFORMATION') => void;
  onDownloadDocument: (document: DocsRow) => void;
  onReplaceDocument: (document: DocsRow) => void;
};

export const buildLineColumns = ({
  pinnedLineIds,
  toggleLinePin,
  openMenu,
  role,
  highlightNeedByDate = false,
  onConcessionClick,
  onSupplierConfirmationClick,
  onDocumentsClick,
}: LineColumnOptions): GridColDef[] => {
  const renderNeedByCell = (params: GridRenderCellParams<LineItem>) => {
    const dateValue = String(params.value || '');
    if (!dateValue || !highlightNeedByDate) {
      return dateValue || '-';
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return dateValue;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = new Date(today);
    threshold.setDate(today.getDate() + 30);
    parsed.setHours(0, 0, 0, 0);

    let backgroundColor: string | null = null;
    if (parsed < today) {
      backgroundColor = '#D32F2F';
    } else if (parsed <= threshold) {
      backgroundColor = '#ED6C02';
    }

    if (!backgroundColor) {
      return dateValue;
    }

    return (
      <Typography
        component="span"
        sx={{
          px: 0.75,
          py: 0.25,
          borderRadius: 0,
          color: '#FFFFFF',
          fontWeight: 600,
          backgroundColor,
        }}
      >
        {dateValue}
      </Typography>
    );
  };

  return [
    {
      field: 'pin',
      headerName: 'Pin',
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<LineItem>) => {
        const lineId = formatLineId(params.row);
        const isPinned = pinnedLineIds.includes(lineId);
        return (
          <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                toggleLinePin(lineId);
              }}
              sx={{
                color: isPinned ? 'primary.main' : 'action.disabled',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {isPinned ? (
                <PushPin sx={{ fontSize: '1.25rem' }} />
              ) : (
                <PushPinOutlined sx={{ fontSize: '1.25rem' }} />
              )}
            </IconButton>
          </Tooltip>
        );
      },
    },
    {
      field: 'poline_no',
      headerName: 'PO Line',
      width: 84,
      valueGetter: (_, row: LineItem) => formatLineId(row),
    },
    // { field: 'line_number', headerName: 'Schedule Line', width: 92 },
    { field: 'material_code', headerName: 'Material No', width: 108 },
    { field: 'description', headerName: 'Short Description', width: 110,
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
                  Short Description
                </Typography>
              ),
     },
    {
      field: 'quantity',
      headerName: 'Qty',
      width: 64,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'supplier_confirmed_quantity',
      headerName: 'Supplier Confirmed Qty',
      width: 120,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
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
                  Supplier Confirmed Qty
                </Typography>
              ),
    },
    { field: 'unit', headerName: 'UOM', width: 58, align: 'center', headerAlign: 'center',renderCell: (params) => params.value || '--', },
    {
      field: 'unit_price',
      headerName: 'Unit Price',
      width: 86,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'currency_code',
      headerName: 'Currency',
      width: 80,
    },
    {
      field: 'updated_unit_price',
      headerName: 'Updated Unit Price',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="primary.main">
          {params.value ?? '--'}
        </Typography>
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
                  Updated Unit Price
                </Typography>
              ),
    },
    {
      field: 'net_value',
      headerName: 'Total Value',
      width: 96,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'updated_net_value',
      headerName: 'Updated Total Value',
      width: 60,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="primary.main">
          {params.value ?? '--'}
        </Typography>
      ),
    },
    {
      field: 'updated_total',
      headerName: 'Updated Total',
      width: 80,
      renderCell: (params: GridRenderCellParams<LineItem>) => {
        const row = params.row;
        const curr = Number(row.net_value || 0);
        const updated = Number(row.updated_net_value || row.net_value || 0);
        const diff = updated - curr;
        return (
          <Typography variant="body2">{Number.isFinite(diff) ? diff.toFixed(2) : '-'}</Typography>
        );
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
                  Updated Total
                </Typography>
              ),
    },
    {
      field: 'required_in_house_date',
      headerName: 'Need By Date',
      width: 100,
      renderCell: renderNeedByCell,
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
                  Need By Date
                </Typography>
              ),
    },
    { field: 'updated_delivery_date', headerName: 'Revised Date', width: 100,renderCell: (params) => params.value || '--', },
    {
      field: 'supplier_confirmation_date',
      headerName: 'Supplier Confirmation Date',
      width: 140,
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
                  Supplier Confirmation Date
                </Typography>
              ),
    },
    {
      field: 'concession',
      headerName: 'Concession',
      width: 90,
      renderCell: (params: GridRenderCellParams<LineItem>) => (
        <Typography
          variant="body2"
          color={
            onConcessionClick && (params.row as any).concession ? 'primary.main' : 'text.primary'
          }
          sx={{
            cursor: onConcessionClick && (params.row as any).concession ? 'pointer' : 'default',
            textDecoration:
              onConcessionClick && (params.row as any).concession ? 'underline' : 'none',
          }}
          onClick={(event) => {
            if (!onConcessionClick || !(params.row as any).concession) {
              return;
            }
            event.stopPropagation();
            onConcessionClick(params.row);
          }}
        >
          {(params.row as any).concession || '--'}
        </Typography>
      ),
    },
    {
      field: 'documents',
      headerName: 'Documents',
      width: 90,
      renderCell: (params: GridRenderCellParams<LineItem>) => {
        const docs = (params.row as any).documents;
        const hasDocs = Array.isArray(docs) ? docs.length > 0 : Boolean(docs);
        const handleDocumentsClick = (event: React.MouseEvent<HTMLElement>) => {
          event.stopPropagation();
          onDocumentsClick?.(params.row);
        };

        return (
          <Box
            role="button"
            tabIndex={0}
            aria-label={`Open documents for ${formatLineId(params.row)}`}
            onClick={handleDocumentsClick}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleDocumentsClick(event as unknown as React.MouseEvent<HTMLElement>);
              }
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              cursor: onDocumentsClick ? 'pointer' : 'default',
            }}
          >
            {hasDocs ? <AttachFileIcon /> : '--'}
          </Box>
        );
      },
    },
    {
      field: 'line_status',
      headerName: 'Status',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={String(params.value || 'Pending')}
          size="small"
          variant="outlined"
          color={
            String(params.value || '')
              .toUpperCase()
              .includes('HOLD')
              ? 'default'
              : 'warning'
          }
          sx={{ borderRadius: 4 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 58,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<LineItem>) => {
        const row = params.row;
        const isHold = String((row?.line_status || row?.status || '')).toUpperCase().includes('HOLD');
        const supplier = isSupplierRole(role);
        if (isHold && supplier) {
          return (
            <Tooltip title="Actions disabled while on hold">
              <span>
                <IconButton size="small" disabled>
                  <MoreVert fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          );
        }

        return (
          <IconButton
            size="small"
            onClick={(e) => openMenu(e, params.row)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        );
      },
    },
  ];
};

export const buildSupplierLineColumns = (lineColumns: GridColDef[], includeConcession = false) => {
  const fields = [
    'pin',
    'poline_no',
    'material_code',
    'line_status',
    'description',
    'quantity',
    'updated_quantity',
    'unit_price',
    'updated_unit_price',
    'net_value',
    'updated_net_value',
    'required_in_house_date',
    'updated_delivery_date',
    'supplier_confirmation_date',
    'concession',
    'documents',
    'actions',
  ];

  if (includeConcession) {
    fields.push('updated_total');
  }

  return lineColumns.filter((col) =>
    fields.includes(col.field)
  );
};

export const buildDocumentColumns = ({ role, onReviewDocument, onDownloadDocument, onReplaceDocument }: DocumentColumnOptions): GridColDef[] => {
  const supplier = isSupplierRole(role);

  return [
    {
      field: 'file_name',
      headerName: 'File Name',
      minWidth: 220,
      flex: 1,
      renderCell: (params: GridRenderCellParams<DocsRow>) => (
        <Typography
          variant="body2"
          color="primary.main"
          noWrap
          sx={{ textDecoration: 'underline', cursor: 'pointer' }}
          onClick={() => onDownloadDocument(params.row)}
        >
          {params.row.file_name || params.row.file_path || '-'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams<DocsRow>) => {
        const s = String(params.value || '').toUpperCase();
        let color: 'success' | 'warning' | 'error' | 'info' | 'default' = 'info';
        if (s.includes('APPROVED')) color = 'success';
        else if (s.includes('REJECT')) color = 'error';
        else if (s.includes('NEED')) color = 'warning';
        return <Chip size="small" label={params.value || 'PENDING'} color={color} variant="outlined" sx={{ borderRadius: 4 }} />;
      },
    },
    { field: 'file_type', headerName: 'File Type', width: 84 },
    { field: 'document_tag_to', headerName: 'Document Tag To', width: 146 },
    { field: 'updated_at', headerName: 'Last Modified', width: 148 },
    { field: 'file_size', headerName: 'Size', width: 68, type: 'number', align: 'right', headerAlign: 'right' },
    { field: 'version', headerName: 'Version', width: 70, type: 'number', align: 'right', headerAlign: 'right' },
    { field: 'ps_comments', headerName: 'PS Comments', minWidth: 160, flex: 1 },
    {
      field: 'doc_actions',
      headerName: 'Action',
      width: supplier ? 104 : 126,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<DocsRow>) => (
        supplier ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" onClick={() => onDownloadDocument(params.row)} sx={{ border: '1px solid #d9d9d9', borderRadius: '50%' }}>
              <Download color='action' fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onReplaceDocument(params.row)} sx={{ border: '1px solid #d9d9d9', borderRadius: '50%' }}>
              <Replay color='action' fontSize="small" />
            </IconButton>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" onClick={() => onReviewDocument(params.row, 'ACCEPT')} sx={{ border: '1px solid #d9d9d9', borderRadius: '50%', color: 'success.main' }}>
              <Check color='action' fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onReviewDocument(params.row, 'REJECT')} sx={{ border: '1px solid #d9d9d9', borderRadius: '50%', color: 'error.main' }}>
              <Close color='action' fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onReviewDocument(params.row, 'NEED_MORE_INFORMATION')} sx={{ border: '1px solid #d9d9d9', borderRadius: '50%', color: 'info.main' }}>
              <InfoOutlined color='action' fontSize="small" />
            </IconButton>
          </Stack>
        )
      ),
    },
  ];
};
