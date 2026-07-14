import React from 'react';

import BackHandIcon from '@mui/icons-material/BackHand';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SyncIcon from '@mui/icons-material/Sync';

import type { PinType } from '@/api/services/userService';
import type { PurchaseOrdersModuleVariant } from './types';

export const MRP_EXCEPTION_ANTD_TAB = 4;

export const PAGE_PIN_TYPES: PinType[] = ['po', 'po_to_review', 'mrp_exception'];

export const MODULE_TABS: Record<
  PurchaseOrdersModuleVariant,
  Array<{ label: string; value: number }>
> = {
  default: [
    { label: 'MRP EXCEPTION (ANTD)', value: MRP_EXCEPTION_ANTD_TAB },
    { label: 'MRP EXCEPTION', value: 3 },
    { label: 'PO TO REVIEW', value: 2 },
    { label: 'ALL OPEN PO', value: 0 },
  ],
  'supplier-collaboration': [
    { label: 'ALERTS', value: 3 },
    { label: 'ACTION REQUIRED', value: 2 },
    { label: 'ALL OPEN PO', value: 0 },
  ],
  cockpit: [
    { label: 'MRP EXCEPTION (ANTD)', value: MRP_EXCEPTION_ANTD_TAB },
    { label: 'MRP EXCEPTION', value: 3 },
    { label: 'PO TO REVIEW', value: 2 },
    { label: 'ALL OPEN PO', value: 0 },
  ],
};

export const MODULE_TITLE: Record<PurchaseOrdersModuleVariant, string> = {
  default: 'Purchase Order Listing',
  'supplier-collaboration': 'Supplier Collaboration',
  cockpit: 'Procurement Cockpit',
};

export const ACTION_LABELS: Record<string, string> = {
  MOVE_IN: 'Move in',
  MOVE_OUT: 'Move out',
  SPLIT: 'Split',
  HOLD: 'Hold',
  UNHOLD: 'Unhold',
  REJECT: 'Reject',
  ACCEPT: 'Accept',
  ACKNOWLEDGE: 'Acknowledge',
  NEED_MORE_INFORMATION: 'Need More Information',
  PROPOSE_CHANGE: 'Propose change',
  RAISE_CONCESSION: 'Raise Concession',
  UPLOAD_DOCUMENT: 'Upload Document',
};

export const ACTION_ICONS: Record<string, React.ReactNode> = {
  MOVE_IN: <BackHandIcon fontSize="small" />,
  MOVE_OUT: <SwapHorizIcon fontSize="small" />,
  SPLIT: <CallSplitIcon fontSize="small" />,
  HOLD: <WarningAmberIcon fontSize="small" />,
  UNHOLD: <CheckCircleOutlineIcon fontSize="small" />,
  REJECT: <CancelOutlinedIcon fontSize="small" />,
  ACCEPT: <CheckCircleOutlineIcon fontSize="small" />,
  NEED_MORE_INFORMATION: <InfoOutlinedIcon fontSize="small" />,
  RAISE_CONCESSION: <TrendingUpIcon fontSize="small" />,
  UPLOAD_DOCUMENT: <UploadFileIcon fontSize="small" />,
  PROPOSE_CHANGE: <SyncIcon fontSize="small" />,
};