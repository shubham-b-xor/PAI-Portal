import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderService } from '@/api/services/purchaseOrderService';
import { LineItem, PurchaseOrder } from '@/models';
import { DocsRow } from './purchaseOrderDetails/types';
import { formatDateForDisplay } from './purchaseOrderDetails/utils';

const normalizeLineId = (line: LineItem) => {
  const raw = line.id || line.line_number;
  return String(raw).trim().padStart(5, '0');
};

const getDisplayLineNumber = (line?: LineItem | null, fallback?: string) => {
  const raw = line?.line_number || fallback || '';
  const value = String(raw).trim();

  if (!value) {
    return '--';
  }

  return value.replace(/^0+/, '').padStart(5, '0');
};

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (value?: number | null, currency = 'USD') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--';
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return String(value);
  }
};

const statusLabelFromLine = (line?: LineItem | null) => {
  const raw = String(line?.line_status || 'PENDING_ACKNOWLEDGEMENT').toUpperCase();
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const FieldValue: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack spacing={0.2}>
    <Typography sx={{ fontSize: 11, color: '#6b7280' }}>{label}</Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{value || '--'}</Typography>
  </Stack>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderColor: '#e5e7eb', borderRadius: 1 }}>
    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.2 }}>{title}</Typography>
    {children}
  </Paper>
);

