import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  Menu,
  MenuItem as ActionMenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel, GridSortModel} from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import PushPinIcon from '@mui/icons-material/PushPin';
import ViewListIcon from '@mui/icons-material/ViewList';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
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
import { purchaseOrderService } from '@/api/services/purchaseOrderService';
import {
  PurchaseOrder,
  POFilters as POFiltersType,
  AdvanceFilters,
  PurchaseOrderStatus,
} from '@/models';
import { useAuth } from '@/hooks/useAuth';
import POFilters from '@/components/common/POFilters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { usePagination } from '@/hooks/usePagination';
import { format } from 'date-fns';
import { logger } from '@/services/logger';
import ClearIcon from '@mui/icons-material/Clear';
import './grid.css';
import { userService } from '@/api/services/userService';
import type { PinType } from '@/api/services/userService';
import {
  MoveDateDialog,
  ProposeChangeDialog,
  RaiseConcessionDialog,
  SimpleInfoDialog,
  SplitDialog,
  UploadDocumentDialog,
} from '@/components/purchaseOrderDetails';
import { DialogType } from './purchaseOrderDetails/types';

type LineItemTabRow = {
  id: string;
  po_id: string;
  [key: string]: unknown;
};

const PAGE_PIN_TYPES: PinType[] = ['po', 'po_to_review', 'mrp_exception'];

type PurchaseOrdersModuleVariant = 'default' | 'supplier-collaboration' | 'cockpit';

interface PurchaseOrdersProps {
  moduleVariant?: PurchaseOrdersModuleVariant;
}

const MODULE_TABS: Record<PurchaseOrdersModuleVariant, Array<{ label: string; value: number }>> = {
  default: [
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
    { label: 'MRP EXCEPTION', value: 3 },
    { label: 'PO TO REVIEW', value: 2 },
    { label: 'ALL OPEN PO', value: 0 },
  ],
};

const MODULE_TITLE: Record<PurchaseOrdersModuleVariant, string> = {
  default: 'Purchase Order Listing',
  'supplier-collaboration': 'Supplier Collaboration',
  cockpit: 'Procurement Cockpit',
};

