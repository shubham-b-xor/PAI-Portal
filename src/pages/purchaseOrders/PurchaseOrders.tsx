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
  Tabs,
  Tab,
  Menu,
  MenuItem as ActionMenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridRowSelectionModel, GridSortModel} from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import ViewListIcon from '@mui/icons-material/ViewList';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { purchaseOrderService } from '@/api/services/purchaseOrderService';
import { useUserGridColumnVisibility } from '@/hooks/useUserGridColumnVisibility';
import { useMrpExceptionColumns } from './columns/ps/useMrpExceptionColumns';
import { usePoToReviewColumns } from './columns/ps/usePoToReviewColumns';
import { useSupplierActionRequiredColumns } from './columns/supplier/useSupplierActionRequiredColumns';
import { useSupplierExceptionsAlertsColumns } from './columns/supplier/useSupplierExceptionsAlertsColumns';
import { useOpenPoColumns } from './columns/ps/useOpenPoColumns';
import { useSupplierOpenPoColumns } from './columns/supplier/useSupplierOpenPoColumns';
import { useCurrentPurchaseOrderColumns } from './columns/useCurrentPurchaseOrderColumns';
import {
  PurchaseOrder,
  POFilters as POFiltersType,
  AdvanceFilters,
  PurchaseOrderStatus,
} from '@/models';
import { useAuth } from '@/hooks/useAuth';
import POFilters from '@/components/common/POFilters';
import AntdMrpExceptionTable from '@/components/common/AntdMrpExceptionTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { usePagination } from '@/hooks/usePagination';
import { logger } from '@/services/logger';
import ClearIcon from '@mui/icons-material/Clear';
import '../grid.css';
import { userService } from '@/api/services/userService';
import { getPurchaseOrderGridColumnVisibilityKey } from './utils/gridkeys';
import {
  MoveDateDialog,
  ProposeChangeDialog,
  RaiseConcessionDialog,
  SimpleInfoDialog,
  SplitDialog,
  UploadDocumentDialog,
} from '@/components/purchaseOrderDetails';
import { DialogType } from '../purchaseOrderDetails/types';
import { formatDateForDisplay } from '../purchaseOrderDetails/utils';
import {
  ACTION_ICONS,
  ACTION_LABELS,
  MODULE_TABS,
  MODULE_TITLE,
  MRP_EXCEPTION_ANTD_TAB,
  PAGE_PIN_TYPES,
} from './constants';

