import React from 'react';
import { Divider, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { ArrowBack, ArrowForward, CallSplit, CheckCircle, Close, InfoOutlined, Sync, TrendingUp, Upload } from '@mui/icons-material';

import { isSupplierRole } from './utils';

type ActionsMenuProps = {
  role?: string;
  anchorEl: HTMLElement | null;
  lineStatus?: string;
  onClose: () => void;
  onOpenDialog: (action: string) => void;
};

const ActionsMenu: React.FC<ActionsMenuProps> = ({ role, anchorEl, lineStatus, onClose, onOpenDialog }) => {
  const supplier = isSupplierRole(role);
  const isHoldLine = String(lineStatus || '').toUpperCase().includes('HOLD');

  const unholdAction = (
    <MenuItem onClick={() => { onClose(); onOpenDialog('UNHOLD'); }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <InfoOutlined fontSize="small" />
        <Typography variant="body2">Unhold</Typography>
      </Stack>
    </MenuItem>
  );

  if (isHoldLine) {
    return (
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
        {unholdAction}
      </Menu>
    );
  }

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      {supplier ? (
        <>
          <MenuItem onClick={() => { onClose(); onOpenDialog('PROPOSE_CHANGE'); }}><Stack direction="row" alignItems="center" spacing={1.5}><Sync fontSize="small" /><Typography variant="body2">Propose change</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('RAISE_CONCESSION'); }}><Stack direction="row" alignItems="center" spacing={1.5}><TrendingUp fontSize="small" /><Typography variant="body2">Raise Concession</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('UPLOAD_DOCUMENT'); }}><Stack direction="row" alignItems="center" spacing={1.5}><Upload fontSize="small" /><Typography variant="body2">Upload Document</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('SPLIT'); }}><Stack direction="row" alignItems="center" spacing={1.5}><CallSplit fontSize="small" /><Typography variant="body2">Split</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('ACKNOWLEDGE'); }}><Stack direction="row" alignItems="center" spacing={1.5}><CheckCircle fontSize="small" /><Typography variant="body2">Acknowledge</Typography></Stack></MenuItem>
        </>
      ) : (
        <>
          <MenuItem onClick={() => { onClose(); onOpenDialog('MOVE_IN'); }}><Stack direction="row" alignItems="center" spacing={1.5}><ArrowBack fontSize="small" /><Typography variant="body2">Move in</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('MOVE_OUT'); }}><Stack direction="row" alignItems="center" spacing={1.5}><ArrowForward fontSize="small" /><Typography variant="body2">Move out</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('SPLIT'); }}><Stack direction="row" alignItems="center" spacing={1.5}><CallSplit fontSize="small" /><Typography variant="body2">Split</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('HOLD'); }}><Stack direction="row" alignItems="center" spacing={1.5}><InfoOutlined fontSize="small" /><Typography variant="body2">Hold</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('REJECT'); }}><Stack direction="row" alignItems="center" spacing={1.5}><Close fontSize="small" /><Typography variant="body2">Reject</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('ACCEPT'); }}><Stack direction="row" alignItems="center" spacing={1.5}><CheckCircle fontSize="small" /><Typography variant="body2">Accept</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('ACKNOWLEDGE'); }}><Stack direction="row" alignItems="center" spacing={1.5}><InfoOutlined fontSize="small" /><Typography variant="body2">Acknowledge</Typography></Stack></MenuItem>
          <Divider />
          <MenuItem onClick={() => { onClose(); onOpenDialog('NEED_MORE_INFORMATION'); }}><Stack direction="row" alignItems="center" spacing={1.5}><InfoOutlined fontSize="small" /><Typography variant="body2">Need More Information</Typography></Stack></MenuItem>
        </>
      )}
    </Menu>
  );
};

export default ActionsMenu;
