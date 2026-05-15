import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Modal, Typography, message, Avatar, Form, Switch, Tag, Dropdown, type MenuProps, Select, Divider, Checkbox, Tabs } from 'antd';
import { DeleteOutlined, EyeOutlined, KeyOutlined, MoreOutlined, UserOutlined, SettingOutlined, SafetyOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { AppUser, PageData, UserPermissions } from '../../types/admin';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const { Title, Text } = Typography;
const { Search, Password } = Input;

interface UserManagementProps {
  api: AdminApi | null;
}

// 菜单权限配置选项
const menuPermissionOptions = [
  { label: '仪表盘', value: 'dashboard' },
  { label: '用户管理', value: 'users' },
  { label: '收藏管理', value: 'bookmarks' },
  { label: '发现管理', value: 'discover' },
  { label: '分类管理', value: 'categories' },
  { label: '内容管理', value: 'articles' },
  { label: '操作日志', value: 'logs' },
  { label: '系统设置', value: 'settings' },
  { label: '权限管理', value: 'admins' },
];

// 标签页权限配置 - 按菜单分组
const tabPermissionGroups: Record<string, { label: string; tabs: Record<string, string> }> = {
  bookmarks: {
    label: '收藏管理',
    tabs: { list: '列表', add: '新增', edit: '编辑', delete: '删除', batchDelete: '批量删除' }
  },
  categories: {
    label: '分类管理',
    tabs: { list: '列表', add: '新增', edit: '编辑', delete: '删除', removeDuplicates: '去重' }
  },
  articles: {
    label: '内容管理',
    tabs: { list: '列表', add: '新增', edit: '编辑', delete: '删除' }
  },
  discover: {
    label: '发现管理',
    tabs: { list: '列表', add: '新增', edit: '编辑', delete: '删除', batchDelete: '批量删除', batchStatus: '批量状态', removeDuplicates: '去重' }
  },
  logs: {
    label: '操作日志',
    tabs: { list: '列表', revert: '撤销' }
  },
  users: {
    label: '用户管理',
    tabs: { list: '列表', add: '新增', edit: '编辑', delete: '删除', view: '查看详情', resetPassword: '重置密码', changeRole: '修改角色', configurePermissions: '配置权限' }
  },
  settings: {
    label: '系统设置',
    tabs: { view: '查看', edit: '编辑', testAi: '测试AI' }
  },
  admins: {
    label: '权限管理',
    tabs: { list: '列表', add: '新增', edit: '编辑', delete: '删除', resetPassword: '重置密码', configurePermissions: '配置权限' }
  },
};

/** Checkbox.Group 需要 string[]，存储格式为 { key: true } */
function flagsToCheckedKeys(flags: Record<string, boolean> | undefined): string[] {
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return [];
  return Object.entries(flags)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
}

function checkedKeysToFlags(keys: string[] | undefined): Record<string, boolean> {
  if (!keys?.length) return {};
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function parseUserPermissions(raw: string | undefined): UserPermissions {
  if (!raw) return { menus: {}, tabs: {} };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        menus: Object.fromEntries(parsed.map((key) => [String(key), true])),
        tabs: {},
      };
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as UserPermissions;
      return {
        menus: obj.menus && !Array.isArray(obj.menus) ? obj.menus : {},
        tabs: obj.tabs && typeof obj.tabs === 'object' && !Array.isArray(obj.tabs) ? obj.tabs : {},
      };
    }
  } catch (e) {
    console.error('Failed to parse permissions:', e);
  }
  return { menus: {}, tabs: {} };
}

function permissionsToFormValues(permissions: UserPermissions) {
  const tabsForm: Record<string, string[]> = {};
  Object.keys(tabPermissionGroups).forEach((groupKey) => {
    const groupTabs = permissions.tabs?.[groupKey as keyof UserPermissions['tabs']];
    tabsForm[groupKey] =
      groupTabs && typeof groupTabs === 'object' && !Array.isArray(groupTabs)
        ? flagsToCheckedKeys(groupTabs as Record<string, boolean>)
        : [];
  });
  return {
    menus: flagsToCheckedKeys(permissions.menus as Record<string, boolean> | undefined),
    tabs: tabsForm,
  };
}