import type {
  LineItemTabRow,
  PurchaseOrdersProps,
} from './types';

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
  const defaultTab = moduleTabs.find((tab) => tab.value === 3)?.value ?? moduleTabs[0]?.value ?? 3;
  const isSupplierCollaboration = isSupplierCollaborationMode;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const shouldHighlightNeedByDate = isSupplierCollaboration && selectedTab === 3;
  
  const isPOToReviewTab = selectedTab === 2;
  const isMRPExceptionTab = selectedTab === 3 || selectedTab === MRP_EXCEPTION_ANTD_TAB;
  const isAntdMrpExceptionTab = selectedTab === MRP_EXCEPTION_ANTD_TAB;
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

  const gridColumnVisibilityKey = React.useMemo(
    () =>
      getPurchaseOrderGridColumnVisibilityKey({
        isSupplierCollaboration,
        selectedTab,
      }),
    [isSupplierCollaboration, selectedTab]
  );

  const { columnVisibilityModel, handleColumnVisibilityModelChange } = useUserGridColumnVisibility(
    userId,
    gridColumnVisibilityKey
  );

  const currentPinFilter = React.useMemo(() => {
    switch (selectedTab) {
      case 2: // PO TO REVIEW
        return poToReviewPinFilter;

      case 3: // MRP EXCEPTION
      case MRP_EXCEPTION_ANTD_TAB: // MRP EXCEPTION (ANTD)
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
        case MRP_EXCEPTION_ANTD_TAB: // MRP EXCEPTION (ANTD)
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
    const normalizedLineItemRowId = String(lineItemRowId);
    setPinnedPOToReviewLineItemIds((prev) => {
      const updated = prev.includes(normalizedLineItemRowId)
        ? prev.filter((id) => id !== normalizedLineItemRowId)
        : [...prev, normalizedLineItemRowId];

      if (userId) {
        userService.updatePinnedRows(userId, updated, 'po_to_review');
      }

      return updated;
    });
  };

  const toggleMRPLinePin = (lineItemRowId: string) => {
    const normalizedLineItemRowId = String(lineItemRowId);
    setPinnedMRPLineItemIds((prev) => {
      const updated = prev.includes(normalizedLineItemRowId)
        ? prev.filter((id) => id !== normalizedLineItemRowId)
        : [...prev, normalizedLineItemRowId];

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
    const isLineTabRequest = selectedTab === 2 || selectedTab === 3 || selectedTab === MRP_EXCEPTION_ANTD_TAB;

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
    const isMrpLikeTab = selectedTab === 3 || selectedTab === MRP_EXCEPTION_ANTD_TAB;
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
      if (isMrpLikeTab) {
        return ['ACCEPT', 'REJECT'];
      }
      if (selectedTab === 2) {
        return ['ACCEPT', 'REJECT', 'NEED_MORE_INFORMATION'];
      }
    }

    if (moduleVariant === 'cockpit') {
      if (isMrpLikeTab) {
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
  const columns = useOpenPoColumns({
    theme,
    pinnedPOIds,
    togglePin,
    statusColors,
    userRole: user?.role,
  });

  // console.log(columns.map((c) => c.field));

  const poToReviewColumns = usePoToReviewColumns({
    theme,
    statusColors,
    pinnedPOToReviewLineItemIds,
    togglePOToReviewLinePin,
    openActionMenu,
    userRole: user?.role,
  });

  const supplierActionRequiredColumns = useSupplierActionRequiredColumns({
    theme,
    statusColors,
    pinnedPOToReviewLineItemIds,
    togglePOToReviewLinePin,
    openActionMenu,
    userRole: user?.role,
  });

  const supplierExceptionsAlertsColumns = useSupplierExceptionsAlertsColumns({
    supplierActionRequiredColumns,
    renderNeedByDateCell,
  });

  const mrpExceptionColumns = useMrpExceptionColumns({
    theme,
    statusColors,
    pinnedMRPLineItemIds,
    toggleMRPLinePin,
    renderNeedByDateCell,
    openActionMenu,
    userRole: user?.role,
  });

  //saperate page view for supplier & PS
  const supplierColumns = useSupplierOpenPoColumns({
    columns,
  });

  const gridColumns = React.useMemo(
    () => (user?.role === 'SUPPLIER' ? supplierColumns : columns),
    [user?.role, supplierColumns, columns]
  );

  const currentColumns = useCurrentPurchaseOrderColumns({
    isSupplierCollaboration,
    selectedTab,
    gridColumns,
    poToReviewColumns,
    mrpExceptionColumns,
    supplierActionRequiredColumns,
    supplierExceptionsAlertsColumns,
  });

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
          ? lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(String(row.id)))
          : lineItemRows;
      }

      case 3: {
        if (isSupplierCollaboration) {
          return currentPinFilter === 'pinned'
            ? lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(String(row.id)))
            : lineItemRows;
        }

        return currentPinFilter === 'pinned'
          ? lineItemRows.filter((row) => pinnedMRPLineItemIds.includes(String(row.id)))
          : lineItemRows;
      }

      case MRP_EXCEPTION_ANTD_TAB: {
        return currentPinFilter === 'pinned'
          ? lineItemRows.filter((row) => pinnedMRPLineItemIds.includes(String(row.id)))
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
        return lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(String(row.id))).length;
      }

      case 3: {
        // Supplier EXCEPTIONS & ALERTS currently uses same supplier pin bucket
        if (isSupplierCollaboration) {
          return lineItemRows.filter((row) => pinnedPOToReviewLineItemIds.includes(String(row.id))).length;
        }

        // PS MRP EXCEPTION
        return lineItemRows.filter((row) => pinnedMRPLineItemIds.includes(String(row.id))).length;
      }

      case MRP_EXCEPTION_ANTD_TAB:
        return lineItemRows.filter((row) => pinnedMRPLineItemIds.includes(String(row.id))).length;

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
        Updated on {formatDateForDisplay(new Date().toISOString())}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* TODO: Optimise this block if selected */}
      <Box sx={{ height: appliedFilters.length > 0 ? '78vh' : '80vh', width: '100%' }}>
        {isAntdMrpExceptionTab && !isSupplierCollaboration ? (
          <>
            <Box
              sx={{
                border: '1.5px solid #CFCFCF',
                borderBottom: 'none',
                mb: 0,
              }}
            >
              <Tabs
                value={selectedTab}
                onChange={(_, tab) => {
                  setSelectedTab(tab);
                  setPage(0);
                  setSelectedRowIds([]);
                }}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  minHeight: 40,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 40,
                    px: 2,
                  },
                }}
              >
                {moduleTabs.map((tab) => (
                  <Tab key={`${tab.label}-${tab.value}`} label={tab.label} value={tab.value} />
                ))}
              </Tabs>
            </Box>

            <AntdMrpExceptionTable
              rows={currentRows as LineItemTabRow[]}
              loading={loading}
              rowCount={currentPinFilter === 'pinned' ? currentRows.length : rowCount}
              page={page}
              pageSize={pageSize}
              sortBy={sortModel.sort_by}
              sortOrder={sortModel.sort_order}
              selectedSites={selectedSites}
              availableSites={availableSites}
              searchInput={searchInput}
              pinFilter={currentPinFilter}
              pinnedCount={currentPinnedCount}
              pinnedRowIds={pinnedMRPLineItemIds}
              selectedRowIds={selectedRowIds}
              onSearchChange={handleSearchChange}
              onSelectedSitesChange={handleSelectedSitesChange}
              onPinFilterChange={handleCurrentPinFilterChange}
              onTogglePin={toggleMRPLinePin}
              onActionClick={(event, row) => openActionMenu(event, row as LineItemTabRow)}
              onRowClick={(row) => handleGridRowClick(row)}
              onPaginationChange={handlePaginationModelChange}
              onSortChange={(sortBy, sortOrder) => {
                const currentSortBy = sortModel.sort_by || undefined;
                if (sortBy === currentSortBy && sortOrder === sortModel.sort_order) {
                  return;
                }

                if (!sortBy && !sortOrder && !currentSortBy) {
                  return;
                }

                setSortModel({
                  sort_by: sortBy,
                  sort_order: sortOrder || sortModel.sort_order,
                });
                setPage(0);
              }}
              onSelectedRowIdsChange={(ids) => setSelectedRowIds(ids as GridRowSelectionModel)}
            />
          </>
        ) : (
          <DataGrid
          key={`po-grid-${selectedTab}`}
          rows={currentRows}
          columns={currentColumns}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={handleColumnVisibilityModelChange}

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
        )}
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
