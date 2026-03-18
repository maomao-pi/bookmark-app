import { useState, useEffect } from 'react';
import { Table, Typography, Tag, Select, Button, Space } from 'antd';
import { ReloadOutlined, RobotOutlined } from '@ant-design/icons';
import type { AdminApi } from '../../services/adminApi';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface AiLogRecord {
  id: number;
  userId: number;
  analysisType: string;
  source: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  success: number;
  errorMessage?: string;
  createdAt: string;
}

interface AiLogsProps {
  api: AdminApi | null;
}

export function AiLogs({ api }: AiLogsProps) {
  const [data, setData] = useState<AiLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const loadData = async (page = pageNum) => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getAiAnalysisLogs({ pageNum: page, pageSize, analysisType: typeFilter });
      const records = (res as unknown as { records: AiLogRecord[]; total: number });
      setData(records.records || []);
      setTotal(records.total || 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [typeFilter]);

  const columns: ColumnsType<AiLogRecord> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '用户 ID', dataIndex: 'userId', width: 90 },
    {
      title: '分析类型',
      dataIndex: 'analysisType',
      width: 130,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '模型', dataIndex: 'model', width: 100 },
    { title: '耗时(ms)', dataIndex: 'durationMs', width: 90, sorter: (a, b) => a.durationMs - b.durationMs },
    { title: 'Tokens', dataIndex: 'tokensUsed', width: 90 },
    {
      title: '状态',
      dataIndex: 'success',
      width: 80,
      render: (v: number) => <Tag color={v ? 'success' : 'error'}>{v ? '成功' : '失败'}</Tag>,
    },
    { title: '错误信息', dataIndex: 'errorMessage', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 160, sorter: (a, b) => a.createdAt.localeCompare(b.createdAt) },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <RobotOutlined style={{ marginRight: 8 }} />AI 分析日志
      </Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="分析类型"
          style={{ width: 180 }}
          onChange={v => setTypeFilter(v)}
          options={[
            { label: 'bookmark_analysis', value: 'bookmark_analysis' },
            { label: 'organize_suggest', value: 'organize_suggest' },
            { label: 'classification', value: 'classification' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => loadData(1)}>刷新</Button>
      </Space>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: pageNum,
          pageSize,
          total,
          onChange: (page) => {
            setPageNum(page);
            loadData(page);
          },
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </div>
  );
}
