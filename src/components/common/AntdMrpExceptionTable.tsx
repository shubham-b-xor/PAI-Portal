import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, Select, Segmented, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { EllipsisOutlined, PushpinFilled, PushpinOutlined, SearchOutlined } from '@ant-design/icons';

type SortOrder = 'asc' | 'desc';

type MrpRow = {
  id: string;
  [key: string]: unknown;
};

interface AntdMrpExceptionTableProps {
  rows: MrpRow[];
  loading: boolean;
  rowCount: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  selectedSites: string[];
  availableSites: string[];
  searchInput: string;
  pinFilter: string;
  pinnedCount: number;
  pinnedRowIds: string[];
  selectedRowIds: readonly (string | number)[];
  onSearchChange: (value: string) => void;
  onSelectedSitesChange: (sites: string[]) => void;
  onPinFilterChange: (value: string) => void;
  onTogglePin: (rowId: string) => void;
  onActionClick: (event: React.MouseEvent<HTMLElement>, row: MrpRow) => void;
  onRowClick: (row: MrpRow) => void;
  onPaginationChange: (model: { page: number; pageSize: number }) => void;
  onSortChange: (sortBy: string | undefined, sortOrder: SortOrder | undefined) => void;
  onSelectedRowIdsChange: (ids: readonly (string | number)[]) => void;
}

const formatCurrency = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return '--';
  }

  return `$${numericValue.toLocaleString()}`;
};

const hasCellValue = (value: unknown): boolean => value !== null && value !== undefined && value !== '';

const lineStatusColor = (status: string): string => {
  const normalized = status.toUpperCase();
  if (normalized.includes('CANCELLED')) return 'error';
  if (normalized.includes('DELIVERED')) return 'success';
  if (normalized.includes('APPROVED') || normalized.includes('SENT_TO_SUPPLIER')) return 'processing';
  if (normalized.includes('IN_TRANSIT') || normalized.includes('IN_PROGRESS') || normalized.includes('HOLD')) {
    return 'warning';
  }
  return 'default';
};

