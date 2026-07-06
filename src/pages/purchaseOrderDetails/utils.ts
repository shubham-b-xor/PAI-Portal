import { LineItem, PurchaseOrder } from '@/models';

export const isSupplierRole = (role?: string) => String(role || '').trim().toUpperCase() === 'SUPPLIER';

export const getTabs = (role?: string) => {
  if (isSupplierRole(role)) {
    return ['OVERVIEW', 'LINE ITEM', 'HISTORY', 'DOCUMENT'];
  }
  return ['OVERVIEW', 'LINE ITEM', 'HISTORY', 'DOCUMENT'];
};

export const formatLineId = (line?: Partial<LineItem> | null): string => {
  if (!line) return '';

  return String(line.line_number ?? '');
};

export const formatActionLabel = (action?: string) => {
  const value = String(action || 'ACTIVITY').trim().toUpperCase();
  return value.replace(/_/g, ' ');
};

export const getActionVisual = (action?: string): { color: 'warning' | 'info' } => {
  const normalized = String(action || '').toUpperCase();

  if (
    normalized.includes('HOLD') ||
    // normalized.includes('NEED_MORE_INFORMATION') ||
    normalized.includes('PROPOSE_CHANGE') ||
    normalized.includes('RAISE_CONCESSION') ||
    normalized.includes('MOVE_IN') ||
    normalized.includes('MOVE_OUT') ||
    normalized.includes('SPLIT')
  ) {
    return { color: 'info' };
  }

  return { color: 'warning' };
};

const toValidDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateForDisplay = (value?: string | null): string => {
  const parsed = toValidDate(value);
  if (!parsed) return '-';

  const day = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
  }).format(parsed);

  const month = new Intl.DateTimeFormat('en-US', {
    month: 'short',
  }).format(parsed);

  const year = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
  }).format(parsed);

  return `${day}-${month}-${year}`;
};

export const getRequiredDeliveryDate = (po: PurchaseOrder): string | null => {
  const firstLine = po.line_items?.[0];
  return (
    po.delivery_date ||
    po.mrp_need_by_date ||
    firstLine?.shipment_date ||
    firstLine?.required_in_house_date ||
    null
  );
};

export const getConfirmedDate = (po: PurchaseOrder): string | null => {
  const datedLines = (po.line_items || [])
    .map((line) => ({
      raw: line.updated_delivery_date,
      parsed: toValidDate(line.updated_delivery_date),
    }))
    .filter((line): line is { raw: string; parsed: Date } => Boolean(line.raw && line.parsed));

  if (!datedLines.length) {
    const firstLine = po.line_items?.[0];
    return firstLine?.shipment_date || firstLine?.required_in_house_date || po.delivery_date || null;
  }

  datedLines.sort((a, b) => b.parsed.getTime() - a.parsed.getTime());
  const latestLine = datedLines[0];
  return latestLine ? latestLine.raw : null;
};

export const getDaysDelta = (value?: string | null): number | null => {
  const target = toValidDate(value);
  if (!target) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const dayMs = 1000 * 60 * 60 * 24;
  return Math.floor((target.getTime() - today.getTime()) / dayMs);
};

export const formatDeliveryBadge = (
  daysDelta: number | null
): { label: string; color: 'default' | 'success' | 'warning' | 'error' } => {
  if (daysDelta === null) {
    return { label: 'No date', color: 'default' };
  }

  if (daysDelta < 0) {
    return { label: `${Math.abs(daysDelta)} days overdue`, color: 'error' };
  }

  if (daysDelta <= 7) {
    return { label: `${daysDelta} days left`, color: 'warning' };
  }

  return { label: `${daysDelta} days left`, color: 'success' };
};

export const formatRelativeTime = (value?: string | null): string => {
  const parsed = toValidDate(value);
  if (!parsed) return 'Updated -';

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};
