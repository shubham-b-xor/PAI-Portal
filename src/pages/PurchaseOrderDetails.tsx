import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Alert,
  Box,
  Breadcrumbs,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Upload } from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { purchaseOrderService } from '@/api/services/purchaseOrderService';
import { LineItem, PurchaseOrder } from '@/models';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/api/services/userService';
import {
  ProposeChangeDialog,
  RaiseConcessionDialog,
  SimpleInfoDialog,
  SplitDialog,
  MoveDateDialog,
  UploadDocumentDialog,
} from '@/components/purchaseOrderDetails';
import { buildLineColumns, buildSupplierLineColumns } from './purchaseOrderDetails/gridColumns';
import DocumentsTab from './purchaseOrderDetails/DocumentsTab';
import HeaderCard from './purchaseOrderDetails/HeaderCard';
import HistoryTab from './purchaseOrderDetails/HistoryTab';
import LineItemsTab from './purchaseOrderDetails/LineItemsTab';
import OverviewTab from './purchaseOrderDetails/OverviewTab';
import ActionsMenu from './purchaseOrderDetails/ActionsMenu';
import { DialogType, DocsRow, HistoryRow } from './purchaseOrderDetails/types';
import { formatLineId, getTabs, isSupplierRole } from './purchaseOrderDetails/utils';

const PurchaseOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role || '';
  const supplier = isSupplierRole(role);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [documentsRows, setDocumentsRows] = useState<DocsRow[]>([]);
  const [documentTags, setDocumentTags] = useState<string[]>([]);

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedLine, setSelectedLine] = useState<LineItem | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocsRow | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isPOLevelAction, setIsPOLevelAction] = useState(false);
  const [pinnedLineKeys, setPinnedLineKeys] = useState<string[]>([]);
  const [linePinFilter, setLinePinFilter] = useState<'all' | 'pinned'>('all');
  const [pinnedDocumentKeys, setPinnedDocumentKeys] = useState<string[]>([]);
  const [documentPinFilter, setDocumentPinFilter] = useState<'all' | 'pinned'>('all');
  const [lineSearchQuery] = useState('');

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
  const [concessionDocumentId, setConcessionDocumentId] = useState('');
  const [documentActionMode, setDocumentActionMode] = useState<'UPLOAD' | 'REPLACE'>('UPLOAD');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadComments, setUploadComments] = useState('');
  const [selectedDocumentTag, setSelectedDocumentTag] = useState('LINE_ITEM');

  const moduleContext = useMemo(() => {
    const queryModule = new URLSearchParams(location.search).get('module');
    if (queryModule === 'supplier-collaboration' || queryModule === 'cockpit') {
      return queryModule;
    }
    return 'default';
  }, [location.search]);

  const isSupplierCollaborationContext = moduleContext === 'supplier-collaboration';
  const isCockpitContext = moduleContext === 'cockpit';
  const poListingRoute = isSupplierCollaborationContext
    ? '/supplier-collaboration'
    : isCockpitContext
      ? '/cockpit'
      : '/purchase-orders';

  const tabs = getTabs(user?.role);

  const reloadPo = useCallback(async () => {
    if (!id) return;
    const data = await purchaseOrderService.getPOById(id);
    setPo(data);
  }, [id]);

  const reloadHistory = useCallback(async () => {
    if (!id) return;
    const rows = ((await purchaseOrderService.getPOHistory(id)) as HistoryRow[]) || [];
    const sortedRows = [...rows].sort((a, b) => {
      const aTime = new Date(a.created_at || a.timestamp || '').getTime();
      const bTime = new Date(b.created_at || b.timestamp || '').getTime();
      const safeATime = Number.isNaN(aTime) ? 0 : aTime;
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
      return safeBTime - safeATime;
    });
    setHistoryRows(sortedRows);
  }, [id]);

  const reloadDocuments = useCallback(async () => {
    if (!id) return;
    const rows = (await purchaseOrderService.getPODocuments(id)) as DocsRow[];
    setDocumentsRows(rows || []);
  }, [id]);

  const refreshPageAfterDialogAction = useCallback(async () => {
    if (!id) return;
    await Promise.all([reloadPo(), reloadHistory(), reloadDocuments()]);
  }, [id, reloadPo, reloadHistory, reloadDocuments]);

  const reloadDocumentTags = useCallback(async () => {
    const tags = await purchaseOrderService.getPODocumentTags();
    const normalizedTags = tags.length > 0 ? tags : ['LINE_ITEM'];
    setDocumentTags(normalizedTags);
    setSelectedDocumentTag((prev) => (normalizedTags.includes(prev) ? prev : normalizedTags[0] || 'LINE_ITEM'));
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        await Promise.all([reloadPo(), reloadHistory(), reloadDocuments(), reloadDocumentTags()]);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load PO details');
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, [id, reloadPo, reloadHistory, reloadDocuments, reloadDocumentTags]);

  useEffect(() => {
    const loadPins = async () => {
      if (!userId) {
        setPinnedLineKeys([]);
        setPinnedDocumentKeys([]);
        return;
      }

      try {
        const [linePins, documentPins] = await Promise.all([
          userService.getPinnedRows(userId, 'po_details_lines'),
          userService.getPinnedRows(userId, 'po_details_documents'),
        ]);
        setPinnedLineKeys(linePins);
        setPinnedDocumentKeys(documentPins);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load PO detail preferences');
      }
    };

    void loadPins();
  }, [userId]);

  useEffect(() => {
    const publishChatContext = async () => {
      if (!po || !user?.email) {
        return;
      }

      const fromEmail = user.email;
      const fromName = user.name || user.email;

      let toEmail = po.supplier_email || '';
      let toName = po.supplier_name || 'Supplier';

      if (supplier) {
        const specialists = await userService.getUsersByRole('PROCUREMENT_SPECIALIST');
        const owner = specialists.find((item) => item.id === po.procurement_specialist_id);

        if (!owner?.email) {
          return;
        }

        toEmail = owner.email;
        toName = owner.name;
      }

      if (!toEmail) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent('chat-context', {
          detail: {
            poNumber: po.po_number,
            fromEmail,
            fromName,
            toEmail,
            toName,
          },
        })
      );
    };

    void publishChatContext();

    return () => {
      window.dispatchEvent(new Event('clear-chat-context'));
    };
  }, [po?.id, po?.po_number, po?.procurement_specialist_id, po?.supplier_email, po?.supplier_name, supplier, user?.email, user?.name]);

  const lineItems = po?.line_items || [];
  const hasSelectedSupplierLineRows = selectedLineIds.length > 0;
  const buildLinePinKey = useCallback((lineId: string) => `${id || 'unknown'}::${lineId}`, [id]);
  const buildDocumentPinKey = useCallback((documentId: string) => `${id || 'unknown'}::${documentId}`, [id]);

  useEffect(() => {
    // Keep action state in sync with current PO line set after reloads.
    const availableLineIds = new Set(lineItems.map((line) => formatLineId(line)));

    setSelectedLineIds((prev) => prev.filter((lineId) => availableLineIds.has(lineId)));

    setSelectedLine((prev) => {
      if (!prev) return null;
      const selectedId = formatLineId(prev);
      return lineItems.find((line) => formatLineId(line) === selectedId) || null;
    });
  }, [lineItems]);

  const resolveLineIdsForAction = (lineIds?: string[]) => {
    const candidateIds = lineIds && lineIds.length > 0
      ? lineIds
      : selectedLine
        ? [formatLineId(selectedLine)]
        : [];

    if (candidateIds.length === 0) {
      return [];
    }

    const availableLineIds = new Set(lineItems.map((line) => formatLineId(line)));
    return candidateIds.filter((lineId) => availableLineIds.has(lineId));
  };

  const closeDialog = () => {
    setActiveDialog('NONE');
    setIsPOLevelAction(false);
    setDialogNote('');
    setDialogDate('');
    setSplitRows([{ quantity: '', delivery_date: '' }]);
    setProposeQuantity('');
    setProposeUnitPrice('');
    setProposeDeliveryDate('');
    setConcessionDescription('');
    setConcessionDocumentId('');
    setSelectedDocument(null);
    setDocumentActionMode('UPLOAD');
    setUploadFile(null);
    setUploadComments('');
    setSelectedDocumentTag('LINE_ITEM');
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, line: LineItem) => {
    const selectedId = formatLineId(line);
    const matchedLine = lineItems.find((item) => formatLineId(item) === selectedId) || line;

    setError(null);
    setIsPOLevelAction(false);
    setSelectedLine(matchedLine);
    setMenuAnchorEl(event.currentTarget);
  };

  const resolvePrimaryLine = () => {
    const selectedLineId = selectedLineIds[0];
    if (selectedLineId) {
      return lineItems.find((line) => formatLineId(line) === selectedLineId) || null;
    }
    if (!selectedLine) {
      return lineItems[0] || null;
    }
    const selectedId = formatLineId(selectedLine);
    return lineItems.find((line) => formatLineId(line) === selectedId) || lineItems[0] || null;
  };

  const closeMenu = () => {
    setMenuAnchorEl(null);
  };

  const openDialogForAction = (action: string, options?: { poLevel?: boolean }) => {
    const poLevel = Boolean(options?.poLevel);
    setIsPOLevelAction(poLevel);
    const normalized = action.toUpperCase();
    const primaryLine = resolvePrimaryLine();
    if (normalized === 'PROPOSE_CHANGE') {
      setSelectedLine(primaryLine);
      setProposeQuantity(String(primaryLine?.quantity || ''));
      setProposeUnitPrice(String(primaryLine?.unit_price || ''));
      setProposeDeliveryDate(String(primaryLine?.required_in_house_date || primaryLine?.shipment_date || ''));
      setDialogNote('');
      return setActiveDialog('PROPOSE_CHANGE');
    }
    if (normalized === 'RAISE_CONCESSION') {
      setSelectedLine(primaryLine);
      setConcessionDescription('');
      setDialogNote('');
      setConcessionDocumentId(documentsRows[0]?.id || '');
      setSelectedDocumentTag(documentTags.includes('CONCESSION') ? 'CONCESSION' : (documentTags[0] || 'LINE_ITEM'));
      return setActiveDialog('RAISE_CONCESSION');
    }
    if (normalized === 'UNHOLD') {
      setSelectedLine(primaryLine);
      setDialogNote('');
      if (supplier) {
        return setActiveDialog('NONE');
      }
      return setActiveDialog('UNHOLD');
    }
    if (normalized === 'HOLD' || normalized === 'ACCEPT' || normalized === 'ACKNOWLEDGE') {
      setSelectedLine(primaryLine);
      setDialogNote('');
      return setActiveDialog(normalized as DialogType);
    }
    if (normalized === 'MOVE_IN') {
      setSelectedLine(primaryLine);
      return setActiveDialog('MOVE_IN');
    }
    if (normalized === 'MOVE_OUT') {
      setSelectedLine(primaryLine);
      return setActiveDialog('MOVE_OUT');
    }
    if (normalized === 'SPLIT') {
      setSelectedLine(primaryLine);
      return setActiveDialog('SPLIT');
    }
    if (normalized === 'REJECT') {
      setSelectedLine(primaryLine);
      return setActiveDialog('REJECT');
    }
    if (normalized === 'NEED_MORE_INFORMATION') {
      setSelectedLine(primaryLine);
      return setActiveDialog('NEED_MORE_INFORMATION');
    }
    if (normalized === 'UPLOAD_DOCUMENT') {
      setSelectedLine(primaryLine);
      return setActiveDialog('UPLOAD_DOCUMENT');
    }
    setActiveDialog('NONE');
  };

  const openDocumentReviewDialog = (document: DocsRow, action: 'ACCEPT' | 'REJECT' | 'NEED_MORE_INFORMATION') => {
    setSelectedDocument(document);
    setDialogNote('');
    setActiveDialog(action);
  };

  const openDocumentReplaceDialog = (document?: DocsRow, options?: { poLevel?: boolean }) => {
    setIsPOLevelAction(Boolean(options?.poLevel));
    setSelectedLine(resolvePrimaryLine());
    setSelectedDocument(document || null);
    setDocumentActionMode(document ? 'REPLACE' : 'UPLOAD');
    setSelectedDocumentTag(document?.document_tag_to || 'LINE_ITEM');
    setDialogNote('');
    setUploadFile(null);
    setUploadComments('');
    setActiveDialog('UPLOAD_DOCUMENT');
  };

  const executeAction = async (action: string, payload?: Record<string, unknown>, lineIds?: string[]) => {
    const resolvedLineIds = resolveLineIdsForAction(lineIds);
    const poLevelAcceptLineIds =
      isPOLevelAction && action.toUpperCase() === 'ACCEPT'
        ? lineItems.map((line) => formatLineId(line)).filter(Boolean)
        : [];
    const effectiveLineIds = poLevelAcceptLineIds.length > 0 ? poLevelAcceptLineIds : resolvedLineIds;

    if (!id) return;

    if (effectiveLineIds.length === 0) {
      setError('Please select a valid line item before continuing.');
      return;
    }

    const line_item_id = effectiveLineIds[0];
    const req = {
      action,
      line_item_id,
      line_item_ids: effectiveLineIds,
      ...(payload || {}),
    };

    await purchaseOrderService.performPOAction(id, req as any);
  };

  const submitMove = async (kind: 'MOVE_IN' | 'MOVE_OUT') => {
    try {
      setError(null);
      const payload: Record<string, unknown> = { notes: dialogNote };
      if (kind === 'MOVE_IN') payload.move_in_date = dialogDate;
      if (kind === 'MOVE_OUT') payload.move_out_date = dialogDate;
      await executeAction(kind, payload);
      await refreshPageAfterDialogAction();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to submit ${kind}`);
    }
  };

  const submitSplit = async () => {
    try {
      setError(null);
      const splits = splitRows
        .filter((r) => r.quantity && r.delivery_date)
        .map((r) => ({ quantity: Number(r.quantity), delivery_date: r.delivery_date }));
      await executeAction('SPLIT', { notes: dialogNote, splits });
      await refreshPageAfterDialogAction();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit split request');
    }
  };

  const submitSimpleAction = async (action: 'REJECT' | 'NEED_MORE_INFORMATION' | 'PROPOSE_CHANGE' | 'RAISE_CONCESSION') => {
    try {
      setError(null);
      const selectedIds = selectedLineIds.length > 0 ? selectedLineIds : selectedLine ? [formatLineId(selectedLine)] : [];
      const payload: Record<string, unknown> = { notes: dialogNote };
      if (action === 'PROPOSE_CHANGE') {
        payload.proposed_quantity = proposeQuantity ? Number(proposeQuantity) : null;
        payload.proposed_unit_price = proposeUnitPrice ? Number(proposeUnitPrice) : null;
        payload.proposed_delivery_date = proposeDeliveryDate || null;
      }
      if (action === 'RAISE_CONCESSION') {
        if (uploadFile) {
          if (!id || selectedIds.length === 0) {
            setError('Please select a line item before uploading a concession document');
            return;
          }
          const primaryLineId = selectedIds[0];
          if (!primaryLineId) {
            setError('Please select a line item before uploading a concession document');
            return;
          }
          const uploaded = await purchaseOrderService.uploadPODocument(id, {
            line_item_id: primaryLineId,
            file: uploadFile,
            document_tag_to: selectedDocumentTag || 'CONCESSION',
            comments: concessionDescription || 'Concession request attachment',
          });
          const uploadedDocumentId = (uploaded as { id?: string }).id;
          if (uploadedDocumentId) {
            payload.document_id = uploadedDocumentId;
            setConcessionDocumentId(uploadedDocumentId);
            await reloadDocuments();
          }
        }
        payload.concession_reason = dialogNote || '';
        payload.concession_description = concessionDescription || '';
        payload.document_id = payload.document_id || concessionDocumentId || undefined;
      }
      await executeAction(action, payload, selectedIds);
      await refreshPageAfterDialogAction();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to submit ${action}`);
    }
  };

  const submitSimpleLineAction = async (action: 'HOLD' | 'UNHOLD' | 'ACCEPT' | 'ACKNOWLEDGE' | 'REJECT' | 'NEED_MORE_INFORMATION') => {
    try {
      setError(null);
      if (selectedDocument && (action === 'ACCEPT' || action === 'REJECT' || action === 'NEED_MORE_INFORMATION')) {
        await submitDocumentReview(action);
        return;
      }
      const selectedIds = isPOLevelAction && action === 'ACCEPT'
        ? lineItems.map((line) => formatLineId(line)).filter(Boolean)
        : selectedLineIds.length > 0
          ? selectedLineIds
          : selectedLine
            ? [formatLineId(selectedLine)]
            : [];
      await executeAction(action, { notes: dialogNote, document_id: concessionDocumentId || undefined }, selectedIds);
      await refreshPageAfterDialogAction();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to submit ${action}`);
    }
  };

  const submitDocumentReview = async (action: 'ACCEPT' | 'REJECT' | 'NEED_MORE_INFORMATION') => {
    if (!id || !selectedDocument) return;
    try {
      setError(null);
      await purchaseOrderService.performPODocumentAction(id, selectedDocument.id, { action, notes: dialogNote });
      await refreshPageAfterDialogAction();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to submit document ${action}`);
    }
  };

  const submitDocumentUploadOrReplace = async () => {
    if (!id || !uploadFile) {
      setError('Please select a file before upload');
      return;
    }

    try {
      setError(null);
      if (documentActionMode === 'REPLACE' && selectedDocument) {
        await purchaseOrderService.replacePODocument(id, selectedDocument.id, {
          file: uploadFile,
          document_tag_to: selectedDocumentTag || 'LINE_ITEM',
          comments: uploadComments,
        });
      } else {
        const resolvedLineIds = resolveLineIdsForAction(selectedLineIds);
        if (resolvedLineIds.length === 0) {
          setError('Please select a line item before upload');
          return;
        }
        await Promise.all(
          resolvedLineIds.map((lineId) =>
            purchaseOrderService.uploadPODocument(id, {
              line_item_id: lineId,
              file: uploadFile,
              document_tag_to: selectedDocumentTag || 'LINE_ITEM',
              comments: uploadComments,
            })
          )
        );
      }
      await refreshPageAfterDialogAction();
      closeDialog();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save document');
    }
  };

  const downloadDocument = async (documentId: string, fallbackName?: string) => {
    if (!id || !documentId) return;
    try {
      setError(null);
      const { blob, fileName } = await purchaseOrderService.downloadPODocument(id, documentId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || fallbackName || 'document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to download document');
    }
  };

  const toggleLinePin = useCallback((lineId: string) => {
    setPinnedLineKeys((prev) => {
      const pinKey = buildLinePinKey(lineId);
      const next = prev.includes(pinKey)
        ? prev.filter((item) => item !== pinKey)
        : [...prev, pinKey];

      if (user?.id) {
        void userService.updatePinnedRows(user.id, next, 'po_details_lines');
      }

      return next;
    });
  }, [buildLinePinKey, user?.id]);

  const toggleDocumentPin = useCallback((documentId: string) => {
    setPinnedDocumentKeys((prev) => {
      const pinKey = buildDocumentPinKey(documentId);
      const next = prev.includes(pinKey)
        ? prev.filter((item) => item !== pinKey)
        : [...prev, pinKey];

      if (user?.id) {
        void userService.updatePinnedRows(user.id, next, 'po_details_documents');
      }

      return next;
    });
  }, [buildDocumentPinKey, user?.id]);

  const pinnedLineIds = useMemo(
    () =>
      pinnedLineKeys
        .filter((pinKey) => pinKey.startsWith(`${id || 'unknown'}::`))
        .map((pinKey) => pinKey.split('::')[1] || '')
        .filter(Boolean),
    [id, pinnedLineKeys]
  );

  const pinnedDocumentIds = useMemo(
    () =>
      pinnedDocumentKeys
        .filter((pinKey) => pinKey.startsWith(`${id || 'unknown'}::`))
        .map((pinKey) => pinKey.split('::')[1] || '')
        .filter(Boolean),
    [id, pinnedDocumentKeys]
  );

  const displayedLineItems = useMemo(
    () =>
      lineItems.filter((line) => {
        const lineId = formatLineId(line);
        const matchesPin = linePinFilter === 'pinned' ? pinnedLineIds.includes(lineId) : true;
        const searchable = `${lineId} ${line.material_code || ''} ${line.description || ''}`.toLowerCase();
        const matchesSearch = !lineSearchQuery.trim() || searchable.includes(lineSearchQuery.trim().toLowerCase());
        return matchesPin && matchesSearch;
      }),
    [lineItems, linePinFilter, pinnedLineIds, lineSearchQuery]
  );

  const displayedDocumentsRows = useMemo(
    () =>
      documentPinFilter === 'pinned'
        ? documentsRows.filter((document) => pinnedDocumentIds.includes(String(document.id || '')))
        : documentsRows,
    [documentPinFilter, documentsRows, pinnedDocumentIds]
  );

  const lineColumns: GridColDef[] = useMemo(
    () =>
      buildLineColumns({
        pinnedLineIds,
        toggleLinePin,
        openMenu,
        highlightNeedByDate: supplier || isSupplierCollaborationContext,
        onSupplierConfirmationClick: (line) =>
          navigate(`/purchase-orders/${id}/line-items/${formatLineId(line)}?module=${moduleContext}`),
        onConcessionClick: isCockpitContext
          ? (line) => navigate(`/purchase-orders/${id}/line-items/${formatLineId(line)}?module=${moduleContext}`)
          : undefined,
        onDocumentsClick: (line) => {
          setSelectedLine(line);
          setSelectedLineIds([formatLineId(line)]);
          setActiveTab(3);
        },
      }),
    [pinnedLineIds, toggleLinePin, supplier, isSupplierCollaborationContext, isCockpitContext, navigate, id, moduleContext]
  );

  const supplierLineColumns: GridColDef[] = useMemo(
    () => buildSupplierLineColumns(lineColumns, isCockpitContext),
    [lineColumns, isCockpitContext]
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">Loading purchase order details...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!po) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Purchase order not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0.1, minHeight: '100%', backgroundColor: '#ffffff' }}>
      <Stack spacing={2}>
        <Breadcrumbs>
          <Typography sx={{ cursor: 'pointer' }} color="primary" onClick={() => navigate(poListingRoute)}>
            PO Listing
          </Typography>
          <Typography color="text.secondary">PO Details</Typography>
        </Breadcrumbs>

        <HeaderCard
          po={po}
          actions={
            activeTab === 1 ? (
              supplier ? (
                <>
                  <Button size="small" variant="outlined" onClick={() => openDialogForAction('RAISE_CONCESSION', { poLevel: true })}>RAISE CONCESSION</Button>
                  <Button size="small" variant="outlined" onClick={() => openDocumentReplaceDialog(undefined, { poLevel: true })}>UPLOAD DOCUMENT</Button>
                  <Button size="small" sx={{bgcolor: 'primary.main', color: '#fff'}} variant="outlined" onClick={() => openDialogForAction('ACKNOWLEDGE', { poLevel: true })}>ACKNOWLEDGE</Button>
                </>
              ) : (
                <Button
                  size="small"
                  sx={{ bgcolor: 'primary.main', color: '#fff' }}
                  variant="outlined"
                  onClick={() => openDialogForAction('ACCEPT', { poLevel: true })}
                >
                  ACCEPT
                </Button>
              )
            ) : supplier ? (
            <>
              {activeTab === 3 ? (
                <Button size="small" variant="outlined" startIcon={<Upload />} disabled={!hasSelectedSupplierLineRows} onClick={() => openDocumentReplaceDialog()}>UPLOAD DOCUMENT</Button>
              ) : null}
            </>
            ) : null
          }
        />

        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

        <Paper variant="outlined" sx={{ p: 0, borderColor: '#d6dde8', borderRadius: 1, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => {
              setActiveTab(v);
              setSelectedLine(null);
              setSelectedLineIds([]);
              setMenuAnchorEl(null);
            }}
            variant="scrollable"
            sx={{ borderBottom: '1px solid #e5e7eb', '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}
          >
            {tabs.map((t, idx) => (
              <Tab key={t} label={idx === 1 ? `${t} (${lineItems.length})` : t} />
            ))}
          </Tabs>

          <Box sx={{ p: 0 }}>
            {activeTab === 0 ? <OverviewTab po={po} /> : null}

            {activeTab === 1 ? (
              <LineItemsTab
                displayedLineItems={displayedLineItems}
                columns={supplier ? supplierLineColumns : lineColumns}
                pinnedCount={pinnedLineIds.length}
                linePinFilter={linePinFilter}
                onTogglePinFilter={() => setLinePinFilter((prev) => (prev === 'pinned' ? 'all' : 'pinned'))}
                checkboxSelection
                rowSelectionModel={selectedLineIds}
                onRowSelectionModelChange={setSelectedLineIds}
                onRowClick={(row) => {
                  setSelectedLine(row);
                  setSelectedLineIds([formatLineId(row)]);
                }}
              />
            ) : null}

            {activeTab === 2 ? <HistoryTab historyRows={historyRows} /> : null}

            {activeTab === 3 ? (
              <DocumentsTab
                documentsRows={displayedDocumentsRows}
                role={role}
                onReviewDocument={openDocumentReviewDialog}
                onDownloadDocument={(doc) => void downloadDocument(doc.id, doc.file_name || doc.file_path)}
                onReplaceDocument={openDocumentReplaceDialog}
                checkboxSelection
                rowSelectionModel={selectedDocumentIds}
                onRowSelectionModelChange={setSelectedDocumentIds}
                pinnedCount={pinnedDocumentIds.length}
                pinFilter={documentPinFilter}
                onTogglePinFilter={() => setDocumentPinFilter((prev) => (prev === 'pinned' ? 'all' : 'pinned'))}
                pinnedDocumentIds={pinnedDocumentIds}
                onToggleDocumentPin={toggleDocumentPin}
              />
            ) : null}
          </Box>
        </Paper>
      </Stack>

      <ActionsMenu
        role={role}
        anchorEl={menuAnchorEl}
        lineStatus={selectedLine?.line_status}
        //lineStatus={selectedLine?.line_status}
        onClose={closeMenu}
        onOpenDialog={openDialogForAction}
      />

      <MoveDateDialog
        open={activeDialog === 'MOVE_IN'}
        mode="MOVE_IN"
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        currentDate={selectedLine?.required_in_house_date}
        date={dialogDate}
        onDateChange={setDialogDate}
        onClose={closeDialog}
        onSubmit={() => void submitMove('MOVE_IN')}
      />

      <MoveDateDialog
        open={activeDialog === 'MOVE_OUT'}
        mode="MOVE_OUT"
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        currentDate={selectedLine?.shipment_date}
        date={dialogDate}
        onDateChange={setDialogDate}
        onClose={closeDialog}
        onSubmit={() => void submitMove('MOVE_OUT')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'HOLD'}
        title="Hold"
        submitLabel="Submit Hold Request"
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        deliveryDate={selectedLine?.required_in_house_date}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleLineAction('HOLD')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'UNHOLD'}
        title="Unhold"
        submitLabel="Submit Unhold Request"
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        deliveryDate={selectedLine?.required_in_house_date}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleLineAction('UNHOLD')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'ACCEPT'}
        title="Accept"
        submitLabel="Submit Acceptance"
        poNumber={isPOLevelAction ? po?.po_number : undefined}
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        deliveryDate={selectedLine?.required_in_house_date}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleLineAction('ACCEPT')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'ACKNOWLEDGE'}
        title="Acknowledge"
        submitLabel="Submit Acknowledgement"
        poNumber={isPOLevelAction ? po?.po_number : undefined}
        lineId={isPOLevelAction ? '' : formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        deliveryDate={selectedLine?.required_in_house_date}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleLineAction('ACKNOWLEDGE')}
      />

      <SplitDialog
        open={activeDialog === 'SPLIT'}
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        rows={splitRows}
        note={dialogNote}
        onChangeRows={setSplitRows}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSplit()}
      />

      <SimpleInfoDialog
        open={activeDialog === 'REJECT'}
        title="Rejected"
        submitLabel="Submit Rejection"
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        deliveryDate={selectedLine?.required_in_house_date}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleLineAction('REJECT')}
      />

      <SimpleInfoDialog
        open={activeDialog === 'NEED_MORE_INFORMATION'}
        title="More Information Needed"
        submitLabel="Submit Info Request"
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={selectedLine?.quantity}
        deliveryDate={selectedLine?.required_in_house_date}
        note={dialogNote}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleLineAction('NEED_MORE_INFORMATION')}
      />

      <ProposeChangeDialog
        open={activeDialog === 'PROPOSE_CHANGE'}
        lineId={formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        quantity={proposeQuantity}
        unitPrice={proposeUnitPrice}
        deliveryDate={proposeDeliveryDate}
        note={dialogNote}
        onQuantityChange={setProposeQuantity}
        onUnitPriceChange={setProposeUnitPrice}
        onDeliveryDateChange={setProposeDeliveryDate}
        onNoteChange={setDialogNote}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('PROPOSE_CHANGE')}
      />

      <RaiseConcessionDialog
        open={activeDialog === 'RAISE_CONCESSION'}
        poNumber={isPOLevelAction ? po?.po_number : undefined}
        lineId={isPOLevelAction ? '' : formatLineId(selectedLine || undefined)}
        materialCode={selectedLine?.material_code}
        description={selectedLine?.description}
        documentsRows={documentsRows}
        documentTags={documentTags}
        selectedDocumentTag={selectedDocumentTag}
        selectedDocumentId={concessionDocumentId}
        uploadFile={uploadFile}
        reason={dialogNote}
        concessionDescription={concessionDescription}
        onReasonChange={setDialogNote}
        onDocumentIdChange={setSelectedDocumentTag}
        onUploadFileChange={setUploadFile}
        onConcessionDescriptionChange={setConcessionDescription}
        onClose={closeDialog}
        onSubmit={() => void submitSimpleAction('RAISE_CONCESSION')}
      />

      <UploadDocumentDialog
        open={activeDialog === 'UPLOAD_DOCUMENT'}
        mode={documentActionMode}
        poNumber={isPOLevelAction ? po?.po_number : undefined}
        lineId={isPOLevelAction ? '' : selectedLineIds.length > 1 ? `${selectedLineIds.length} selected` : formatLineId(selectedLine || undefined)}
        uploadFile={uploadFile}
        uploadComments={uploadComments}
        documentTags={documentTags}
        selectedDocumentTag={selectedDocumentTag}
        selectedDocumentName={selectedDocument?.file_name || selectedDocument?.file_path}
        documentsRows={documentsRows}
        onUploadFileChange={setUploadFile}
        onSelectedDocumentTagChange={setSelectedDocumentTag}
        onUploadCommentsChange={setUploadComments}
        onDownloadDocument={(doc) => void downloadDocument(doc.id, doc.file_name || doc.file_path)}
        onClose={closeDialog}
        onSubmit={() => void submitDocumentUploadOrReplace()}
      />
    </Box>
  );
};

export default PurchaseOrderDetails;