const AntdMrpExceptionTable: React.FC<AntdMrpExceptionTableProps> = ({
  rows,
  loading,
  rowCount,
  page,
  pageSize,
  sortBy,
  sortOrder,
  selectedSites,
  availableSites,
  searchInput,
  pinFilter,
  pinnedCount,
  pinnedRowIds,
  selectedRowIds,
  onSearchChange,
  onSelectedSitesChange,
  onPinFilterChange,
  onTogglePin,
  onActionClick,
  onRowClick,
  onPaginationChange,
  onSortChange,
  onSelectedRowIdsChange,
}) => {
  const [localSearch, setLocalSearch] = useState(searchInput);

  useEffect(() => {
    setLocalSearch(searchInput);
  }, [searchInput]);

  useEffect(() => {
    if (localSearch === searchInput) {
      return;
    }

    const timeout = setTimeout(() => {
      onSearchChange(localSearch);
    }, 700);

    return () => {
      clearTimeout(timeout);
    };
  }, [localSearch, searchInput, onSearchChange]);

  const columns: ColumnsType<MrpRow> = useMemo(
    () => [
      {
        title: 'Pin',
        dataIndex: 'pin',
        key: 'pin',
        width: 52,
        fixed: 'left',
        render: (_: unknown, row) => {
          const isPinned = pinnedRowIds.includes(String(row.id));
          return (
            <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
              <Button
                type="text"
                size="small"
                icon={isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin(String(row.id));
                }}
              />
            </Tooltip>
          );
        },
      },
      {
        title: 'PO Number',
        dataIndex: 'po_number',
        key: 'po_number',
        width: 120,
        sorter: true,
        render: (value: unknown) => (
          <Typography.Text strong style={{ color: '#0B4F88' }}>
            {String(value || '--')}
          </Typography.Text>
        ),
      },
      {
        title: 'Revision No.',
        dataIndex: 'po_line_revision_no',
        key: 'po_line_revision_no',
        width: 96,
        sorter: true,
        render: (value: unknown, row) => String(value ?? row.revision_changes ?? '--'),
      },
      {
        title: 'Line Item',
        dataIndex: 'line_number',
        key: 'line_number',
        width: 96,
        sorter: true,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'Short Description',
        dataIndex: 'description',
        key: 'description',
        width: 190,
        sorter: true,
        ellipsis: true,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'Supplier',
        dataIndex: 'supplier_name',
        key: 'supplier_name',
        width: 170,
        sorter: true,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'Recommendations',
        dataIndex: 'recommendation',
        key: 'recommendation',
        width: 170,
        render: (value: unknown, row) => {
          const resolved = value || row.except_message || row.po_feedback || '--';
          return hasCellValue(resolved) ? (
            <Typography.Text strong style={{ color: '#0B4F88' }}>
              {String(resolved)}
            </Typography.Text>
          ) : (
            '--'
          );
        },
      },
      {
        title: 'Unit',
        dataIndex: 'unit',
        key: 'unit',
        width: 70,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'Qty',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 72,
        sorter: true,
        render: (value: unknown) => String(value ?? '--'),
      },
      {
        title: 'Revised Qty',
        dataIndex: 'updated_quantity',
        key: 'updated_quantity',
        width: 110,
        sorter: true,
        render: (value: unknown) =>
          hasCellValue(value) ? <Typography.Text strong style={{ color: '#0B4F88' }}>{String(value)}</Typography.Text> : '--',
      },
      {
        title: 'Unit Price',
        dataIndex: 'unit_price',
        key: 'unit_price',
        width: 110,
        sorter: true,
        render: (value: unknown) => formatCurrency(value),
      },
      {
        title: 'Total Value',
        dataIndex: 'net_value',
        key: 'net_value',
        width: 115,
        sorter: true,
        render: (value: unknown) => formatCurrency(value),
      },
      {
        title: 'Revised Value',
        dataIndex: 'updated_net_value',
        key: 'updated_net_value',
        width: 125,
        sorter: true,
        render: (value: unknown) =>
          hasCellValue(value) ? (
            <Typography.Text strong style={{ color: '#0B4F88' }}>
              {formatCurrency(value)}
            </Typography.Text>
          ) : (
            '--'
          ),
      },
      {
        title: 'Need by Date',
        dataIndex: 'required_in_house_date',
        key: 'required_in_house_date',
        width: 120,
        sorter: true,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'Revised Date',
        dataIndex: 'updated_delivery_date',
        key: 'updated_delivery_date',
        width: 120,
        sorter: true,
        render: (value: unknown) =>
          hasCellValue(value) ? <Typography.Text strong style={{ color: '#0B4F88' }}>{String(value)}</Typography.Text> : '--',
      },
      {
        title: 'Flowserve Site',
        dataIndex: 'site',
        key: 'site',
        width: 130,
        sorter: true,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'PO Status',
        dataIndex: 'line_status',
        key: 'line_status',
        width: 145,
        render: (value: unknown) => {
          const status = String(value || '--');
          return <Tag color={lineStatusColor(status)}>{status.replace(/_/g, ' ')}</Tag>;
        },
      },
      {
        title: 'ERP',
        dataIndex: 'source_system',
        key: 'source_system',
        width: 90,
        sorter: true,
        render: (value: unknown) => String(value || '--'),
      },
      {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        width: 74,
        fixed: 'right',
        render: (_: unknown, row) => {
          const isHold = String(row.line_status || row.status || '').toUpperCase().includes('HOLD');

          return (
            <Tooltip title={isHold ? 'Actions disabled while on hold' : 'Actions'}>
              <Button
                type="text"
                size="small"
                disabled={isHold}
                icon={<EllipsisOutlined />}
                onClick={(event) => onActionClick(event, row)}
              />
            </Tooltip>
          );
        },
      },
    ],
    [pinnedRowIds, onTogglePin, onActionClick]
  );

  const onTableChange: TableProps<MrpRow>['onChange'] = (
    pagination: TablePaginationConfig,
    _filters,
    sorter
  ) => {
    const nextPage = Math.max((pagination.current || 1) - 1, 0);
    const nextPageSize = pagination.pageSize || pageSize;
    onPaginationChange({ page: nextPage, pageSize: nextPageSize });

    const sortObject = Array.isArray(sorter) ? sorter[0] : sorter;
    const hasSorterPayload =
      Boolean(sortObject) &&
      (Object.prototype.hasOwnProperty.call(sortObject, 'field') ||
        Object.prototype.hasOwnProperty.call(sortObject, 'order'));

    if (!hasSorterPayload) {
      return;
    }

    const field = sortObject?.field ? String(sortObject.field) : undefined;
    const order = sortObject?.order === 'ascend' ? 'asc' : sortObject?.order === 'descend' ? 'desc' : undefined;
    const normalizedSortBy = sortBy || undefined;

    if (field !== normalizedSortBy || order !== sortOrder) {
      onSortChange(field, order);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search PO Number, Supplier..."
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            style={{ width: 300 }}
          />

          <Select
            mode="multiple"
            maxTagCount="responsive"
            value={selectedSites}
            placeholder="Select sites"
            options={availableSites.map((site) => ({ label: site, value: site }))}
            onChange={(values) => onSelectedSitesChange(values)}
            style={{ minWidth: 280 }}
          />

          <Segmented
            value={pinFilter}
            onChange={(value) => onPinFilterChange(String(value))}
            options={[
              { label: 'All', value: 'all' },
              {
                label: (
                  <Badge count={pinnedCount} size="small" offset={[8, -1]}>
                    <span style={{ paddingRight: 10 }}>Pinned</span>
                  </Badge>
                ),
                value: 'pinned',
              },
            ]}
          />
        </Space>
      </Space>

      <Table<MrpRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 2200, y: 560 }}
        pagination={{
          current: page + 1,
          pageSize,
          total: rowCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '60', '100'],
          showTotal: (total) => `Total ${total}`,
        }}
        onChange={onTableChange}
        rowSelection={{
          selectedRowKeys: [...selectedRowIds],
          onChange: (keys) =>
            onSelectedRowIdsChange(
              keys.filter((key): key is string | number =>
                typeof key === 'string' || typeof key === 'number'
              )
            ),
        }}
        locale={{
          emptyText: selectedSites.length === 0 ? 'No sites selected' : 'No matching line items found',
        }}
        onRow={(row) => ({
          onClick: () => onRowClick(row),
        })}
      />
    </Space>
  );
};

export default AntdMrpExceptionTable;
