import React from 'react';
import { Alert, Avatar, Chip, Stack, Typography } from '@mui/material';
import { HistoryOutlined } from '@mui/icons-material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineItem,
  TimelineSeparator,
} from '@mui/lab';

import { HistoryRow } from './types';
import { formatActionLabel } from './utils';

type HistoryTabProps = {
  historyRows: HistoryRow[];
};

const HistoryTab: React.FC<HistoryTabProps> = ({ historyRows }) => {

  const formatDateTime = (date?: string) => {
    if (!date) return '-';

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <Stack spacing={1.5} p={2}>
      {historyRows.length === 0 ? <Alert severity="info">No history yet.</Alert> : null}
      <Timeline
        position="right"
        sx={{
          m: 0,
          p: 0,
          '& .MuiTimelineItem-root:before': {
            flex: 0,
            padding: 0,
          },
        }}
      >
        {historyRows.map((row, idx) => {
          const actionLabel = formatActionLabel(row.action);
          const roleLabel = String(row.actor_role || 'SYSTEM').toUpperCase();
          const isSupplierAction = roleLabel.includes('SUPPLIER');
          const roleColor: 'info' | 'warning' = isSupplierAction ? 'info' : 'warning';
          const roleIconColor = isSupplierAction ? 'info.main' : 'warning.main';
          return (
            <TimelineItem key={`${row.id || idx}`}>
              <TimelineSeparator>
                <HistoryOutlined sx={{ color: roleIconColor }} />
                {idx < historyRows.length - 1 ? <TimelineConnector sx={{ bgcolor: 'grey.500' }} /> : null}
              </TimelineSeparator>

              <TimelineContent sx={{ py: 0.5 }}>
                <Stack spacing={0.6}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {actionLabel}-Line Item No-{row.line_item_id || '-'}
                    </Typography>
                    <Chip
                      size="small"
                      label={roleLabel}
                      color={roleColor}
                      sx={{ height: 18, borderRadius: 4 }}
                    />
                  </Stack>

                  <Typography variant="body2">
                    {row.notes || `${row.previous_status || '-'} -> ${row.new_status || '-'}`}
                  </Typography>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <Avatar sx={{ width: 16, height: 16, fontSize: 9 }}>
                        {(row.actor_id || '?').charAt(0)}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {row.actor_id || '-'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                      >
                        {formatDateTime(row.created_at || row.timestamp)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Stack>
  );
};

export default HistoryTab;
