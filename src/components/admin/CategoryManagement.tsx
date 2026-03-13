import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Typography, Popconfirm, message, Form, Tabs, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { CategoryItem, PageData } from '../../types/admin';

const { Title, Text } = Typography;

interface CategoryManagementProps {
  api: AdminApi | null;
}

export function CategoryManagement({ api }: CategoryManagementProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CategoryItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [activeTab, setActiveTab] = useState('user');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [form] = Form.useForm();

  const loadData = useCallback(async (page = 1) => {
    if (!api) return;
    setLoading(true);
    try {
      const result: PageData<CategoryItem> = await api.getCategories({
        pageNum: page,
        pageSize: pagination.pageSize,
        type: activeTab as 'user' | 'discover',
      });
      setData(result.records);
      setPagination({
        ...pagination,
        current: result.pageNum,
        total: result.total,
      });
    } catch (error) {
      message.error('加载分类数据失败');
    } finally {
      setLoading(false);
    }
  }, [api, pagination.pageSize, activeTab]);

  useEffect(() => {
    loadData(1);
  }, [activeTab]);

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (category: CategoryItem) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      console.log('Form values:', values);
      console.log('Active tab:', activeTab);
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, values);
        message.success('分类已更新');
      } else {
        const payload = { ...values, type: activeTab as 'user' | 'discover' };
        console.log('Creating category with:', payload);
        await api.createCategory(payload);
        message.success('分类已创建');
      }
      setModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      console.error('Save error:', error);
      message.error('保存失败');
    }
  };

  const handleDelete = async (category: CategoryItem) => {
    if (!api) return;
    try {
      await api.deleteCategory(category.id);
      message.success('分类已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSort = async (category: CategoryItem, direction: 'up' | 'down') => {
    if (!api) return;
    const currentIndex = data.findIndex(c => c.id === category.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === data.length - 1) return;
    
    const newSort = direction === 'up' 
      ? (data[currentIndex - 1].sort || 0) + 1 
      : (data[currentIndex + 1].sort || 0) - 1;
    
    try {
      await api.updateCategorySort(category.id, newSort);
      loadData(pagination.current);
    } catch (error) {
      message.error('排序失败');
    }
  };

  const handleToggleStatus = async (category: CategoryItem) => {
    if (!api) return;
    try {
      const newStatus = category.status === 'visible' ? 'hidden' : 'visible';
      await api.updateCategory(category.id, { status: newStatus });
      message.success(newStatus === 'visible' ? '分类已显示' : '分类已隐藏');
      loadData(pagination.current);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '排序',
      key: 'sort',
      width: 80,
      render: (_: any, record: CategoryItem, index: number) => (
        <Space direction="vertical" size={0}>
          <Button
            type="text"
            size="small"
            icon={<UpOutlined />}
            disabled={index === 0}
            onClick={() => handleSort(record, 'up')}
          />
          <Button
            type="text"
            size="small"
            icon={<DownOutlined />}
            disabled={index === data.length - 1}
            onClick={() => handleSort(record, 'down')}
          />
        </Space>
      ),
    },
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CategoryItem) => (
        <Space>
          {record.icon && <span>{record.icon}</span>}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'user' ? 'blue' : 'green'}>
          {type === 'user' ? '用户分类' : '发现分类'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string, record: CategoryItem) => (
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
      width: 140,
      render: (_: any, record: CategoryItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此分类吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>
          分类管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增分类
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'user',
            label: '用户分类',
          },
          {
            key: 'discover',
            label: '发现分类',
          },
        ]}
      />

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="请输入图标 Emoji 或类名" />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
