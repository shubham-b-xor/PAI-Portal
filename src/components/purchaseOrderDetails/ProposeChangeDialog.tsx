import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, Grid, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

import { poDetailsColors } from './constants';

type ProposeChangeDialogProps = {
  open: boolean;
  lineId: string;
  materialCode?: string;
  quantity: string;
  unitPrice: string;
  deliveryDate: string;
  note: string;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const ProposeChangeDialog: React.FC<ProposeChangeDialogProps> = ({
  open,
  lineId,
  materialCode,
  quantity,
  unitPrice,
  deliveryDate,
  note,
  onQuantityChange,
  onUnitPriceChange,
  onDeliveryDateChange,
  onNoteChange,
  onClose,
  onSubmit,
}) => {
  const netPrice = quantity && unitPrice ? Number(quantity) * Number(unitPrice) : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 1 } }}>
      <Box sx={{ p:2 , backgroundColor: poDetailsColors.darkBlue, color: '#fff', position: 'relative' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Propose Change - PO Line {lineId}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'common.white', position: 'absolute', right: 8, top: 8 }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 2 }}>
        <Stack spacing={0}>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={6}><TextField label="Material No" fullWidth size="medium" disabled value={materialCode || ''} /></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField label="Quantity" type="number" fullWidth size="medium" value={quantity} onChange={(e) => onQuantityChange(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField label="Unit Price" type="number" fullWidth size="medium" value={unitPrice} onChange={(e) => onUnitPriceChange(e.target.value)} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>,}}/></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField label="Net Price" fullWidth size="medium" disabled value={netPrice} /></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField label="Delivery Date" type="date" InputLabelProps={{ shrink: true }} fullWidth size="medium" value={deliveryDate} onChange={(e) => onDeliveryDateChange(e.target.value)} /></Grid>
            <Grid item xs={12} sm={12} md={12}><TextField label="Add Info" fullWidth multiline rows={4} value={note} onChange={(e) => onNoteChange(e.target.value)} /></Grid>
          </Grid>
          
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button size="small" variant="outlined" onClick={onClose}>Cancel</Button>
        <Button size="small" variant="contained" onClick={onSubmit} sx={{ backgroundColor: poDetailsColors.darkBlue }}>Submit Revision Request</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProposeChangeDialog;
