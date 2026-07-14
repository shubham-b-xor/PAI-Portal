import { useCallback, useEffect, useMemo, useState } from 'react';
import { GridColumnVisibilityModel } from '@mui/x-data-grid';

import { userService } from '@/api/services/userService';

type UseUserGridColumnVisibilityReturn = {
  columnVisibilityModel: GridColumnVisibilityModel;
  handleColumnVisibilityModelChange: (model: GridColumnVisibilityModel) => void;
  loading: boolean;
};

export function useUserGridColumnVisibility(
  userId: string | undefined,
  gridKey: string
): UseUserGridColumnVisibilityReturn {
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({});

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPreference = async () => {
      if (!userId || !gridKey) {
        setColumnVisibilityModel({});
        return;
      }

      try {
        setLoading(true);
        //@ts-ignore
        const savedModel = await userService.getGridColumnVisibility(userId, gridKey);

        if (active) {
          setColumnVisibilityModel(savedModel || {});
        }
      } catch (error) {
        console.error('Failed to load grid column visibility preference', error);

        if (active) {
          setColumnVisibilityModel({});
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPreference();

    return () => {
      active = false;
    };
  }, [userId, gridKey]);

  const handleColumnVisibilityModelChange = useCallback(
    (model: GridColumnVisibilityModel) => {
      setColumnVisibilityModel(model);

      if (!userId || !gridKey) {
        return;
      }
      //@ts-ignore
      void userService.updateGridColumnVisibility(userId, gridKey, model);
    },
    [userId, gridKey]
  );

  return useMemo(
    () => ({
      columnVisibilityModel,
      handleColumnVisibilityModelChange,
      loading,
    }),
    [columnVisibilityModel, handleColumnVisibilityModelChange, loading]
  );
}