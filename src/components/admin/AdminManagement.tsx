import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Typography, Popconfirm, message, Select, Form, Avatar, Checkbox, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { AdminUser, PageData } from '../../types/admin';

const { Title } = Typography;
const { Search } = Input;

interface AdminManagementProps {
  api: AdminApi | null;
  currentAdminRole?: string;
}

export function AdminManagement({ api, currentAdminRole }: AdminManagementProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [selectedAdminForPermission, setSelectedAdminForPermission] = useState<AdminUser | null>(null);
  const [permissionForm] = Form.useForm();
  const [form] = Form.useForm();

  const isSuperAdmin = currentAdminRole === 'super_admin';

  const moduleOptions = [
    { label: '用户管理', value: 'users' },
    { label: '收藏管理', value: 'bookmarks' },
    { label: '发现管理', value: 'discover' },
    { label: '分类管理', value: 'categories' },
    { label: '文章管理', value: 'articles' },
    { label: '操作日志', value: 'logs' },
    { label: '系统设置', value: 'settings' },
    { label: '权限管理', value: 'admins' },
  ];

  const loadData = useCallback(async (page = 1, pageSizeOverride?: number) => {
    if (!api) return;
    const size = pageSizeOverride ?? pagination.pageSize;
    setLoading(true);
    try {
      const result: PageData<AdminUser> = await api.getAdmins({
        pageNum: page,
        pageSize: size,
        keyword: keyword || undefined,
        sortField: 'createdAt',
        sortOrder: 'asc',
      });
      setData(result.records);
      setPagination(prev => ({
        ...prev,
        current: result.pageNum,
        total: result.total,
        pageSize: size,
      }));
    } catch (error) {
      message.error('加载管理员数据失败');
    } finally {
      setLoading(false);
    }
  }, [api, pagination.pageSize, keyword]);

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
    setEditingAdmin(null);
    form.resetFields();
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({ status: 'active', role: 'admin' });
    }, 0);
  };

  const handleEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    form.setFieldsValue(admin);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      console.log('Saving admin:', values);
      const payload = {
        ...values,
        role: values.role || 'admin',
        status: values.status || 'active',
      };
      if (editingAdmin) {
        await api.updateAdmin(editingAdmin.id, payload);
        message.success('管理员已更新');
      } else {
        await api.createAdmin(payload);
        message.success('管理员已创建');
      }
      setModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      console.error('Save admin error:', error);
      message.error('保存失败: ' + (error instanceof Error ? error.message : '请检查输入'));
    }
  };

  const handleDelete = async (admin: AdminUser) => {
    if (!api) return;
    try {
      await api.deleteAdmin(admin.id);
      message.success('管理员已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    if (!api) return;
    try {
      const newStatus = admin.status === 'active' ? 'disabled' : 'active';
      await api.updateAdmin(admin.id, { status: newStatus });
      message.success(newStatus === 'active' ? '管理员已启用' : '管理员已禁用');
      loadData(pagination.current);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleEditPermissions = (admin: AdminUser) => {
    setSelectedAdminForPermission(admin);
    const permissions = admin.permissions ? JSON.parse(admin.permissions) : [];
    permissionForm.setFieldsValue({ permissions });
    setPermissionModalVisible(true);
  };

  const handleSavePermissions = async () => {
    if (!api || !selectedAdminForPermission) return;
    try {
      const values = await permissionForm.validateFields();
      const permissionsJson = JSON.stringify(values.permissions || []);
      await api.updateAdminPermissions(selectedAdminForPermission.id, permissionsJson);
      message.success('权限已更新');
      setPermissionModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      message.error('权限保存失败');
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
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar: string) => <Avatar src={avatar} icon={!avatar && <UserOutlined />} />,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'super_admin' ? 'red' : 'blue'}>
          {role === 'super_admin' ? '超级管理员' : '普通管理员'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string, record: AdminUser) => (
        <Switch
          checked={status === 'active'}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={() => handleToggleStatus(record)}
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: AdminUser) => (
        <Space size="small">
          {isSuperAdmin && record.role !== 'super_admin' && (
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleEditPermissions(record)}
            >
              权限
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {isSuperAdmin && (
            <Popconfirm
              title="确定删除此管理员吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>
          权限管理
        </Title>
        <Space>
          <Search
            placeholder="搜索用户名"
            onSearch={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          {isSuperAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增管理员
            </Button>
          )}
        </Space>
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
        onChange={handleTableChange}
      />

      <Modal
        title={editingAdmin ? '编辑管理员' : '新增管理员'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" disabled={!!editingAdmin} />
          </Form.Item>
          {!editingAdmin && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          {isSuperAdmin && (
            <Form.Item name="role" label="角色" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: '普通管理员', value: 'admin' },
                  { label: '超级管理员', value: 'super_admin' },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '正常', value: 'active' },
                { label: '禁用', value: 'disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分配权限"
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        onOk={handleSavePermissions}
      >
        <Form form={permissionForm} layout="vertical">
          <Form.Item
            name="permissions"
            label="可访问模块"
            rules={[{ required: true, message: '请选择至少一个模块' }]}
          >
            <Checkbox.Group options={moduleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
