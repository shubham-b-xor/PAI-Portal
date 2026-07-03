import React from 'react';
import { Avatar, Grid, Paper, Stack, Typography } from '@mui/material';
import { PurchaseOrder } from '@/models';
import {
  formatDateForDisplay,
  formatDeliveryBadge,
  getConfirmedDate,
  getDaysDelta,
  getRequiredDeliveryDate,
} from './utils';

type OverviewTabProps = {
  po: PurchaseOrder;
};

const OverviewTab: React.FC<OverviewTabProps> = ({ po }) => {
  const requiredDeliveryDate = getRequiredDeliveryDate(po);
  const confirmedDate = getConfirmedDate(po);
  const deliveryBadge = formatDeliveryBadge(getDaysDelta(requiredDeliveryDate));

  return (
    <Stack spacing={2} p={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Purchase Order Details</Typography>
        <Grid container rowSpacing={2} columnSpacing={3}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">PO Number</Typography><Typography variant="body2">{po.po_number || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Order Type</Typography><Typography variant="body2">{po.source_system ? (po.source_system === 'SAP_S4' ? 'Standard PO' : po.source_system) : 'Standard PO'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Confirmed Date</Typography><Typography variant="body2">{formatDateForDisplay(confirmedDate)}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Source Agreement</Typography><Typography variant="body2">{po.source_system || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Buyer</Typography><Typography variant="body2">{po.procurement_specialist_id || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Order Date</Typography><Typography variant="body2">{formatDateForDisplay(po.created_date)}</Typography></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Supplier Details</Typography>
        <Grid container rowSpacing={2} columnSpacing={3}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Supplier Code</Typography><Typography variant="body2">{po.po_details?.supplier_details?.supplier_no || po.supplier_id || 'SA-000123'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Supplier</Typography><Stack direction="row" spacing={1} alignItems="center"><Avatar sx={{ width: 24, height: 24 }}>{(po.supplier_name || '?').charAt(0)}</Avatar><Typography variant="body2">{po.supplier_name || '-'}</Typography></Stack></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Supplier Name</Typography><Typography variant="body2">{po.supplier_name || 'Simon Rodriguez'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Email</Typography><Typography variant="body2">{po.supplier_email || po.po_details?.supplier_details?.email || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Phone</Typography><Typography variant="body2">{po.po_details?.buyer_details?.telephone || (po as any).supplier_phone || '021325698'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Address</Typography><Typography variant="body2">{po.supplier_address || '166 Industrial Supply Way, Monterrey, NL 64000, MX'}</Typography></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Shipment Details</Typography>
        <Grid container rowSpacing={2} columnSpacing={3}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Address</Typography><Typography variant="body2">{po.po_details?.shipment_details?.address || 'Tooling Flowserve S. de R.L. de C.V., Calle Esmeralda #25, 90184 Santa Isabel, Mexico'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Incoterm</Typography><Typography variant="body2">{po.incoterm || 'FCA'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Incoterm Name Location</Typography><Typography variant="body2">{po.incoterm_named_place || 'SELLER FACILITY'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Phone</Typography><Typography variant="body2">{po.po_details?.buyer_details?.telephone || '021325698'}</Typography></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Billing Details</Typography>
        <Grid container rowSpacing={2} columnSpacing={3}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Bill To Address</Typography><Typography variant="body2">{po.po_details?.billing_details?.bill_to_address || 'Flowserve S. de R.L. de C.V., Vía Morelos 437, Santa Clara, Colón, 65560 Ecatepec de Morelos, Mexico'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Send Invoice to</Typography><Typography variant="body2">{po.procurement_specialist_id || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Payment Terms</Typography><Typography variant="body2">{po.payment_terms ? (po.payment_terms === 'P012' ? 'Net 60 days' : po.payment_terms) : 'Net 60 days'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Currency</Typography><Typography variant="body2">{po.currency || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Order Value</Typography><Typography variant="body2">{po.total_value ? `$ ${po.total_value.toLocaleString()}` : '$ 25,000'}</Typography></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Additional Information</Typography>
        <Grid container rowSpacing={2} columnSpacing={3}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Cost Center</Typography><Typography variant="body2">{po.po_details?.buyer_details?.buyer || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">PO Owner</Typography><Typography variant="body2">{po.procurement_specialist_id || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Notes</Typography><Typography variant="body2">{po.mrp_exceptions || '-'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="text.secondary">Attachments</Typography><Typography variant="body2" color="primary.main">View documents in Documents tab</Typography></Grid>
        </Grid>
      </Paper>
    </Stack>
  );
};

export default OverviewTab;