const ACTION_LABELS: Record<string, string> = {
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

const ACTION_ICONS: Record<string, React.ReactNode> = {
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

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ moduleVariant = 'default' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const userId = user?.id;
  const userRole = user?.role;
  const supplierFilterId = userRole === 'SUPPLIER' ? String(user?.supplier_msid ?? userId ?? '') : '';
  const isDefaultSupplierView = moduleVariant === 'default' && user?.role === 'SUPPLIER';
  const isSupplierCollaborationMode = moduleVariant === 'supplier-collaboration' || isDefaultSupplierView;
  const moduleTabs = useMemo(() => {
    if (isDefaultSupplierView) {
      return MODULE_TABS['supplier-collaboration'];
    }

    return MODULE_TABS[moduleVariant];
  }, [moduleVariant, isDefaultSupplierView]);
  const defaultTab = moduleTabs[2]?.value ?? 2;
  const isSupplierCollaboration = isSupplierCollaborationMode;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const shouldHighlightNeedByDate = isSupplierCollaboration && selectedTab === 3;
  
  const isPOToReviewTab = selectedTab === 2;
  const isMRPExceptionTab = selectedTab === 3;
  const isLineItemTab = isPOToReviewTab || isMRPExceptionTab;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineItemRows, setLineItemRows] = useState<LineItemTabRow[]>([]);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedActionRow, setSelectedActionRow] = useState<LineItemTabRow | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogType>('NONE');
  const [dialogNote, setDialogNote] = useState('');
  const [dialogDate, setDialogDate] = useState('');
  const [splitRows, setSplitRows] = useState<Array<{ quantity: string; delivery_date: string }>>([
    { quantity: '', delivery_date: '' },
  ]);
  const [proposeQuantity, setProposeQuantity] = useState('');
  const [proposeUnitPrice, setProposeUnitPrice] = useState('');
  const [proposeDeliveryDate, setProposeDeliveryDate] = useState('');
  const [concessionDescription, setConcessionDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadComments, setUploadComments] = useState('');
  const [documentTags, setDocumentTags] = useState<string[]>(['LINE_ITEM']);
  const [selectedDocumentTag, setSelectedDocumentTag] = useState('LINE_ITEM');
  const [selectedRowIds, setSelectedRowIds] = useState<GridRowSelectionModel>([]);
  const [bulkAcceptOpen, setBulkAcceptOpen] = useState(false);
  const [bulkAcceptNote, setBulkAcceptNote] = useState('');
  const [bulkAcceptLoading, setBulkAcceptLoading] = useState(false);

  const { page, pageSize, setPage, setPageSize } = usePagination(0, 60);
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    setSelectedTab(defaultTab);
    setPage(0);
  }, [defaultTab, setPage]);

  useEffect(() => {
    const loadDocumentTags = async () => {
      try {
        const tags = await purchaseOrderService.getPODocumentTags();
        if (tags.length > 0) {
          setDocumentTags(tags);
          setSelectedDocumentTag(tags[0] || 'LINE_ITEM');
        }
      } catch {
        setDocumentTags(['LINE_ITEM']);
        setSelectedDocumentTag('LINE_ITEM');
      }
    };

    void loadDocumentTags();
  }, [user?.role]);

  // Filter states
  const [searchInput, setSearchInput] = useState('');
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  // const [sortBy, setSortBy] = useState('');
  // const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortModel, setSortModel] = useState<{
    sort_by: string | undefined;
    sort_order: 'asc' | 'desc';
  }>({ sort_by: '', sort_order: 'desc' });

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advanceFilters, setAdvancefilters] = useState<AdvanceFilters>({});
  const [advanceTempFilters, setAdvanceTempfilters] = useState<AdvanceFilters>({});
  // const advanceFiltersRef = useRef<AdvanceFilters>({});
  const [pinnedPOIds, setPinnedPOIds] = useState<string[]>([]);
  const [pinnedPOs, setPinnedPOs] = useState<PurchaseOrder[]>([]);
  const [pinnedPOsRowCount, setPinnedPOsRowCount] = useState(0);
  const [pinFilter, setPinFilter] = useState('all'); // 'all', 'pinned'
  const [poToReviewPinFilter, setPOToReviewPinFilter] = useState('all');
  const [mrpPinFilter, setMrpPinFilter] = useState('all');
  //line item level pinning for potoreview & MRP tab
  const [pinnedPOToReviewLineItemIds, setPinnedPOToReviewLineItemIds] = useState<string[]>([]);
  const [pinnedMRPLineItemIds, setPinnedMRPLineItemIds] = useState<string[]>([]);

  const currentPinFilter = React.useMemo(() => {
    switch (selectedTab) {
      case 2: // PO TO REVIEW
        return poToReviewPinFilter;

      case 3: // MRP EXCEPTION
        return mrpPinFilter;

      case 0: // OPEN PO / normal PO list
      default:
        return pinFilter;
    }
  }, [selectedTab, pinFilter, poToReviewPinFilter, mrpPinFilter]);

  const handleCurrentPinFilterChange = useCallback(
    (value: string) => {
      switch (selectedTab) {
        case 2: // PO TO REVIEW
          setPOToReviewPinFilter(value);
          break;

        case 3: // MRP EXCEPTION
          setMrpPinFilter(value);
          break;

        case 0: // OPEN PO / normal PO list
        default:
          setPinFilter(value);
          break;
      }

      setPage(0);
    },
    [selectedTab, setPage]
  );

  const togglePin = (poId: string) => {
    setPinnedPOIds((prev) => {
      const wasPinned = prev.includes(poId);
      const updated = wasPinned ? prev.filter((id) => id !== poId) : [...prev, poId];

      setPinnedPOsRowCount(updated.length);

      if (wasPinned) {
        setPinnedPOs((rows) => rows.filter((po) => po.id !== poId));
      } else {
        const poToPin = purchaseOrders.find((po) => po.id === poId);
        if (poToPin) {
          setPinnedPOs((rows) => (rows.some((po) => po.id === poId) ? rows : [poToPin, ...rows]));
        }
      }

      if (userId) {
        userService.updatePinnedRows(userId, updated, 'po');
      }

      return updated;
    });
  };

  const togglePOToReviewLinePin = (lineItemRowId: string) => {
    setPinnedPOToReviewLineItemIds((prev) => {
      const updated = prev.includes(lineItemRowId)
        ? prev.filter((id) => id !== lineItemRowId)
        : [...prev, lineItemRowId];

      if (userId) {
        userService.updatePinnedRows(userId, updated, 'po_to_review');
      }

      return updated;
    });
  };

  const toggleMRPLinePin = (lineItemRowId: string) => {
    setPinnedMRPLineItemIds((prev) => {
      const updated = prev.includes(lineItemRowId)
        ? prev.filter((id) => id !== lineItemRowId)
        : [...prev, lineItemRowId];

      if (userId) {
        userService.updatePinnedRows(userId, updated, 'mrp_exception');
      }

      return updated;
    });
  };

  useEffect(() => {
    const loadAvailableSites = async () => {
      try {
        const sites = await purchaseOrderService.getAvailableSites();

        setAvailableSites(sites);
        setSelectedSites(sites);
      } catch (error) {
        console.error('Failed to load available sites', error);
        setAvailableSites([]);
        setSelectedSites([]);
      } finally {
        setSitesLoaded(true);
      }
    };

    loadAvailableSites();
  }, []);

  const loadPinnedState = useCallback(async () => {
    if (!userId) {
      setPinnedPOIds([]);
      setPinnedPOToReviewLineItemIds([]);
      setPinnedMRPLineItemIds([]);
      setPinnedPOs([]);
      setPinnedPOsRowCount(0);
      return;
    }

    try {
      const [pinnedRowsResult, pinnedPOListResult] = await Promise.all([
        userService.getPinnedRowsBatch(userId, PAGE_PIN_TYPES),
        purchaseOrderService.getPinnedPOList(userId),
      ]);

      setPinnedPOIds(pinnedRowsResult.po || []);
      setPinnedPOToReviewLineItemIds(pinnedRowsResult.po_to_review || []);
      setPinnedMRPLineItemIds(pinnedRowsResult.mrp_exception || []);
      setPinnedPOs(pinnedPOListResult.data);
      setPinnedPOsRowCount(pinnedPOListResult.total);
    } catch (err) {
      logger.error('Failed to load pinned state', { error: String(err) });
    }
  }, [userId]);

  useEffect(() => {
    void loadPinnedState();
  }, [loadPinnedState]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!sitesLoaded) {
      return;
    }
    if (selectedSites.length === 0) {
      setPurchaseOrders([]);
      setLineItemRows([]);
      setRowCount(0);
      setPinnedPOs([]);
      setPinnedPOsRowCount(0);
      setLoading(false);
      return;
    }

    const startTime = performance.now();
    const isLineTabRequest = selectedTab === 2 || selectedTab === 3;

    try {
      setLoading(true);
      setError(null);

      if (isLineTabRequest) {
        const lineItemFilters: POFiltersType = {
          page: page + 1,
          page_size: pageSize,
          search: searchInput,
          sort_by: sortModel.sort_by,
          sort_order: sortModel.sort_order,
          include_line_items_only: true,
        };

        if (!isSupplierCollaboration) {
          lineItemFilters.tab_mode = selectedTab === 2 ? 'ready_to_review' : 'mrp_exception';
        } else if (selectedTab === 3) {
          lineItemFilters.tab_mode = 'exceptions_alerts' as any;
        } else if (selectedTab === 2) {
          lineItemFilters.tab_mode = 'action_required' as any;
        }

        if (selectedSites.length > 0 && selectedSites.length < availableSites.length) {
          lineItemFilters.site = selectedSites.join(',');
        }

        if (supplierFilterId) {
          lineItemFilters.supplier_id = supplierFilterId;
        }

        const lineResponse = await purchaseOrderService.getPOList(lineItemFilters);
        const moduleRows = lineResponse.data as unknown as LineItemTabRow[];

        setLineItemRows(moduleRows);
        setPurchaseOrders([]);
        setRowCount(lineResponse.total);

        const resolvedTabName = isSupplierCollaboration
          ? selectedTab === 3
            ? 'exceptions_alerts'
            : 'action_required'
          : selectedTab === 2
            ? 'ready_to_review'
            : 'mrp_exception';

        logger.info('Line item tab data fetched', {
          tab: resolvedTabName,
          durationMs: Math.round(performance.now() - startTime),
          rowCount: lineResponse.total,
        });

        return;
      }

      const filters: POFiltersType = {
        page: page + 1,
        page_size: pageSize,
        status: statusFilter,
        sort_by: sortModel.sort_by,
        sort_order: sortModel.sort_order,
        search: searchInput,
        ...advanceFilters,
      };

      if (selectedSites.length > 0 && selectedSites.length < availableSites.length) {
        filters.site = selectedSites.join(',');
      }

      if (supplierFilterId) {
        filters.supplier_id = supplierFilterId;
      }

      logger.info('Fetching purchase orders', {
        page: filters.page,
        pageSize: filters.page_size,
        status: filters.status,
        search: searchInput,
        advanceFilters: Object.keys(advanceFilters).length,
      });

      const response = await purchaseOrderService.getPOList(filters);
      setPurchaseOrders(response.data);
      setLineItemRows([]);
      setRowCount(response.total);

      logger.info('Purchase orders fetched', {
        durationMs: Math.round(performance.now() - startTime),
        rowCount: response.total,
      });
    } catch (err) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load purchase orders');
      logger.error('Failed to fetch purchase orders', {
        durationMs: Math.round(performance.now() - startTime),
        error: error.response?.data?.detail || error,
      });
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    selectedTab,
    statusFilter,
    sortModel,
    searchInput,
    userId,
    advanceFilters,
    selectedSites,
    sitesLoaded,
    isSupplierCollaboration,
    availableSites.length,
    supplierFilterId,
  ]);

  useEffect(() => {
     fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // const handlePOClick = (po: PurchaseOrder) => {
  //   navigate(`/purchase-orders/${po.id}`);
  // };

  const handleGridRowClick = (row: any) => {
    const moduleQuery = moduleVariant === 'default' ? '' : `?module=${moduleVariant}`;

    if (isLineItemTab) {
      const poId = row.po_id;
      const lineId = row.line_id || row.id;
      if (poId && lineId) {
        navigate(`/purchase-orders/${poId}/line-items/${lineId}${moduleQuery}`);
      }
      return;
    }

    const poId = row.po_id || row.id;

    navigate(`/purchase-orders/${poId}${moduleQuery}`);
  };

  const getCurrentTabActions = useCallback((row?: LineItemTabRow): string[] => {
    const rowStatus = String(row?.line_status || row?.status || '').toUpperCase();
    if (rowStatus.includes('HOLD')) {
      // Suppliers should not be able to unhold or perform actions on held lines
      if (user?.role === 'SUPPLIER') return [];
      return ['UNHOLD'];
    }

    if (isSupplierCollaborationMode) {
      if (selectedTab === 3) {
        return ['PROPOSE_CHANGE', 'RAISE_CONCESSION', 'UPLOAD_DOCUMENT', 'SPLIT', 'ACKNOWLEDGE'];
      }
      if (selectedTab === 2) {
        return ['PROPOSE_CHANGE', 'RAISE_CONCESSION', 'UPLOAD_DOCUMENT', 'SPLIT', 'ACKNOWLEDGE'];
      }
      return ['ACKNOWLEDGE', 'PROPOSE_CHANGE', 'RAISE_CONCESSION', 'UPLOAD_DOCUMENT', 'SPLIT', 'HOLD'];
    }

    if (user?.role !== 'SUPPLIER') {
      if (selectedTab === 3) {
        return ['ACCEPT', 'REJECT'];
      }
      if (selectedTab === 2) {
        return ['ACCEPT', 'REJECT', 'NEED_MORE_INFORMATION'];
      }
    }

    if (moduleVariant === 'cockpit') {
      if (selectedTab === 3) {
        return ['MOVE_IN', 'MOVE_OUT', 'SPLIT', 'HOLD', 'NEED_MORE_INFORMATION'];
      }
      if (selectedTab === 2) {
        return ['ACCEPT', 'REJECT', 'ACKNOWLEDGE', 'NEED_MORE_INFORMATION', 'HOLD'];
      }
      return ['MOVE_IN', 'MOVE_OUT', 'SPLIT', 'HOLD', 'REJECT', 'ACCEPT', 'ACKNOWLEDGE', 'NEED_MORE_INFORMATION'];
    }

    if (user?.role === 'SUPPLIER') {
      return ['PROPOSE_CHANGE', 'RAISE_CONCESSION', 'UPLOAD_DOCUMENT', 'SPLIT', 'ACKNOWLEDGE'];
    }

    return ['MOVE_IN', 'MOVE_OUT', 'SPLIT', 'HOLD', 'REJECT', 'ACCEPT', 'ACKNOWLEDGE', 'NEED_MORE_INFORMATION'];
  }, [isSupplierCollaborationMode, moduleVariant, selectedTab, user?.role]);

  const openActionMenu = useCallback((event: React.MouseEvent<HTMLElement>, row: LineItemTabRow) => {
    event.stopPropagation();
    const rowStatus = String(row?.line_status || row?.status || '').toUpperCase();
    const isHold = rowStatus.includes('HOLD');
    if (isHold && user?.role === 'SUPPLIER') {
      // prevent suppliers from opening the action menu on held rows
      return;
    }

    setSelectedActionRow(row);
    setActionAnchorEl(event.currentTarget);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionAnchorEl(null);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog('NONE');
    setDialogNote('');
    setDialogDate('');
    setSplitRows([{ quantity: '', delivery_date: '' }]);
    setProposeQuantity('');
    setProposeUnitPrice('');
    setProposeDeliveryDate('');
    setConcessionDescription('');
    setUploadFile(null);
    setUploadComments('');
    setSelectedDocumentTag('LINE_ITEM');
  }, []);

  const openDialogForAction = useCallback((action: string) => {
    if (String(action).toUpperCase() === 'UNHOLD' && String(user?.role || '').toUpperCase() === 'SUPPLIER') {
      // prevent suppliers from opening Unhold dialog
      closeActionMenu();
      return;
    }
    closeActionMenu();
    setDialogNote('');
    if (action === 'PROPOSE_CHANGE') {
      setProposeQuantity(String(selectedActionRow?.quantity ?? ''));
      setProposeUnitPrice(String(selectedActionRow?.unit_price ?? ''));
      setProposeDeliveryDate(String(selectedActionRow?.required_in_house_date ?? ''));
      setActiveDialog('PROPOSE_CHANGE');
      return;
    }
    if (action === 'RAISE_CONCESSION') {
      setActiveDialog('RAISE_CONCESSION');
      return;
    }
    if (action === 'UPLOAD_DOCUMENT') {
      setActiveDialog('UPLOAD_DOCUMENT');
      return;
    }
    if (action === 'MOVE_IN') {
      setActiveDialog('MOVE_IN');
      return;
    }
    if (action === 'MOVE_OUT') {
      setActiveDialog('MOVE_OUT');
      return;
    }
    if (action === 'SPLIT') {
      setActiveDialog('SPLIT');
      return;
    }
    setActiveDialog(action as DialogType);
  }, [closeActionMenu, selectedActionRow, user?.role]);

  const resolveActionLineId = useCallback(async (row: LineItemTabRow): Promise<string | null> => {
    const existingLineId = String(row.line_id || row.id || '').trim();
    if (existingLineId) {
      return existingLineId;
    }

    const poId = String(row.po_id || row.id || '').trim();
    if (!poId) {
      return null;
    }

    const po = await purchaseOrderService.getPOById(poId);
    const firstLine = po.line_items?.[0];
    if (!firstLine) {
      return null;
    }

    return String(firstLine.id || String(firstLine.line_number).padStart(5, '0'));
  }, []);

  const executeRowAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!selectedActionRow) {
        return;
      }

      const poId = String(selectedActionRow.po_id || selectedActionRow.id || '').trim();
      if (!poId) {
        setError('Cannot resolve PO for selected row');
        return;
      }

      const lineItemId = await resolveActionLineId(selectedActionRow);
      if (!lineItemId) {
        setError('Cannot resolve line item for selected row');
        return;
      }

      await purchaseOrderService.performPOAction(poId, {
        action,
        line_item_id: lineItemId,
        ...payload,
      } as any);

      await fetchPurchaseOrders();
      closeDialog();
    },
    [selectedActionRow, resolveActionLineId, fetchPurchaseOrders, closeDialog]
  );

  const submitSimpleAction = useCallback(async (action: 'HOLD' | 'UNHOLD' | 'ACCEPT' | 'ACKNOWLEDGE' | 'REJECT' | 'NEED_MORE_INFORMATION') => {
    try {
      setError(null);
      await executeRowAction(action, { notes: dialogNote });
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to submit ${action}`);
    }
  }, [dialogNote, executeRowAction]);

  const submitMoveAction = useCallback(async (action: 'MOVE_IN' | 'MOVE_OUT') => {
    try {
      setError(null);
      if (!dialogDate) {
        setError(`${ACTION_LABELS[action]} date is required`);
        return;
      }
      const payload = action === 'MOVE_IN' ? { notes: dialogNote, move_in_date: dialogDate } : { notes: dialogNote, move_out_date: dialogDate };
      await executeRowAction(action, payload);
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to submit ${action}`);
    }
  }, [dialogDate, dialogNote, executeRowAction]);

  const submitSplitAction = useCallback(async () => {
    try {
      setError(null);
      const splits = splitRows
        .filter((row) => row.quantity && row.delivery_date)
        .map((row) => ({ quantity: Number(row.quantity), delivery_date: row.delivery_date }));

      if (splits.length === 0) {
        setError('At least one split row with quantity and delivery date is required');
        return;
      }

      await executeRowAction('SPLIT', { notes: dialogNote, splits });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit SPLIT');
    }
  }, [dialogNote, splitRows, executeRowAction]);

  const submitProposeChange = useCallback(async () => {
    try {
      setError(null);
      await executeRowAction('PROPOSE_CHANGE', {
        notes: dialogNote,
        proposed_quantity: proposeQuantity ? Number(proposeQuantity) : null,
        proposed_unit_price: proposeUnitPrice ? Number(proposeUnitPrice) : null,
        proposed_delivery_date: proposeDeliveryDate || null,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit PROPOSE_CHANGE');
    }
  }, [dialogNote, proposeQuantity, proposeUnitPrice, proposeDeliveryDate, executeRowAction]);

  const submitConcession = useCallback(async () => {
    try {
      setError(null);
      const payload: Record<string, unknown> = {
        notes: dialogNote,
        concession_reason: dialogNote,
        concession_description: concessionDescription,
      };

      if (uploadFile && selectedActionRow) {
        const poId = String(selectedActionRow.po_id || selectedActionRow.id || '').trim();
        const lineItemId = await resolveActionLineId(selectedActionRow);

        if (!poId || !lineItemId) {
          setError('Cannot resolve PO line for concession upload');
          return;
        }

        const uploaded = await purchaseOrderService.uploadPODocument(poId, {
          line_item_id: lineItemId,
          file: uploadFile,
          document_tag_to: selectedDocumentTag || 'CONCESSION',
          comments: concessionDescription || 'Concession request attachment',
        });

        const uploadedDocumentId = (uploaded as { id?: string }).id;
        if (uploadedDocumentId) {
          payload.document_id = uploadedDocumentId;
        }
      }

      await executeRowAction('RAISE_CONCESSION', payload);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit RAISE_CONCESSION');
    }
  }, [dialogNote, concessionDescription, executeRowAction, uploadFile, selectedActionRow, resolveActionLineId, selectedDocumentTag]);

  const submitUploadDocument = useCallback(async () => {
    try {
      setError(null);
      if (!uploadFile || !selectedActionRow) {
        setError('Please choose a file before upload');
        return;
      }

      const poId = String(selectedActionRow.po_id || selectedActionRow.id || '').trim();
      const lineItemId = await resolveActionLineId(selectedActionRow);

      if (!poId || !lineItemId) {
        setError('Cannot resolve PO line for upload');
        return;
      }

      await purchaseOrderService.uploadPODocument(poId, {
        line_item_id: lineItemId,
        file: uploadFile,
        document_tag_to: selectedDocumentTag || 'LINE_ITEM',
        comments: uploadComments,
      });

      await fetchPurchaseOrders();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to upload document');
    }
  }, [uploadFile, uploadComments, selectedActionRow, resolveActionLineId, fetchPurchaseOrders, closeDialog, selectedDocumentTag]);

  const appliedFilters = [
    advanceFilters.po_number && {
      key: 'po_number',
      label: `PO: ${advanceFilters.po_number}`,
    },

    advanceFilters.supplier_name && {
      key: 'supplier_name',
      label: `Supplier: ${advanceFilters.supplier_name}`,
    },

    advanceFilters.source_system && {
      key: 'source_system',
      label: `Source: ${advanceFilters.source_system}`,
    },

    advanceFilters.total_value_from !== undefined && {
      key: 'total_value_from',
      label: `Value ≥ ${advanceFilters.total_value_from}`,
    },

    advanceFilters.total_value_to !== undefined && {
      key: 'total_value_to',
      label: `Value ≤ ${advanceFilters.total_value_to}`,
    },

    advanceFilters.delivery_date_from && {
      key: 'delivery_date_from',
      label: `Delivery From ${advanceFilters.delivery_date_from}`,
    },

    advanceFilters.delivery_date_to && {
      key: 'delivery_date_to',
      label: `Delivery To ${advanceFilters.delivery_date_to}`,
    },

    advanceFilters.items_from !== undefined && {
      key: 'items_from',
      label: `Items ≥ ${advanceFilters.items_from}`,
    },

    advanceFilters.items_to !== undefined && {
      key: 'items_to',
      label: `Items ≤ ${advanceFilters.items_to}`,
    },

    advanceFilters.mrp_exceptions && {
      key: 'mrp_exceptions',
      label: `MRP: ${advanceFilters.mrp_exceptions}`,
    },
  ].filter(Boolean) as {
    key: keyof AdvanceFilters;
    label: string;
  }[];

  // For DataGrid pagination
  const handlePaginationModelChange = (model: { page: number; pageSize: number }) => {
    setSelectedRowIds([]);
    if (model.pageSize !== pageSize) {
      setPageSize(model.pageSize);
      setPage(0);
    } else {
      setPage(model.page);
    }
  };

const handleSearchChange = useCallback(
  (value: string) => {
    if (value === searchInput) {
      return;
    }
    setSearchInput(value);
    setPage(0);
  },
  [searchInput, setPage]
);

  const handleAdvanceFilterChange = <K extends keyof AdvanceFilters>(
    key: K,
    value: AdvanceFilters[K]
  ) => {
    setAdvanceTempfilters((prev) => {
      const updated = {
        ...prev,
        [key]: value,
      };

      return updated;
    });
  };

  const handleClearAdvanceFilters = () => {
    setAdvanceTempfilters({});
    setAdvancefilters({});
    // advanceFiltersRef.current = {};
  };

  const handleApplyAdvanceFilters = () => {
    // TODO: Apply filters to the purchase orders list
    // console.log('Applying filters:', advanceTempFilters);
    setPage(0);
    setAdvancefilters({ ...advanceTempFilters });
    setShowAdvancedFilters(false);
  };

  const statusColors = React.useMemo(
    () =>
      ({
        CREATED: 'default',
        APPROVED: 'info',
        SENT_TO_SUPPLIER: 'primary',
        IN_TRANSIT: 'warning',
        DELIVERED: 'success',
        CANCELLED: 'error',
        IN_PROGRESS: 'warning',
      }) as Record<
        PurchaseOrderStatus,
        'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
      >,
    []
  );
  // console.log('role:', user?.role);

  //format currency
  const formatCurrency = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '--';

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) return '--';

    return `$${numericValue.toLocaleString()}`;
  };

  const formatDateSafe = (value: unknown) => {
    if (!value) {
      return '--';
    }

    const parsedDate = new Date(String(value));

    if (Number.isNaN(parsedDate.getTime())) {
      return '--';
    }

    return format(parsedDate, 'MMM, dd yyyy');
  };

  const hasCellValue = (value: unknown) =>
  value !== null && value !== undefined && value !== '';

  const renderNeedByDateCell = useCallback(
    (value: unknown) => {
      const dateValue = value ? String(value) : '';
      if (!dateValue) {
        return '--';
      }

      if (!shouldHighlightNeedByDate) {
        return dateValue;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threshold = new Date(today);
      threshold.setDate(today.getDate() + 30);

      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) {
        return dateValue;
      }

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
        <Box
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 0,
            color: '#FFFFFF',
            fontWeight: 600,
            backgroundColor,
            display: 'inline-block',
          }}
        >
          {dateValue}
        </Box>
      );
    },
    [shouldHighlightNeedByDate]
  );

  // DataGrid columns
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'pin',
        headerName: 'Pin',
        width: 40,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title={pinnedPOIds.includes(params.row.id) ? 'Unpin' : 'Pin'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(params.row.id);
              }}
              sx={{
                color: pinnedPOIds.includes(params.row.id) ? 'primary.main' : 'action.disabled',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {pinnedPOIds.includes(params.row.id) ? (
                <PushPinIcon sx={{ fontSize: '1.25rem' }} />
              ) : (
                <PushPinOutlinedIcon sx={{ fontSize: '1.25rem' }} />
              )}
            </IconButton>
          </Tooltip>
        ),
      },
      {
        field: 'po_number',
        headerName: 'PO Number',
        width: 100,

        renderCell: (params) => (
          <Typography
            fontWeight="bold"
            height={'100%'}
            alignContent={'center'}
            fontSize={'0.8rem'}
            color={theme.palette.primary.light}
          >
            {params.value}
          </Typography>
        ),
        sx: {
          '&:hover': {
            color: theme.palette.primary.main,
            borderRadius: 0,
          },
        },
      },
      {
        field: 'revision_changes',
        headerName: 'Revision Changes',
        width: 80,
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
            Revision Changes
          </Typography>
        ),
      },
      {
        field: 'line_items',
        headerName: 'Line Items',
        width: 60,
        renderCell: (params) => params.value.length,
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
            Line Items
          </Typography>
        ),
      },
      {
        field: 'supplier_id',
        headerName: 'Supplier Number',
        width: 140,
      },
      ...(user?.role !== 'SUPPLIER'
        ? [
            {
              field: 'supplier_name',
              headerName: 'Supplier',
              width: 200,
            },
          ]
        : []),
      {
        field: 'total_value',
        headerName: 'Total Value',
        width: 110,
        renderCell: (params) => (
          <Typography height={'100%'} alignContent={'center'} fontSize={'0.8rem'}>
            {params.row.currency} {params.value.toLocaleString()}
          </Typography>
        ),
      },
      {
        field: 'delivery_date',
        headerName: 'Need by Date',
        width: 120,
        renderCell: (params) => formatDateSafe(params.value),
      },

      {
        field: 'site',
        headerName: 'Flowserve site',
        width: 120,
      },

      {
        field: 'status',
        headerName: 'Status',
        width: 100,
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
        width: 80,
      },

      ...(user?.role === 'SUPPLIER'
        ? [
            {
              field: 'supplier_name',
              headerName: 'Supplier',
              width: 150,
            },
          ]
        : []),
      // {
      //   field: 'supplier_email',
      //   headerName: 'Supplier Email',
      //   width: 180,
      // },

      // {
      //   field: 'mrp_exceptions',
      //   headerName: 'MRP Exceptions',
      //   width: 150,
      //   renderCell: (params) => (
      //     <Chip
      //       variant="filled"
      //       label={params.value.replace(/_/g, ' ')}
      //       color={params.value === 'NONE' ? 'success' : 'error'}
      //       size="small"
      //     />
      //   ),
      // },

      ...(user?.role === 'SUPPLIER'
        ? [
            {
              field: 'buyer_name',
              headerName: 'Buyer Name',
              width: 150,
            },
            {
              field: 'buyer_email',
              headerName: 'Buyer Email',
              width: 160,
            },
            {
              field: 'buyer_phone',
              headerName: 'Buyer Phone No',
              width: 140,
            },
          ]
        : []),
      ...(user?.role === 'SUPPLIER'
        ? [
            {
              field: 'site',
              headerName: 'Site',
              width: 70,
            },
          ]
        : []),
      // {
      //   field: 'action',
      //   headerName: 'Action',
      //   width: 70,
      //   sortable: false,
      //   filterable: false,
      //   renderCell: (params) => (
      //     <IconButton
      //       size="small"
      //       onClick={(event) => openActionMenu(event, params.row as LineItemTabRow)}
      //     >
      //       <MoreVertIcon fontSize="small" />
      //     </IconButton>
      //   ),
      // },
    ],
    [theme, pinnedPOIds, togglePin, statusColors, user?.role]
  );

  // console.log(columns.map((c) => c.field));

  const poToReviewColumns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'pin',
        headerName: 'Pin',
        width: 40,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const lineItemRowId = params.row.id;
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
        headerName: 'Update Unite Price',
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
            Update Unit Price
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
        headerName: 'Updated Total',
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
            Updated Total
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
          const isHold = String((row?.line_status || row?.status || '')).toUpperCase().includes('HOLD');
          if (isHold && user?.role === 'SUPPLIER') {
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
    [pinnedPOToReviewLineItemIds, togglePOToReviewLinePin, theme, statusColors, openActionMenu]
  );

  const supplierActionRequiredColumns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'pin',
        headerName: 'Pin',
        width: 40,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const lineItemRowId = params.row.id;
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
        width: 105,
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
        width: 80,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'schedule_line',
        headerName: 'Schedule line',
        width: 80,
        renderCell: (params) => {
          const scheduleLine =
            params.row.schedule_line ?? params.row.po_line_revision_no ?? params.row.line_number;

          return scheduleLine ?? '--';
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
        width: 140,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'unit',
        headerName: 'UOM',
        width: 65,
        renderCell: (params) => params.value || '--',
      },
      {
        field: 'quantity',
        headerName: 'Qty',
        width: 65,
        renderCell: (params) => params.value ?? '--',
      },
      {
        field: 'updated_quantity',
        headerName: 'Revised Qty',
        width: 130,
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
        width: 105,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'updated_unit_price',
        headerName: 'Revised Unit Price',
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
        width: 110,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'updated_net_value',
        headerName: 'Revised Total Amount',
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
              Revised Total Amount
            </Typography>
          ),
      },
      {
        field: 'required_in_house_date',
        headerName: 'Need by Date',
        width: 120,
        renderCell: (params) => params.value || '--',
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
        field: 'line_status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => {
          const lineStatus = String((params.row as LineItemTabRow).line_status || params.value || '');
          return (
            <Chip
              variant="outlined"
              label={lineStatus ? lineStatus.replace(/_/g, ' ') : '--'}
              color={statusColors[lineStatus as PurchaseOrderStatus] || 'warning'}
              size="small"
            />
          );
        },
      },
      {
        field: 'action',
        headerName: 'Action',
        width: 70,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as LineItemTabRow;
          const isHold = String((row?.line_status || row?.status || '')).toUpperCase().includes('HOLD');
          if (isHold && user?.role === 'SUPPLIER') {
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
    [pinnedPOToReviewLineItemIds, togglePOToReviewLinePin, theme, statusColors, openActionMenu]
  );

  const supplierExceptionsAlertsColumns: GridColDef[] = React.useMemo(
    () =>
      supplierActionRequiredColumns.map((column) => {
        if (column.field === 'required_in_house_date') {
          return {
            ...column,
            headerName: 'Need by Date',
            renderCell: (params: any) => renderNeedByDateCell(params.value),
          };
        }

        if (column.field === 'updated_delivery_date') {
          return {
            ...column,
            headerName: 'Revised Date',
            renderCell: (params: any) => renderNeedByDateCell(params.value),
          };
        }

        return column;
      }),
    [supplierActionRequiredColumns, renderNeedByDateCell]
  );

  //MRP exception coulumns
 const mrpExceptionColumns: GridColDef[] = React.useMemo(
   () => [
     {
       field: 'pin',
       headerName: 'Pin',
       width: 40,
       sortable: false,
       filterable: false,
       renderCell: (params) => {
         const lineItemRowId = params.row.id;
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
       field: 'documents',
       headerName: 'Documents',
       width: 100,
       sortable: false,
       filterable: false,
       renderCell: (params) => {
         const docs = params.value as unknown;
         const hasDocs = Array.isArray(docs) ? docs.length > 0 : Boolean(docs);

         return hasDocs ? <AttachFileIcon fontSize="small" color="action" /> : '--';
       },
     },
     {
       field: 'action',
       headerName: 'Action',
       width: 75,
       sortable: false,
       filterable: false,
      renderCell: (params) => {
        const row = params.row as LineItemTabRow;
        const isHold = String((row?.line_status || row?.status || '')).toUpperCase().includes('HOLD');
        if (isHold && user?.role === 'SUPPLIER') {
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
   ]
 );

  //saperate page view for supplier & PS
  const supplierColumns = React.useMemo(() => {
    const map = new Map(columns.map((col) => [col.field, col]));
    const orderedFields = [
      'pin',
      'po_number',
      'supplier_name',
      'total_value',
      'line_items',
      'revision_changes',
      'buyer_name',
      'buyer_email',
      'buyer_phone',
      'site',
      'status',
    ];

    return orderedFields
      .map((field) => {
        const column = map.get(field);
        if (!column) {
          return null;
        }

        if (field === 'supplier_name') {
          return { ...column, headerName: 'Supplier Name' };
        }
        if (field === 'revision_changes') {
          return { ...column, headerName: 'Rev', width: 90 };
        }
        if (field === 'buyer_email') {
          return { ...column, headerName: 'Buyer Email Id' };
        }

        return column;
      })
      .filter((value): value is GridColDef => value !== null);
  }, [columns]);

  const gridColumns = React.useMemo(
    () => (user?.role === 'SUPPLIER' ? supplierColumns : columns),
    [user?.role, supplierColumns, columns]
  );

  const currentColumns = React.useMemo(() => {
    if (isSupplierCollaboration) {
      switch (selectedTab) {
        case 2: // ACTION REQUIRED
          return supplierActionRequiredColumns;

        case 3: // EXCEPTIONS & ALERTS
          return supplierExceptionsAlertsColumns;
        // temporary, we'll replace in next step

        default:
          return gridColumns;
      }
    }

    switch (selectedTab) {
      case 2: // PO TO REVIEW
        return poToReviewColumns;

      case 3: // MRP EXCEPTION
        return mrpExceptionColumns;

      default:
        return gridColumns;
    }
  }, [
    isSupplierCollaboration,
    selectedTab,
    supplierActionRequiredColumns,
    supplierExceptionsAlertsColumns,
    poToReviewColumns,
    mrpExceptionColumns,
    gridColumns,

  ]);

  const displayedRows = React.useMemo(() => {
    const rows = pinFilter === 'pinned' ? pinnedPOs : purchaseOrders;

    switch (selectedTab) {
      case 1: // OPEN PO
        return rows.filter(
          (po) => po.status === 'CREATED' || po.status === 'IN_PROGRESS' || po.status === 'APPROVED'
        );

      case 2: // PASS DELIVERY DATE
        return rows;

      case 0: // ALL PO
      default:
        return rows;
    }
  }, [selectedTab, pinFilter, purchaseOrders, pinnedPOs]);

  const currentRows = React.useMemo(() => {
    switch (selectedTab) {
      case 2: {
        return currentPinFilter === 'pinned'
          ? lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(row.id))
          : lineItemRows;
      }

      case 3: {
        if (isSupplierCollaboration) {
          return currentPinFilter === 'pinned'
            ? lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(row.id))
            : lineItemRows;
        }

        return currentPinFilter === 'pinned'
          ? lineItemRows.filter((row) => pinnedMRPLineItemIds.includes(row.id))
          : lineItemRows;
      }

      default:
        return displayedRows;
    }
  }, [
    selectedTab,
    lineItemRows,
    displayedRows,
    currentPinFilter,
    pinnedPOToReviewLineItemIds,
    pinnedMRPLineItemIds,
  ]);

  const currentPinnedCount = React.useMemo(() => {
    switch (selectedTab) {
      case 2: {
        // PO TO REVIEW / Supplier ACTION REQUIRED
        return lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(row.id)).length;
      }

      case 3: {
        // Supplier EXCEPTIONS & ALERTS currently uses same supplier pin bucket
        if (isSupplierCollaboration) {
          return lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(row.id)).length;
        }

        // PS MRP EXCEPTION
        return lineItemRows.filter((row) => pinnedMRPLineItemIds.includes(row.id)).length;
      }

      case 0:
      default:
        return pinnedPOIds.length;
    }
  }, [
    selectedTab,
    isSupplierCollaboration,
    lineItemRows,
    pinnedPOIds.length,
    pinnedPOToReviewLineItemIds,
    pinnedMRPLineItemIds,
  ]);

  const showHeaderAcceptAction = selectedTab !== 0 && getCurrentTabActions().includes('ACCEPT');

  const handleBulkAccept = useCallback(async () => {
    if (selectedRowIds.length === 0) {
      return;
    }

    const selectedRows = currentRows.filter((row) => selectedRowIds.includes(String(row.id)));
    const byPo = selectedRows.reduce<Record<string, string[]>>((acc, row) => {
      const poId = String((row as LineItemTabRow).po_id || '').trim();
      const lineId = String(((row as LineItemTabRow).line_id || '').toString()).trim();

      if (!poId || !lineId) {
        return acc;
      }

      if (!acc[poId]) {
        acc[poId] = [];
      }
      acc[poId]?.push(lineId);
      return acc;
    }, {});

    const entries = Object.entries(byPo).filter(([, lineIds]) => lineIds.length > 0);
    if (entries.length === 0) {
      setError('Select at least one valid line row before accepting.');
      return;
    }

    try {
      setBulkAcceptLoading(true);
      setError(null);

      await Promise.all(
        entries.map(async ([poId, lineIds]) => {
          await purchaseOrderService.performPOAction(poId, {
            action: 'ACCEPT',
            line_item_ids: lineIds,
            notes: bulkAcceptNote,
          });
        })
      );

      setBulkAcceptOpen(false);
      setBulkAcceptNote('');
      setSelectedRowIds([]);
      await fetchPurchaseOrders();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit bulk ACCEPT action');
    } finally {
      setBulkAcceptLoading(false);
    }
  }, [selectedRowIds, currentRows, bulkAcceptNote, fetchPurchaseOrders]);

  const handleSelectedSitesChange = useCallback(
    (sites: string[]) => {
      setSelectedSites(sites);
      setPage(0);
    },
    [setPage]
  );

  const ToolbarComponent = React.useCallback(
    () => (
      <>
        <POFilters
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          sortOrder={sortModel.sort_order}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onFiltersClick={() => setShowAdvancedFilters(true)}
          pinFilter={currentPinFilter}
          onPinFilterChange={handleCurrentPinFilterChange}
          pinnedCount={currentPinnedCount}
          availableSites={availableSites}
          selectedSites={selectedSites}
          onSelectedSitesChange={handleSelectedSitesChange}
          userRole={user?.role}
          selectedTab={selectedTab}
          tabs={moduleTabs}
          onTabChange={(tab) => {
            setSelectedTab(tab);
            setPage(0);
            setSelectedRowIds([]);
          }}
        />

        <Box height={appliedFilters.length > 0 ? '4vh' : '0vh'} sx={{ mb: 0, pl: 1 }}>
          {appliedFilters.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {appliedFilters.map((filter) => (
                <Chip
                  key={filter.key}
                  label={filter.label}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={() => {
                    const updated = { ...advanceFilters };
                    delete updated[filter.key];
                    setAdvancefilters(updated);
                    setAdvanceTempfilters(updated);
                  }}
                />
              ))}

              <Chip
                size="small"
                label="Clear All"
                color="error"
                onClick={() => {
                  setAdvancefilters({});
                  setAdvanceTempfilters({});
                }}
              />
            </Stack>
          )}
        </Box>
      </>
    ),
    [
      searchInput,
      handleSearchChange,
      statusFilter,
      sortModel.sort_order,
      viewMode,
      handleCurrentPinFilterChange,
      availableSites,
      selectedSites,
      handleSelectedSitesChange,
      currentPinFilter,
      currentPinnedCount,
      user?.role,
      selectedTab,
      appliedFilters,
      advanceFilters,
      setPage,
      moduleTabs,
    ]
  );

  const dataGridSortModel = React.useMemo<GridSortModel>(() => {
    if (!sortModel.sort_by || !sortModel.sort_order) {
      return [];
    }

    return [
      {
        field: sortModel.sort_by,
        sort: sortModel.sort_order,
      },
    ];
  }, [sortModel.sort_by, sortModel.sort_order]);
  
  //saperate page view for supplier & PS
  // const supplierColumns = React.useMemo(
  //   () =>
  //     columns.filter((col) =>
  //       [
  //         'pin',
  //         'po_number',
  //         'status',
  //         'supplier_name',
  //         'total_value',
  //         'line_items',
  //         'revision_changes',
  //         'buyer_name',
  //         'buyer_email',
  //         'buyer_phone',
  //         'site',
  //       ].includes(col.field)
  //     ),
  //   [columns]
  // );

  // const gridColumns = React.useMemo(
  //   () => (user?.role === 'SUPPLIER' ? supplierColumns : columns),
  //   [user?.role, supplierColumns, columns]
  // );

  // const displayedRows = React.useMemo(() => {
  //   const rows = pinFilter === 'pinned' ? pinnedPOs : purchaseOrders;

  //   switch (selectedTab) {
  //     case 1: // OPEN PO
  //       return rows.filter(
  //         (po) => po.status === 'CREATED' || po.status === 'IN_PROGRESS' || po.status === 'APPROVED'
  //       );

  //     case 2: // PASS DELIVERY DATE
  //       return rows;

  //     case 0: // ALL PO
  //     default:
  //       return rows;
  //   }
  // }, [selectedTab, pinFilter, purchaseOrders, pinnedPOs]);

  if (loading && purchaseOrders.length === 0) {
    return <LoadingSpinner message="Loading purchase orders..." />;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 0,
          p: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            sx={{
              color: '#0B4F88',
              fontSize: '1.50rem',
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            {MODULE_TITLE[moduleVariant]}
          </Typography>
        </Box>

        {showHeaderAcceptAction && (
          <Button
            size="medium"
            variant="contained"
            startIcon={<CheckCircleOutlineIcon fontSize="small" />}
            disabled={selectedRowIds.length === 0}
            onClick={() => {
              if (selectedRowIds.length === 0) {
                return;
              }
              setBulkAcceptOpen(true);
            }}
            sx={{
              borderColor: '#0B4F88',
              color: '#fff',
              fontWeight: 600,
              borderRadius: 0.5,
              px: 1.25,
            }}
          >
            Accept
          </Button>
        )}
      </Box>

      <Typography
        sx={{
          color: 'black',
          fontSize: '1rem',
          fontWeight: 400,
          mb: 2,
        }}
      >
        Updated on {new Date().toLocaleString()}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* TODO: Optimise this block if selected */}
      <Box sx={{ height: appliedFilters.length > 0 ? '78vh' : '80vh', width: '100%' }}>
        <DataGrid
          key={`po-grid-${selectedTab}`}
          rows={currentRows}
          columns={currentColumns}
          rowCount={
            isLineItemTab
              ? currentPinFilter === 'pinned'
                ? currentRows.length
                : rowCount
              : selectedTab === 1
                ? displayedRows.length
                : currentPinFilter === 'pinned'
                  ? pinnedPOsRowCount
                  : rowCount
          }
          rowHeight={35}
          pagination
          paginationMode="server"
          pageSizeOptions={[10, 25, 50, 60, 100]}
          loading={loading}
          onPaginationModelChange={handlePaginationModelChange}
          paginationModel={{ page, pageSize }}
          getRowId={(row) => row.id}
          checkboxSelection
          rowSelectionModel={selectedRowIds}
          onRowSelectionModelChange={(model) => setSelectedRowIds(model)}
          disableRowSelectionOnClick={!isLineItemTab}
          sortingMode="server"
          sortingOrder={['asc', 'desc', null]}
          sortModel={dataGridSortModel}
          onSortModelChange={(model) => {
            const nextSort = model[0];

            // Third click/default clear case
            if (!nextSort?.field || !nextSort.sort) {
              setSortModel({
                sort_by: undefined,
                sort_order: 'asc',
              });

              setPage(0);
              return;
            }

            setSortModel({
              sort_by: nextSort.field,
              sort_order: nextSort.sort as 'asc' | 'desc',
            });

            setPage(0);
          }}
          onRowClick={(params) => {
            handleGridRowClick(params.row);
          }}
          localeText={{
            noRowsLabel: isLineItemTab
              ? 'No matching line items found'
              : selectedSites.length === 0
                ? 'No sites selected'
                : 'No purchase orders found',
          }}
          sx={{
            borderRadius: 0,
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#F8EFE7',
              },
              fontSize: '0.8rem',
            },

            '& .MuiDataGrid-cell': {
              borderRadius: 0,
            },

            '& .MuiDataGrid-columnHeader': {
              borderRadius: 0,
            },

            '& .MuiDataGrid-toolbarContainer': {
              justifyContent: 'flex-end',
              width: '100%',
              borderRadius: 0,
            },

            '& .changed-cell': {
              color: theme.palette.primary.light,
              fontWeight: 700,
            },
          }}
          slots={{
            toolbar: ToolbarComponent,
          }}
        />
      </Box>
      {/* Advanced Filters Dialog */}
      <Dialog
        open={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            // position: 'absolute',
            // top: '25%',
            // left: '68%',
            // transform: 'translate(-50%, -20%)',
            // borderRadius: 1,
            // boxShadow: 24,
          },
        }}
      >
        <DialogTitle>Advanced Filters</DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* PO Number */}
            <Grid item xs={12} md={6}>
              <TextField
                label="PO Number"
                fullWidth
                size="small"
                value={advanceTempFilters.po_number || ''}
                onChange={(e) => handleAdvanceFilterChange('po_number', e.target.value)}
                InputProps={{
                  endAdornment: advanceTempFilters.po_number ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleAdvanceFilterChange('po_number', undefined)}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            </Grid>

            {/* Supplier */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Supplier Name"
                fullWidth
                size="small"
                value={advanceTempFilters.supplier_name || ''}
                onChange={(e) => handleAdvanceFilterChange('supplier_name', e.target.value)}
              />
            </Grid>

            {/* Source */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Source System</InputLabel>

                <Select
                  label="Source System"
                  value={advanceTempFilters.source_system || ''}
                  onChange={(e) =>
                    handleAdvanceFilterChange('source_system', e.target.value || undefined)
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="SAP">SAP</MenuItem>
                  <MenuItem value="Oracle">Oracle</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* MRP */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>MRP Exceptions</InputLabel>

                <Select
                  label="MRP Exceptions"
                  value={advanceTempFilters.mrp_exceptions || ''}
                  onChange={(e) =>
                    handleAdvanceFilterChange('mrp_exceptions', e.target.value || undefined)
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Value Range */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Total Value From"
                type="number"
                fullWidth
                size="small"
                value={advanceTempFilters.total_value_from || ''}
                onChange={(e) =>
                  handleAdvanceFilterChange(
                    'total_value_from',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Total Value To"
                type="number"
                fullWidth
                size="small"
                value={advanceTempFilters.total_value_to || ''}
                onChange={(e) =>
                  handleAdvanceFilterChange(
                    'total_value_to',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </Grid>

            {/* Delivery Date Range */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Delivery From"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={advanceTempFilters.delivery_date_from || ''}
                onChange={(e) => handleAdvanceFilterChange('delivery_date_from', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Delivery To"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={advanceTempFilters.delivery_date_to || ''}
                onChange={(e) => handleAdvanceFilterChange('delivery_date_to', e.target.value)}
              />
            </Grid>

            {/* Items Range */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Items From"
                type="number"
                fullWidth
                size="small"
                value={advanceTempFilters.items_from || ''}
                onChange={(e) =>
                  handleAdvanceFilterChange(
                    'items_from',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Items To"
                type="number"
                fullWidth
                size="small"
                value={advanceTempFilters.items_to || ''}
                onChange={(e) =>
                  handleAdvanceFilterChange(
                    'items_to',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: 'space-between',
            px: 3,
            py: 2,
          }}
        >
          <Button color="error" variant="outlined" onClick={handleClearAdvanceFilters}>
            Clear All
          </Button>

          <Box>
            <Button sx={{ mr: 1 }} onClick={() => setShowAdvancedFilters(false)}>
              Cancel
            </Button>

            <Button variant="contained" onClick={handleApplyAdvanceFilters}>
              Apply Filters
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={actionAnchorEl} open={Boolean(actionAnchorEl)} onClose={closeActionMenu}>
        {(() => {
          const actions = getCurrentTabActions(selectedActionRow || undefined) || [];
          const filtered = actions.filter((a) => {
            if (String(a).toUpperCase() === 'UNHOLD' && String(user?.role || '').toUpperCase() === 'SUPPLIER') {
              return false;
            }
            return true;
          });

          return filtered.map((action) => (
            <ActionMenuItem key={action} onClick={() => openDialogForAction(action)}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                {ACTION_ICONS[action] || <InfoOutlinedIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText
                primary={ACTION_LABELS[action] || action}
                primaryTypographyProps={{ fontSize: 12 }}
              />
            </ActionMenuItem>
          ));
        })()}
      </Menu>

      <Dialog
        open={bulkAcceptOpen}
        onClose={() => setBulkAcceptOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Accept Selected Lines</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You are about to accept {selectedRowIds.length} selected line(s).
          </Typography>
          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={3}
            value={bulkAcceptNote}
            onChange={(e) => setBulkAcceptNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBulkAcceptOpen(false)}
            disabled={bulkAcceptLoading}
            sx={{ borderRadius: 0.75 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleBulkAccept()}
            disabled={bulkAcceptLoading || selectedRowIds.length === 0}
            sx={{ borderRadius: 0.75 }}
          >
            {bulkAcceptLoading ? 'Submitting...' : 'Accept'}
          </Button>
        </DialogActions>
      </Dialog>

      <MoveDateDialog
        open={activeDialog === 'MOVE_IN'}
        mode="MOVE_IN"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        currentDate={String(selectedActionRow?.required_in_house_date || '')}
        date={dialogDate}
        onDateChange={setDialogDate}
        onClose={closeDialog}
        onSubmit={() => void submitMoveAction('MOVE_IN')}
      />

      <MoveDateDialog
        open={activeDialog === 'MOVE_OUT'}
        mode="MOVE_OUT"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        currentDate={String(selectedActionRow?.shipment_date || '')}
        date={dialogDate}
        onDateChange={setDialogDate}
        onClose={closeDialog}
        onSubmit={() => void submitMoveAction('MOVE_OUT')}
      />

      <SplitDialog
        open={activeDialog === 'SPLIT'}
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        rows={splitRows}
        note={dialogNote}
        onChangeRows={setSplitRows}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSplitAction()}
      />

      <SimpleInfoDialog
        open={activeDialog === 'HOLD'}
        title="Hold"
        submitLabel="Submit Hold Request"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        deliveryDate={String(selectedActionRow?.required_in_house_date || '')}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('HOLD')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'UNHOLD'}
        title="Unhold"
        submitLabel="Submit Unhold Request"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        deliveryDate={String(selectedActionRow?.required_in_house_date || '')}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('UNHOLD')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'ACCEPT'}
        title="Accept"
        submitLabel="Submit Acceptance"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        deliveryDate={String(selectedActionRow?.required_in_house_date || '')}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('ACCEPT')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'ACKNOWLEDGE'}
        title="Acknowledge"
        submitLabel="Submit Acknowledgement"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        deliveryDate={String(selectedActionRow?.required_in_house_date || '')}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('ACKNOWLEDGE')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'REJECT'}
        title="Reject"
        submitLabel="Submit Rejection"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        deliveryDate={String(selectedActionRow?.required_in_house_date || '')}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('REJECT')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'NEED_MORE_INFORMATION'}
        title="Need More Information"
        submitLabel="Submit Info Request"
        poNumber={String(selectedActionRow?.po_number || '')}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={Number(selectedActionRow?.quantity || 0)}
        deliveryDate={String(selectedActionRow?.required_in_house_date || '')}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('NEED_MORE_INFORMATION')}
      />

      <ProposeChangeDialog
        open={activeDialog === 'PROPOSE_CHANGE'}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        quantity={proposeQuantity}
        unitPrice={proposeUnitPrice}
        deliveryDate={proposeDeliveryDate}
        note={dialogNote}
        onQuantityChange={setProposeQuantity}
        onUnitPriceChange={setProposeUnitPrice}
        onDeliveryDateChange={setProposeDeliveryDate}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitProposeChange()}
      />

      <RaiseConcessionDialog
        open={activeDialog === 'RAISE_CONCESSION'}
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        materialCode={String(selectedActionRow?.material_code || '')}
        description={String(selectedActionRow?.description || '')}
        documentsRows={[]}
        documentTags={documentTags}
        selectedDocumentTag={selectedDocumentTag}
        selectedDocumentId={selectedDocumentTag}
        uploadFile={uploadFile}
        reason={dialogNote}
        concessionDescription={concessionDescription}
        onReasonChange={setDialogNote}
        onDocumentIdChange={setSelectedDocumentTag}
        onUploadFileChange={setUploadFile}
        onConcessionDescriptionChange={setConcessionDescription}
        onClose={closeDialog}
        onSubmit={() => void submitConcession()}
      />

      <UploadDocumentDialog
        open={activeDialog === 'UPLOAD_DOCUMENT'}
        mode="UPLOAD"
        lineId={String(selectedActionRow?.line_number || selectedActionRow?.line_id || '--')}
        uploadFile={uploadFile}
        uploadComments={uploadComments}
        documentTags={documentTags}
        selectedDocumentTag={selectedDocumentTag}
        selectedDocumentName={undefined}
        documentsRows={[]}
        onUploadFileChange={setUploadFile}
        onSelectedDocumentTagChange={setSelectedDocumentTag}
        onUploadCommentsChange={setUploadComments}
        onDownloadDocument={() => undefined}
        onClose={closeDialog}
        onSubmit={() => void submitUploadDocument()}
      />
    </Box>
  );
};

export default PurchaseOrders;