function formValuesToPermissions(values: {
  menus?: string[];
  tabs?: Record<string, string[]>;
}): UserPermissions {
  const tabs: NonNullable<UserPermissions['tabs']> = {};
  if (values.tabs) {
    Object.entries(values.tabs).forEach(([groupKey, checked]) => {
      if (checked?.length) {
        (tabs as Record<string, Record<string, boolean>>)[groupKey] = checkedKeysToFlags(checked);
      }
    });
  }
  return {
    menus: checkedKeysToFlags(values.menus),
    tabs,
  };
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
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleForm] = Form.useForm();
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionForm] = Form.useForm();

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
  }, [loadData]);

  const handleSearch = (value: string) => {
    setKeyword(value);
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

  const handleChangeRole = (user: AppUser) => {
    setSelectedUser(user);
    roleForm.setFieldsValue({ role: user.role });
    setRoleModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!api || !selectedUser) return;
    try {
      const values = await roleForm.validateFields();
      await api.updateUserRole(selectedUser.id, values.role);
      message.success('角色已更新');
      setRoleModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      message.error('角色更新失败');
    }
  };

  const handleConfigurePermissions = (user: AppUser) => {
    setSelectedUser(user);
    permissionForm.resetFields();
    setPermissionModalVisible(true);
  };

  const handlePermissionModalAfterOpen = (open: boolean) => {
    if (open && selectedUser) {
      permissionForm.setFieldsValue(
        permissionsToFormValues(parseUserPermissions(selectedUser.permissions)),
      );
    }
  };

  const handleSavePermissions = async () => {
    if (!api || !selectedUser) return;
    try {
      const values = await permissionForm.validateFields();
      const permissions = formValuesToPermissions(values);
      await api.updateUserPermissions(selectedUser.id, JSON.stringify(permissions));
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
      render: (_: string, record: AppUser) => {
        const avatarSrc = resolveMediaUrl(record.avatar) || generateAvatar(record.username);
        return (
          <Avatar
            src={avatarSrc}
            icon={!record.avatar ? <UserOutlined /> : undefined}
          />
        );
      },
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
      render: (nickname?: string) => nickname || '-',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone?: string) => phone || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
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
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'default'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
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
      width: 80,
      render: (_: any, record: AppUser) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => handleViewDetail(record),
          },
          {
            key: 'password',
            label: '改密',
            icon: <KeyOutlined />,
            onClick: () => handleChangePassword(record),
          },
          {
            key: 'role',
            label: '设置角色',
            icon: <SafetyOutlined />,
            onClick: () => handleChangeRole(record),
          },
          {
            key: 'permissions',
            label: '配置权限',
            icon: <SettingOutlined />,
            onClick: () => handleConfigurePermissions(record),
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定删除此用户吗？',
                okText: '确定',
                cancelText: '取消',
                onOk: () => handleDelete(record),
              });
            },
          },
        ];
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
          用户管理
        </Title>
        <Search
          placeholder="搜索用户名/姓名/电话/邮箱"
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
        scroll={{ x: 'max-content' }}
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
              <Text type="secondary">姓名：</Text>
              <Text>{selectedUser.nickname || '-'}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">电话：</Text>
              <Text>{selectedUser.phone || '-'}</Text>
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

      <Modal
        title="设置用户角色"
        open={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        onOk={handleSaveRole}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              options={[
                { label: '普通用户', value: 'user' },
                { label: '管理员', value: 'admin' },
              ]}
              placeholder="请选择角色"
            />
          </Form.Item>
          <div style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            <p>• 普通用户：只能使用收藏功能，无法访问管理后台</p>
            <p>• 管理员：可访问管理后台，具体功能权限可单独配置</p>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`配置用户权限${selectedUser ? ` - ${selectedUser.username}` : ''}`}
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        onOk={handleSavePermissions}
        afterOpenChange={handlePermissionModalAfterOpen}
        destroyOnClose
        width={800}
      >
        <Form form={permissionForm} layout="vertical" preserve={false}>
          <Divider orientation="left">菜单权限</Divider>
          <Form.Item name="menus">
            <Checkbox.Group options={menuPermissionOptions} />
          </Form.Item>

          <Divider orientation="left">标签页权限</Divider>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <Tabs
              defaultActiveKey="bookmarks"
              items={Object.entries(tabPermissionGroups).map(([key, group]) => ({
                key,
                label: group.label,
                children: (
                  <div style={{ padding: '8px 0' }}>
                    <Form.Item name={['tabs', key]}>
                      <Checkbox.Group>
                        {Object.entries(group.tabs).map(([tabKey, tabLabel]) => (
                          <Checkbox key={tabKey} value={tabKey}>
                            {tabLabel}
                          </Checkbox>
                        ))}
                      </Checkbox.Group>
                    </Form.Item>
                  </div>
                ),
              }))}
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
