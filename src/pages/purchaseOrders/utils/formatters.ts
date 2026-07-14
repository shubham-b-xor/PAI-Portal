import { format } from 'date-fns';

export const formatCurrency = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return '--';
  }

  return `$${numericValue.toLocaleString()}`;
};

export const formatDateSafe = (value: unknown): string => {
  if (!value) {
    return '--';
  }

  const parsedDate = new Date(String(value));

  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return format(parsedDate, 'MMM, dd yyyy');
};

export const hasCellValue = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== '';