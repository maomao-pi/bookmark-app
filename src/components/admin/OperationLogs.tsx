import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Tag, Typography, Button, Dropdown, Modal, message, type MenuProps } from 'antd';
import { MoreOutlined, RollbackOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { OperationLogItem, PageData } from '../../types/admin';

const { Title } = Typography;
const { Search } = Input;

interface OperationLogsProps {
  api: AdminApi | null;
}

export function OperationLogs({ api }: OperationLogsProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OperationLogItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [actionFilter, setActionFilter] = useState<string | undefined>();

  const loadData = useCallback(async (page = 1, pageSizeOverride?: number) => {
    if (!api) return;
    const size = pageSizeOverride ?? pagination.pageSize;
    setLoading(true);
    try {
      const result: PageData<OperationLogItem> = await api.getLogs({
        pageNum: page,
        pageSize: size,
        action: actionFilter,
      });
      setData(result.records);
      setPagination(prev => ({
        ...prev,
        current: result.pageNum,
        total: result.total,
        pageSize: size,
      }));
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.pageSize, actionFilter]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleTableChange = (newPagination: any) => {
    const page = newPagination.current;
    const pageSize = newPagination.pageSize ?? pagination.pageSize;
    setPagination(prev => ({ ...prev, current: page, pageSize }));
    loadData(page, pageSize);
  };

  const handleRevert = async (record: OperationLogItem) => {
    if (!api) return;
    try {
      await api.revertLog(record.id);
      message.success('撤回成功');
      loadData(pagination.current);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '撤回失败');
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: '执行者',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 140,
      render: (operatorName?: string) => operatorName || '-',
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag color="blue">{action}</Tag>
      ),
    },
    {
      title: '操作对象',
      dataIndex: 'target',
      key: 'target',
    },
    {
      title: '操作内容',
      dataIndex: 'actionText',
      key: 'actionText',
      render: (_: string, record: OperationLogItem) => record.actionText || record.detail || '-',
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag color={result === 'success' ? 'green' : 'red'}>
          {result === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'operation',
      width: 80,
      render: (_: unknown, record: OperationLogItem) => {
        const items: MenuProps['items'] = [];
        if (record.revocable === 1 && record.reverted !== 1) {
          items.push({
            key: 'revert',
            label: '撤回',
            icon: <RollbackOutlined />,
            onClick: () => {
              Modal.confirm({
                title: '确定撤回这条操作吗？',
                okText: '确定',
                cancelText: '取消',
                onOk: () => handleRevert(record),
              });
            },
          });
        }
        if (items.length === 0) {
          return <span style={{ color: '#94a3b8' }}>-</span>;
        }
        return (
          <Dropdown menu={{ items }} trigger={['click']} getPopupContainer={() => document.body}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>
          操作日志
        </Title>
        <Search
          placeholder="搜索操作类型"
          onSearch={(value) => setActionFilter(value || undefined)}
          style={{ width: 300 }}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
      />
    </div>
  );
}
