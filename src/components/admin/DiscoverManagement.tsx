import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Input, Tag, Modal, Typography, Popconfirm, message, Select, Form, Row, Col, Dropdown, Switch, type MenuProps } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, ExportOutlined, MoreOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { DiscoverItem, CategoryItem, PageData } from '../../types/admin';

const { Title, Text } = Typography;
const { Search } = Input;

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
};

interface DiscoverManagementProps {
  api: AdminApi | null;
}

export function DiscoverManagement({ api }: DiscoverManagementProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiscoverItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<'visible' | 'hidden' | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DiscoverItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [batchStatus, setBatchStatus] = useState<'visible' | 'hidden'>('visible');
  const [batchCategoryId, setBatchCategoryId] = useState<number | undefined>();
  const [form] = Form.useForm();
  const lastUrlRef = useRef('');

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!modalVisible) {
      return;
    }

    const checkAndFetchFavicon = () => {
      const url = form.getFieldValue('url')?.trim() || '';
      if (!url || !isValidHttpUrl(url)) {
        lastUrlRef.current = '';
        return;
      }

      if (url === lastUrlRef.current) {
        return;
      }

      lastUrlRef.current = url;
      const faviconUrl = getFaviconUrl(url);
      if (faviconUrl) {
        form.setFieldValue('favicon', faviconUrl);
      }
    };

    checkAndFetchFavicon();

    const interval = setInterval(checkAndFetchFavicon, 500);
    return () => clearInterval(interval);
  }, [modalVisible, form]);

  const loadCategories = useCallback(async () => {
    if (!api) return;
    try {
      const result = await api.getAllCategories('discover');
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [api]);

  const loadData = useCallback(async (page = 1, pageSizeOverride?: number) => {
    if (!api) return;
    const size = pageSizeOverride ?? pagination.pageSize;
    setLoading(true);
    try {
      const result: PageData<DiscoverItem> = await api.getDiscoverList({
        pageNum: page,
        pageSize: size,
        keyword: keyword || undefined,
        categoryId: categoryFilter,
        status: statusFilter,
      });
      setData(result.records);
      setPagination(prev => ({
        ...prev,
        current: result.pageNum,
        total: result.total,
        pageSize: size,
      }));
    } catch (error) {
      message.error('加载发现内容失败');
    } finally {
      setLoading(false);
    }
  }, [api, pagination.pageSize, keyword, categoryFilter, statusFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadData(1);
  }, []);

  const handleSearch = (value: string) => {
    setKeyword(value);
    loadData(1);
  };

  const handleTableChange = (newPagination: any) => {
    const page = newPagination.current;
    const pageSize = newPagination.pageSize ?? pagination.pageSize;
    setPagination(prev => ({ ...prev, current: page, pageSize }));
    loadData(page, pageSize);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: DiscoverItem) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await api.updateDiscover(editingItem.id, values);
        message.success('内容已更新');
      } else {
        await api.createDiscover(values);
        message.success('内容已创建');
      }
      setModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (item: DiscoverItem) => {
    if (!api) return;
    try {
      await api.deleteDiscover(item.id);
      message.success('内容已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggleStatus = async (item: DiscoverItem) => {
    if (!api) return;
    try {
      const newStatus = item.status === 'visible' ? 'hidden' : 'visible';
      await api.updateDiscover(item.id, { status: newStatus });
      message.success(newStatus === 'visible' ? '内容已显示' : '内容已隐藏');
      loadData(pagination.current);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleViewDetail = (item: DiscoverItem) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  const handleExport = async () => {
    if (!api) return;
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (categoryFilter) params.append('categoryId', String(categoryFilter));
      if (statusFilter) params.append('status', statusFilter);
      
      window.open(`${api['baseUrl']}/api/admin/discover/export?${params.toString()}`, '_blank');
      message.success('开始导出');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleBatchDelete = async () => {
    if (!api || selectedRowKeys.length === 0) return;
    try {
      const ids = selectedRowKeys.map(key => Number(key));
      await api.batchDeleteDiscover(ids);
      message.success(`已删除 ${ids.length} 条内容`);
      setSelectedRowKeys([]);
      loadData(pagination.current);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleBatchUpdateStatus = async () => {
    if (!api || selectedRowKeys.length === 0) return;
    try {
      const ids = selectedRowKeys.map(key => Number(key));
      await api.batchUpdateDiscoverStatus(ids, batchStatus);
      message.success(`已更新 ${ids.length} 条内容状态`);
      setStatusModalVisible(false);
      setSelectedRowKeys([]);
      loadData(pagination.current);
    } catch (error) {
      message.error('批量更新状态失败');
    }
  };

  const handleBatchUpdateCategory = async () => {
    if (!api || selectedRowKeys.length === 0 || !batchCategoryId) return;
    try {
      const ids = selectedRowKeys.map(key => Number(key));
      await api.batchUpdateDiscoverCategory(ids, batchCategoryId);
      message.success(`已移动 ${ids.length} 条内容到分类`);
      setCategoryModalVisible(false);
      setSelectedRowKeys([]);
      loadData(pagination.current);
    } catch (error) {
      message.error('批量移动分类失败');
    }
  };

  const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));

  const columns = [
    {
      title: '图标',
      dataIndex: 'favicon',
      key: 'favicon',
      width: 60,
      render: (favicon: string, record: DiscoverItem) => (
        favicon ? (
          <img src={favicon} alt="" style={{ width: 20, height: 20 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span style={{ fontWeight: 500, color: '#1677ff' }}>{record.title?.charAt(0) || '网'}</span>
        )
      ),
    },
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: DiscoverItem) => (
        <a
          onClick={(e) => { e.preventDefault(); handleViewDetail(record); }}
          style={{ color: '#1677ff', cursor: 'pointer' }}
        >
          {title}
        </a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      key: 'categoryId',
      render: (categoryId: number) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? <Tag color="green">{category.name}</Tag> : '-';
      },
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string, record: DiscoverItem) => (
        <Switch
          checked={status === 'visible'}
          checkedChildren="显示"
          unCheckedChildren="隐藏"
          onChange={() => handleToggleStatus(record)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: DiscoverItem) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => handleViewDetail(record),
          },
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(record),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 16 }}>发现内容管理</Title>
        <Row gutter={16}>
          <Col>
            <Search
              placeholder="搜索标题"
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="选择分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ label: '全部分类', value: undefined }, ...categoryOptions]}
              style={{ width: 160 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="状态"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '全部状态', value: undefined },
                { label: '显示', value: 'visible' },
                { label: '隐藏', value: 'hidden' },
              ]}
              style={{ width: 100 }}
              allowClear
            />
          </Col>
          <Col>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Col>
          {selectedRowKeys.length > 0 && (
            <>
              <Col>
                <Popconfirm
                  title={`确定删除选中的 ${selectedRowKeys.length} 条内容吗？`}
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              </Col>
              <Col>
                <Button onClick={() => setStatusModalVisible(true)}>
                  批量更新状态
                </Button>
              </Col>
              <Col>
                <Button onClick={() => setCategoryModalVisible(true)}>
                  批量移动分类
                </Button>
              </Col>
            </>
          )}
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editingItem ? '编辑发现内容' : '新增发现内容'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="网址" rules={[{ required: true }]}>
            <Input placeholder="输入网址后将自动获取图标" />
          </Form.Item>
          <Form.Item name="favicon" label="网站图标">
            <Input placeholder="自动获取，也可手动输入图标URL" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select options={categoryOptions} allowClear />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="visible">
            <Select
              options={[
                { label: '显示', value: 'visible' },
                { label: '隐藏', value: 'hidden' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="内容详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedItem && (
            <Button
              key="open"
              type="primary"
              onClick={() => window.open(selectedItem.url, '_blank')}
            >
              打开链接
            </Button>
          ),
        ]}
      >
        {selectedItem && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">标题：</Text>
              <Text strong style={{ display: 'block' }}>{selectedItem.title}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">网址：</Text>
              <br />
              <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                {selectedItem.url}
              </a>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">描述：</Text>
              <Text style={{ display: 'block' }}>{selectedItem.description || '-'}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">创建时间：</Text>
              <Text>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : '-'}</Text>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="批量更新状态"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        onOk={handleBatchUpdateStatus}
        okText="确定"
        cancelText="取消"
      >
        <p>已选择 <Text strong>{selectedRowKeys.length}</Text> 条内容</p>
        <Form.Item label="新状态">
          <Select
            value={batchStatus}
            onChange={setBatchStatus}
            options={[
              { label: '显示', value: 'visible' },
              { label: '隐藏', value: 'hidden' },
            ]}
            style={{ width: 200 }}
          />
        </Form.Item>
      </Modal>

      <Modal
        title="批量移动分类"
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        onOk={handleBatchUpdateCategory}
        okText="确定"
        cancelText="取消"
      >
        <p>已选择 <Text strong>{selectedRowKeys.length}</Text> 条内容</p>
        <Form.Item label="目标分类">
          <Select
            value={batchCategoryId}
            onChange={setBatchCategoryId}
            options={categoryOptions}
            style={{ width: 200 }}
            placeholder="选择分类"
          />
        </Form.Item>
      </Modal>
    </div>
  );
}
