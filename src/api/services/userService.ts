import apiClient from '../axios';
import { User } from '@/models';

export type PinType = 'po' | 'po_to_review' | 'mrp_exception' | 'po_details_lines' | 'po_details_documents';

type BatchPinnedRowsResponse = {
  pinned_rows: Partial<Record<PinType, string[]>>;
};

export const userService = {
  // Get users by role
  getUsersByRole: async (role: string): Promise<User[]> => {
    const response = await apiClient.get<User[]>(`/admin/users?role=${role}`);
    return response.data;
  },

  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
  },

  getPinnedRows: async (userId: string, pinType: PinType = 'po'): Promise<string[]> => {
    const response = await apiClient.get<{ pinned_rows: string[] }>(
      `/user-pref/pinned-rows?user_id=${userId}&pin_type=${pinType}`
    );

    return response.data.pinned_rows;
  },

  getPinnedRowsBatch: async (
    userId: string,
    pinTypes: PinType[]
  ): Promise<Partial<Record<PinType, string[]>>> => {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    pinTypes.forEach((pinType) => params.append('pin_types', pinType));

    const response = await apiClient.get<BatchPinnedRowsResponse>(
      `/user-pref/pinned-rows/batch?${params.toString()}`
    );

    return response.data.pinned_rows;
  },

  updatePinnedRows: async (
    userId: string,
    pinnedRows: string[],
    pinType: PinType = 'po'
  ): Promise<{ pinned_rows: string[] }> => {
    const response = await apiClient.put<{ pinned_rows: string[] }>('/user-pref/pinned-rows', {
      user_id: userId,
      pin_type: pinType,
      pinned_rows: pinnedRows,
    });

    console.log(`Updated pinned rows for user ${JSON.stringify(response.data)}`);
    return response.data;
  },

  getLinePinnedRows: async (userId: string): Promise<string[]> => {
    const response = await apiClient.get<{ line_pinned_rows: string[] }>(
      `/user-pref/line-pinned-rows?user_id=${userId}`
    );
    return response.data.line_pinned_rows;
  },

  updateLinePinnedRows: async (
    userId: string,
    linePinnedRows: string[]
  ): Promise<{ line_pinned_rows: string[] }> => {
    const response = await apiClient.put<{ line_pinned_rows: string[] }>(
      '/user-pref/line-pinned-rows',
      {
        user_id: userId,
        line_pinned_rows: linePinnedRows,
      }
    );
    return response.data;
  },

  getGridColumnVisibility: async (
    userId: string,
    gridKey: string
  ): Promise<Record<string, boolean>> => {
    const response = await apiClient.get<{ column_visibility_model: Record<string, boolean> }>(
      `/user-pref/grid-column-visibility?user_id=${userId}&grid_key=${gridKey}`
    );

    return response.data.column_visibility_model || {};
  },

  updateGridColumnVisibility: async (
    userId: string,
    gridKey: string,
    columnVisibilityModel: Record<string, boolean>
  ): Promise<{ column_visibility_model: Record<string, boolean> }> => {
    const response = await apiClient.put<{ column_visibility_model: Record<string, boolean> }>(
      '/user-pref/grid-column-visibility',
      {
        user_id: userId,
        grid_key: gridKey,
        column_visibility_model: columnVisibilityModel,
      }
    );

    return response.data;
  },
};
