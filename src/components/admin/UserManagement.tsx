import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Modal, Typography, Popconfirm, message, Avatar, Form, Switch, Tag } from 'antd';
import { DeleteOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { AppUser, PageData } from '../../types/admin';

const { Title, Text } = Typography;
const { Search, Password } = Input;

interface UserManagementProps {
  api: AdminApi | null;
}

export function UserManagement({ api }: UserManagementProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AppUser[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();

  const generateAvatar = (username: string) => {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=random`;
  };

  const loadData = useCallback(async (page = 1, pageSizeOverride?: number) => {
    if (!api) return;
    const size = pageSizeOverride ?? pagination.pageSize;
    setLoading(true);
    try {
      const result: PageData<AppUser> = await api.getUsers({
        pageNum: page,
        pageSize: size,
        keyword: keyword || undefined,
      });
      setData(result.records);
      setPagination(prev => ({
        ...prev,
        current: result.pageNum,
        total: result.total,
        pageSize: size,
      }));
    } catch (error) {
      message.error('加载用户数据失败');
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

  const handleStatusChange = async (user: AppUser) => {
    if (!api) return;
    try {
      const newStatus = user.status === 'active' ? 'disabled' : 'active';
      await api.updateUserStatus(user.id, newStatus);
      message.success(newStatus === 'active' ? '用户已启用' : '用户已禁用');
      loadData(pagination.current);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (!api) return;
    try {
      await api.deleteUser(user.id);
      message.success('用户已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleViewDetail = async (user: AppUser) => {
    if (!api) return;
    setSelectedUser(user);
    try {
      const detail = await api.getUserDetail(user.id);
      setUserDetail(detail);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取用户详情失败');
    }
  };

  const handleChangePassword = (user: AppUser) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!api || !selectedUser) return;
    try {
      const values = await passwordForm.validateFields();
      await api.updateUserPassword(selectedUser.id, values.newPassword);
      message.success('密码已重置');
      setPasswordModalVisible(false);
    } catch (error) {
      message.error('密码重置失败');
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
      render: (_: string, record: AppUser) => (
        <Avatar 
          src={record.avatar || generateAvatar(record.username)} 
          icon={!record.avatar}
        />
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '收藏数',
      dataIndex: 'bookmarkCount',
      key: 'bookmarkCount',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string, record: AppUser) => (
        <Switch
          checked={status === 'active'}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={() => handleStatusChange(record)}
        />
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: AppUser) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleChangePassword(record)}
          >
            改密
          </Button>
          <Popconfirm
            title="确定删除此用户吗？"
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
          用户管理
        </Title>
        <Search
          placeholder="搜索用户名或邮箱"
          onSearch={handleSearch}
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
        onChange={handleTableChange}
      />

      <Modal
        title="用户详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedUser && userDetail && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">用户名：</Text>
              <Text>{selectedUser.username}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">邮箱：</Text>
              <Text>{selectedUser.email}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">收藏总数：</Text>
              <Text>{userDetail.bookmarkCount}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">分类分布：</Text>
              <div style={{ marginTop: 8 }}>
                {Object.entries(userDetail.categoryDistribution || {}).map(([name, count]: [string, any]) => (
                  <Tag key={name} color="blue">{name}: {count}</Tag>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">最近收藏：</Text>
              <ul style={{ marginTop: 8 }}>
                {(userDetail.recentBookmarks || []).slice(0, 5).map((b: any) => (
                  <li key={b.id}>
                    <a href={b.url} target="_blank" rel="noopener noreferrer">{b.title}</a>
                  </li>
                ))}
              </ul>
            </div>
            </div>
          )}
      </Modal>

      <Modal
        title="重置用户密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={handleSavePassword}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Password placeholder="请确认新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
