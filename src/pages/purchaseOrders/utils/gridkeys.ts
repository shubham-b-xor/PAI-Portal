import { MRP_EXCEPTION_ANTD_TAB } from '../constants';

type GetPurchaseOrderGridColumnVisibilityKeyParams = {
  isSupplierCollaboration: boolean;
  selectedTab: number;
};

export const getPurchaseOrderGridColumnVisibilityKey = ({
  isSupplierCollaboration,
  selectedTab,
}: GetPurchaseOrderGridColumnVisibilityKeyParams): string => {
  if (isSupplierCollaboration) {
    switch (selectedTab) {
      case 2:
        return 'supplier_action_required_columns';

      case 3:
        return 'supplier_exceptions_alerts_columns';

      case 0:
      default:
        return 'supplier_open_po_columns';
    }
  }

  switch (selectedTab) {
    case 2:
      return 'ps_po_to_review_columns';

    case 3:
      return 'ps_mrp_exception_columns';

    case MRP_EXCEPTION_ANTD_TAB:
      return 'ps_mrp_exception_antd_columns';

    case 0:
    default:
      return 'ps_open_po_columns';
  }
};