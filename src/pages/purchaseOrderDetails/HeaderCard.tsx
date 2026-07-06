import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { PurchaseOrder } from '@/models';
import ViewListIcon from '@mui/icons-material/ViewList';
import { formatDateForDisplay, formatRelativeTime } from './utils';

type HeaderCardProps = {
  po: PurchaseOrder;
  actions?: React.ReactNode;
};

const HeaderCard: React.FC<HeaderCardProps> = ({ po, actions }) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0,
        border: 'none',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#5E7DA5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ViewListIcon
                sx={{
                  color: '#fff',
                  fontSize: 18,
                }}
              />
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 500, color: '#0b5394', fontSize: 24, lineHeight: 1.1 }}
            >
              {po.po_number}
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Typography variant="body2">
              {formatDateForDisplay(po.created_date)} • {formatRelativeTime(po.last_modified_date || po.created_date)}
            </Typography>
            <Typography variant="body2">By {po.last_modified_by || '-'}</Typography>
            <Typography variant="body2">{po.source_system || '-'}</Typography>
            <Chip
              label={po.status || 'PENDING'}
              size="small"
              variant="outlined"
              color="warning"
              sx={{ borderRadius: 4 }}
            />
          </Stack>
        </Stack>
        {actions ? (
          <Stack direction="row" spacing={1} flexWrap="nowrap" justifyContent="flex-end" sx={{ ml: 'auto', overflowX: 'auto' }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default HeaderCard;