const LineItemDetails: React.FC = () => {
  const { id, lineId } = useParams<{ id: string; lineId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const moduleQuery = new URLSearchParams(location.search).get('module');

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [documentsRows, setDocumentsRows] = useState<DocsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Missing PO id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [data, docs] = await Promise.all([
          purchaseOrderService.getPOById(id),
          purchaseOrderService.getPODocuments(id),
        ]);
        setPo(data);
        setDocumentsRows((docs as DocsRow[]) || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load line item details');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const lineItem = useMemo<LineItem | null>(() => {
    if (!po || !lineId) {
      return null;
    }

    return (
      po.line_items.find((line) => String(line.id) === String(lineId)) ||
      po.line_items.find((line) => normalizeLineId(line) === String(lineId)) ||
      null
    );
  }, [po, lineId]);

  const lineNumberDisplay = getDisplayLineNumber(lineItem, lineId);

  const lineDocuments = useMemo(
    () =>
      documentsRows.filter((document) =>
        String(document.line_item_id || '').trim().padStart(5, '0') === String(lineId || '').trim().padStart(5, '0')
      ),
    [documentsRows, lineId]
  );

  const handleDocumentDownload = async (docRow: DocsRow) => {
    if (!id || !docRow.id) {
      return;
    }
    try {
      const { blob, fileName } = await purchaseOrderService.downloadPODocument(id, docRow.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || docRow.file_name || docRow.file_path || 'document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download document');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!po || !lineItem) {
    return <Alert severity="warning">Line item not found for this purchase order.</Alert>;
  }

  return (
    <Stack spacing={1.2}>
      <Breadcrumbs sx={{ '& .MuiTypography-root': { fontSize: 13 } }}>
        <Typography sx={{ color: '#0b4f88', cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>PO Listing</Typography>
        <Typography sx={{ color: '#0b4f88', cursor: 'pointer' }} onClick={() => navigate(`/purchase-orders/${po.id}${moduleQuery ? `?module=${moduleQuery}` : ''}`)}>PO Details</Typography>
        <Typography color="text.secondary">Line Item Details</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" spacing={0.75}>
        <LanguageIcon sx={{ color: '#6b7280', fontSize: 18 }} />
        <Typography sx={{ fontSize: 30, lineHeight: 1, fontWeight: 500, color: '#0b4f88' }}>
          PO-{po.po_number}-Line Item No.-{lineNumberDisplay}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={2.2} alignItems="center" flexWrap="wrap" sx={{ pl: 0.2 }}>
        <Typography sx={{ fontSize: 13 }}>{formatDateForDisplay(po.created_date)}</Typography>
        <Typography sx={{ fontSize: 13 }}>Updated {po.last_modified_date ? formatDateForDisplay(po.last_modified_date) : '--'}</Typography>
        <Typography sx={{ fontSize: 13 }}>By {po.last_modified_by || 'System'}</Typography>
        <Typography sx={{ fontSize: 13 }}>{po.source_system || 'Standard PO'}</Typography>
        <Chip
          label={statusLabelFromLine(lineItem)}
          size="small"
          variant="outlined"
          sx={{
            fontSize: 11,
            color: '#ef6c00',
            borderColor: '#ffb880',
            height: 24,
            backgroundColor: '#fffaf5',
          }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 1, borderColor: '#d9dde5' }}>
        {/* <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0} sx={{ px: 0.5, py: 0.25, borderBottom: '1px solid #e5e7eb' }}>
          <Tooltip title="Refresh"><IconButton size="small"><RefreshIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Move Up"><IconButton size="small"><ArrowUpwardIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Share"><IconButton size="small"><IosShareIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Route"><IconButton size="small"><AltRouteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Confirm"><IconButton size="small"><CheckIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        </Stack> */}

        <Stack spacing={1.25} sx={{ p: 1.25 }}>
          <SectionCard title="Line Item Specification">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4} md={2}>
                <FieldValue label="Line Item Number" value={lineNumberDisplay} />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <FieldValue label="Material Number" value={lineItem.material_code || '--'} />
              </Grid>
              <Grid item xs={12} sm={4} md={4}>
                <FieldValue label="Short Description" value={lineItem.description || '--'} />
              </Grid>
              <Grid item xs={12}>
                <FieldValue label="Long Description" value={lineItem.description || '--'} />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="Pricing, Quantity, Date & Attachments">
            <Grid container spacing={2.2}>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Unit Cost" value={formatCurrency(lineItem.unit_price, po.currency || 'USD')} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Total Quantity" value={`${lineItem.quantity ?? '--'} ${lineItem.unit || ''}`} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Total Cost" value={formatCurrency(lineItem.net_value ?? (Number(lineItem.quantity || 0) * Number(lineItem.unit_price || 0)), po.currency || 'USD')} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Required Delivery Date" value={formatDate(lineItem.required_in_house_date || lineItem.shipment_date)} /></Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FieldValue
                  label="Attachments"
                  value={
                    lineDocuments.length > 0 ? (
                      <Typography
                        component="span"
                        sx={{ color: '#0b4f88', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                        onClick={() => {
                          const firstAttachment = lineDocuments[0];
                          if (firstAttachment) {
                            void handleDocumentDownload(firstAttachment);
                          }
                        }}
                      >
                        {`${lineDocuments.length} Attachments`}
                      </Typography>
                    ) : (
                      '--'
                    )
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}><FieldValue label="Currency" value={po.currency || '--'} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Payment Term" value={po.payment_terms || '--'} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Split Schedule" value={lineItem.updated_delivery_date ? 'YES' : 'NA'} /></Grid>
              <Grid item xs={12} sm={6} md={3}><FieldValue label="Incoterm" value={po.incoterm || 'FCA'} /></Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="Delivery Details">
            <Grid container spacing={2.2}>
              <Grid item xs={12} sm={6} md={3}><FieldValue label="Incoterm" value={po.incoterm || 'FCA'} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Phone" value={po.po_details?.buyer_details?.telephone || '8793564490'} /></Grid>
              <Grid item xs={12} md={7}><FieldValue label="Address" value={po.po_details?.shipment_details?.address || po.po_details?.supplier_details?.address || '742 Evergreen Terrace, Springfield, OR 97477, United States'} /></Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="Purchase Order Context">
            <Grid container spacing={2.2}>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="PO Number" value={po.po_number} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Total PO Value" value={formatCurrency(po.total_value, po.currency || 'USD')} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Supplier Contact" value={formatDate(po.delivery_date)} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Buyer" value={po.po_details?.buyer_details?.buyer || po.last_modified_by || '--'} /></Grid>
              <Grid item xs={12} sm={6} md={2}><FieldValue label="Supplier" value={po.supplier_name || '--'} /></Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FieldValue
                  label="PO Status"
                  value={
                    <Chip
                      label={statusLabelFromLine(lineItem)}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: 11,
                        color: '#ef6c00',
                        borderColor: '#ffb880',
                        height: 24,
                        backgroundColor: '#fffaf5',
                      }}
                    />
                  }
                />
              </Grid>
            </Grid>
          </SectionCard>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default LineItemDetails;
