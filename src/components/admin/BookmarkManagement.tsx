import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Input, Tag, Modal, Typography, message, Select, Form, Row, Col, Dropdown, type MenuProps } from 'antd';
import { DeleteOutlined, ExportOutlined, EditOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { BookmarkItem, CategoryItem, PageData, AppUser, UserDetailResponse } from '../../types/admin';

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

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

interface BookmarkManagementProps {
  api: AdminApi | null;
}

export function BookmarkManagement({ api }: BookmarkManagementProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookmarkItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkItem | null>(null);
  const [userMap, setUserMap] = useState<Record<number, AppUser>>({});
  const [userDetailModalVisible, setUserDetailModalVisible] = useState(false);
  const [userDetail, setUserDetail] = useState<UserDetailResponse | null>(null);
  const [form] = Form.useForm();
  const lastUrlRef = useRef('');
  const userMapRef = useRef<Record<number, AppUser>>({});

  useEffect(() => {
    userMapRef.current = userMap;
  }, [userMap]);

  useEffect(() => {
    if (!editModalVisible) return;
    const checkAndFetchFavicon = () => {
      const url = form.getFieldValue('url')?.trim() || '';
      if (!url || !isValidHttpUrl(url)) {
        lastUrlRef.current = '';
        return;
      }
      if (url === lastUrlRef.current) return;
      lastUrlRef.current = url;
      const faviconUrl = getFaviconUrl(url);
      if (faviconUrl) form.setFieldValue('favicon', faviconUrl);
    };
    checkAndFetchFavicon();
    const interval = setInterval(checkAndFetchFavicon, 500);
    return () => clearInterval(interval);
  }, [editModalVisible, form]);

  const loadCategories = useCallback(async () => {
    if (!api) return;
    try {
      const result = await api.getAllCategories('user');
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
      const result: PageData<BookmarkItem> = await api.getBookmarks({
        pageNum: page,
        pageSize: size,
        keyword: keyword || undefined,
        categoryId: categoryFilter,
        source: sourceFilter,
      });
      const records = result.records;
      setData(records);
      setPagination(prev => ({
        ...prev,
        current: result.pageNum,
        total: result.total,
        pageSize: size,
      }));

      const userIds = [...new Set(
        records
          .filter(b => (b as BookmarkItem & { source?: string }).source !== 'admin')
          .map((b): number | null => (b as BookmarkItem & { user_id?: number }).userId ?? (b as BookmarkItem & { user_id?: number }).user_id ?? null)
          .filter((id): id is number => id != null && id > 0)
      )];
      const missing = userIds.filter(id => !userMapRef.current[id]);
      if (missing.length > 0) {
        const details = await Promise.all(
          missing.map(id => api.getUserDetail(id).catch(() => null))
        );
        const newMap: Record<number, AppUser> = {};
        details.forEach((d, i) => {
          if (d && missing[i] != null) newMap[missing[i]!] = d.user;
        });
        setUserMap(prev => ({ ...prev, ...newMap }));
      }
    } catch (error) {
      message.error('加载收藏数据失败');
    } finally {
      setLoading(false);
    }
  }, [api, pagination.pageSize, keyword, categoryFilter, sourceFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadUsers = useCallback(async () => {
    if (!api) return;
    try {
      const result = await api.getUsers({ pageNum: 1, pageSize: 500 });
      const map: Record<number, AppUser> = {};
      result.records.forEach(u => { map[u.id] = u; });
      setUserMap(map);
    } catch {
      // 忽略，表格中未命中时显示 用户(id)
    }
  }, [api]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const handleDelete = async (bookmark: BookmarkItem) => {
    if (!api) return;
    try {
      await api.deleteBookmark(bookmark.id);
      message.success('收藏已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleViewDetail = (bookmark: BookmarkItem) => {
    setSelectedBookmark(bookmark);
    setDetailModalVisible(true);
  };

  const handleEdit = (bookmark: BookmarkItem) => {
    setSelectedBookmark(bookmark);
    form.setFieldsValue(bookmark);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!api || !selectedBookmark) return;
    try {
      const values = await form.validateFields();
      await api.updateBookmark(selectedBookmark.id, values);
      message.success('收藏已更新');
      setEditModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleExport = async () => {
    if (!api) return;
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (categoryFilter) params.append('categoryId', String(categoryFilter));
      if (sourceFilter) params.append('source', sourceFilter);

      window.open(`${api['baseUrl']}/api/admin/bookmarks/export?${params.toString()}`, '_blank');
      message.success('开始导出');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleViewUserDetail = async (userId: number) => {
    if (!api) return;
    try {
      const detail = await api.getUserDetail(userId);
      setUserDetail(detail);
      setUserDetailModalVisible(true);
    } catch {
      message.error('获取用户详情失败');
    }
  };

  const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));

  const columns = [
    {
      title: '图标',
      dataIndex: 'favicon',
      key: 'favicon',
      width: 60,
      render: (favicon: string | undefined, record: BookmarkItem) => {
        const src = favicon || getFaviconUrl(record.url || '');
        return src ? (
          <img src={src} alt="" style={{ width: 20, height: 20 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span style={{ fontWeight: 500, color: '#1677ff' }}>{record.title?.charAt(0) || '网'}</span>
        );
      },
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
      render: (title: string, record: BookmarkItem) => (
        <a
          onClick={(e) => { e.preventDefault(); handleViewDetail(record); }}
          style={{ color: '#1677ff', cursor: 'pointer' }}
        >
          {title}
        </a>
      ),
    },
    {
      title: '网址',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{url}</Text>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      key: 'categoryId',
      render: (categoryId: number) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? <Tag color="blue">{category.name}</Tag> : '-';
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (_source: string | undefined, record: BookmarkItem) => {
        if ((record as BookmarkItem & { source?: string }).source === 'admin') {
          return <Tag color="green">管理员</Tag>;
        }
        const userId = (record as BookmarkItem & { user_id?: number }).userId ?? (record as BookmarkItem & { user_id?: number }).user_id;
        const user = userId != null ? userMap[userId] : null;
        const displayName = user ? user.username : (userId != null ? `用户(${userId})` : '用户');
        return (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            onClick={() => userId != null && handleViewUserDetail(userId)}
          >
            {displayName}
          </Button>
        );
      },
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
      render: (_: any, record: BookmarkItem) => {
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
            onClick: () => {
              Modal.confirm({
                title: '确定删除此收藏吗？',
                okText: '确定',
                cancelText: '取消',
                onOk: () => handleDelete(record),
              });
            },
          },
        ];
        return (
          <Dropdown
            menu={{ items }}
            trigger={['click']}
            getPopupContainer={() => document.body}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 16 }}>收藏管理</Title>
        <Row gutter={16}>
          <Col>
            <Search
              placeholder="搜索标题或网址"
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
              placeholder="来源"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { label: '全部来源', value: undefined },
                { label: '用户', value: 'user' },
                { label: '管理员', value: 'admin' },
              ]}
              style={{ width: 120 }}
              allowClear
            />
          </Col>
          <Col>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Col>
        </Row>
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
        title="收藏详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedBookmark && (
            <Button
              key="open"
              type="primary"
              onClick={() => window.open(selectedBookmark.url, '_blank')}
            >
              打开链接
            </Button>
          ),
        ]}
      >
        {selectedBookmark && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">标题：</Text>
              <Text strong>{selectedBookmark.title}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">网址：</Text>
              <br />
              <a href={selectedBookmark.url} target="_blank" rel="noopener noreferrer">
                {selectedBookmark.url}
              </a>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">描述：</Text>
              <Text>{selectedBookmark.description || '-'}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">标签：</Text>
              <div style={{ marginTop: 4 }}>
                {selectedBookmark.tags ? (
                  selectedBookmark.tags.split(',').map((tag, i) => (
                    <Tag key={i} color="blue">{tag.trim()}</Tag>
                  ))
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">创建时间：</Text>
              <Text>{selectedBookmark.createdAt ? new Date(selectedBookmark.createdAt).toLocaleString() : '-'}</Text>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="编辑收藏"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSaveEdit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="网址" rules={[{ required: true }]}>
            <Input placeholder="输入网址后将自动获取图标" />
          </Form.Item>
          <Form.Item name="favicon" label="网站图标">
            <Input placeholder="自动获取，也可手动输入图标 URL" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select
              options={categoryOptions}
              allowClear
            />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="多个标签用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="用户详情"
        open={userDetailModalVisible}
        onCancel={() => setUserDetailModalVisible(false)}
        footer={null}
        width={560}
      >
        {userDetail && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">用户名：</Text>
              <Text strong>{userDetail.user.username}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">邮箱：</Text>
              <Text>{userDetail.user.email || '-'}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">状态：</Text>
              <Tag color={userDetail.user.status === 'active' ? 'green' : 'red'}>
                {userDetail.user.status === 'active' ? '正常' : '禁用'}
              </Tag>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">收藏总数：</Text>
              <Text>{userDetail.bookmarkCount ?? 0}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">分类分布：</Text>
              <div style={{ marginTop: 8 }}>
                {Object.entries(userDetail.categoryDistribution || {}).length > 0 ? (
                  Object.entries(userDetail.categoryDistribution || {}).map(([name, count]) => (
                    <Tag key={name} color="blue">{name}: {String(count)}</Tag>
                  ))
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 0 }}>
              <Text type="secondary">最近收藏：</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {(userDetail.recentBookmarks || []).slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <a href={b.url} target="_blank" rel="noopener noreferrer">{b.title}</a>
                  </li>
                ))}
              </ul>
              {(userDetail.recentBookmarks || []).length === 0 && <Text type="secondary">暂无</Text>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
