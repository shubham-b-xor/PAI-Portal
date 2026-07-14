export type LineItemTabRow = {
  id: string;
  po_id: string;
  [key: string]: unknown;
};

export type PurchaseOrdersModuleVariant = 'default' | 'supplier-collaboration' | 'cockpit';

export interface PurchaseOrdersProps {
  moduleVariant?: PurchaseOrdersModuleVariant;
}
