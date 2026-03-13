import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Typography, Popconfirm, message, Select, Form, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { ArticleItem, BookmarkItem, DiscoverItem, PageData } from '../../types/admin';

const { Text } = Typography;
const { Search } = Input;

interface ContentManagementProps {
  api: AdminApi | null;
}

export function ContentManagement({ api }: ContentManagementProps) {
  const [activeTab, setActiveTab] = useState('user');

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'user',
            label: '用户内容',
            children: <UserContentTab api={api} />,
          },
          {
            key: 'discover',
            label: '发现内容',
            children: <DiscoverContentTab api={api} />,
          },
        ]}
      />
    </div>
  );
}

function UserContentTab({ api }: { api: AdminApi | null }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ArticleItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'article' | 'video' | 'document' | 'link' | undefined>();
  const [bookmarkFilter, setBookmarkFilter] = useState<number | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [form] = Form.useForm();

  const loadBookmarks = useCallback(async () => {
    if (!api) return;
    try {
      const result = await api.getAllBookmarks();
      setBookmarks(result);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  }, [api]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const loadData = useCallback(async (page = 1, pageSizeOverride?: number) => {
    if (!api) return;
    const size = pageSizeOverride ?? pagination.pageSize;
    setLoading(true);
    try {
      const result: PageData<ArticleItem> = await api.getUserContents({
        pageNum: page,
        pageSize: size,
        keyword: keyword || undefined,
        type: typeFilter,
        bookmarkId: bookmarkFilter,
      });
      setData(result.records);
      setPagination(prev => ({
        ...prev,
        current: result.pageNum,
        total: result.total,
        pageSize: size,
      }));
    } catch (error) {
      message.error('加载用户内容失败');
    } finally {
      setLoading(false);
    }
  }, [api, pagination.pageSize, keyword, typeFilter, bookmarkFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setEditingArticle(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (article: ArticleItem) => {
    setEditingArticle(article);
    form.setFieldsValue(article);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      if (editingArticle) {
        await api.updateUserContent(editingArticle.id, values);
        message.success('内容已更新');
      } else {
        await api.createUserContent(values);
        message.success('内容已创建');
      }
      setModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (article: ArticleItem) => {
    if (!api) return;
    try {
      await api.deleteUserContent(article.id);
      message.success('内容已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: ArticleItem) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer">
          {title}
        </a>
      ),
    },
    {
      title: '关联收藏',
      dataIndex: 'bookmarkId',
      key: 'bookmarkId',
      width: 150,
      render: (bookmarkId: number) => {
        const bookmark = bookmarks.find(b => b.id === bookmarkId);
        return bookmark ? (
          <Text ellipsis style={{ maxWidth: 150 }}>{bookmark.title}</Text>
        ) : '-';
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          article: 'blue',
          video: 'red',
          document: 'green',
          link: 'default',
        };
        const labelMap: Record<string, string> = {
          article: '文章',
          video: '视频',
          document: '文档',
          link: '链接',
        };
        return <Tag color={colorMap[type]}>{labelMap[type]}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ArticleItem) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此内容吗？" onConfirm={() => handleDelete(record)} okText="确定" cancelText="取消">
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
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
        <Space>
          <Search placeholder="搜索标题/描述" onSearch={handleSearch} style={{ width: 200 }} allowClear />
          <Select
            placeholder="内容类型"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 100 }}
            allowClear
            options={[
              { label: '文章', value: 'article' },
              { label: '视频', value: 'video' },
              { label: '文档', value: 'document' },
              { label: '链接', value: 'link' },
            ]}
          />
          <Select
            placeholder="关联收藏"
            value={bookmarkFilter}
            onChange={setBookmarkFilter}
            style={{ width: 200 }}
            allowClear
            showSearch
            optionFilterProp="children"
            options={bookmarks.map(b => ({ label: b.title, value: b.id }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增内容
        </Button>
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
        title={editingArticle ? '编辑用户内容' : '新增用户内容'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true, message: '请输入URL' }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item name="bookmarkId" label="关联收藏" rules={[{ required: true, message: '请选择关联收藏' }]}>
            <Select
              placeholder="选择收藏"
              showSearch
              optionFilterProp="children"
              options={bookmarks.map(b => ({ label: b.title, value: b.id }))}
            />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '文章', value: 'article' },
                { label: '视频', value: 'video' },
                { label: '文档', value: 'document' },
                { label: '链接', value: 'link' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function DiscoverContentTab({ api }: { api: AdminApi | null }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ArticleItem[]>([]);
  const [discoverBookmarks, setDiscoverBookmarks] = useState<DiscoverItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'article' | 'video' | 'document' | 'link' | undefined>();
  const [bookmarkFilter, setBookmarkFilter] = useState<number | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [form] = Form.useForm();

  const loadDiscoverBookmarks = useCallback(async () => {
    if (!api) return;
    try {
      const result = await api.getAllDiscoverBookmarks();
      setDiscoverBookmarks(result);
    } catch (error) {
      console.error('Failed to load discover bookmarks:', error);
    }
  }, [api]);

  useEffect(() => {
    loadDiscoverBookmarks();
  }, [loadDiscoverBookmarks]);

  const loadData = useCallback(async (page = 1, pageSizeOverride?: number) => {
    if (!api) return;
    const size = pageSizeOverride ?? pagination.pageSize;
    setLoading(true);
    try {
      const result: PageData<ArticleItem> = await api.getDiscoverContents({
        pageNum: page,
        pageSize: size,
        keyword: keyword || undefined,
        type: typeFilter,
        discoverBookmarkId: bookmarkFilter,
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
  }, [api, pagination.pageSize, keyword, typeFilter, bookmarkFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setEditingArticle(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (article: ArticleItem) => {
    setEditingArticle(article);
    form.setFieldsValue(article);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      if (editingArticle) {
        await api.updateDiscoverContent(editingArticle.id, values);
        message.success('内容已更新');
      } else {
        await api.createDiscoverContent(values);
        message.success('内容已创建');
      }
      setModalVisible(false);
      loadData(pagination.current);
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (article: ArticleItem) => {
    if (!api) return;
    try {
      await api.deleteDiscoverContent(article.id);
      message.success('内容已删除');
      loadData(pagination.current);
    } catch (error) {
      message.error('删除失败');
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: ArticleItem) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer">
          {title}
        </a>
      ),
    },
    {
      title: '关联发现',
      dataIndex: 'discoverBookmarkId',
      key: 'discoverBookmarkId',
      width: 150,
      render: (discoverBookmarkId: number) => {
        const bookmark = discoverBookmarks.find(b => b.id === discoverBookmarkId);
        return bookmark ? (
          <Text ellipsis style={{ maxWidth: 150 }}>{bookmark.title}</Text>
        ) : '-';
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          article: 'blue',
          video: 'red',
          document: 'green',
          link: 'default',
        };
        const labelMap: Record<string, string> = {
          article: '文章',
          video: '视频',
          document: '文档',
          link: '链接',
        };
        return <Tag color={colorMap[type]}>{labelMap[type]}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ArticleItem) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此内容吗？" onConfirm={() => handleDelete(record)} okText="确定" cancelText="取消">
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
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
        <Space>
          <Search placeholder="搜索标题/描述" onSearch={handleSearch} style={{ width: 200 }} allowClear />
          <Select
            placeholder="内容类型"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 100 }}
            allowClear
            options={[
              { label: '文章', value: 'article' },
              { label: '视频', value: 'video' },
              { label: '文档', value: 'document' },
              { label: '链接', value: 'link' },
            ]}
          />
          <Select
            placeholder="关联发现"
            value={bookmarkFilter}
            onChange={setBookmarkFilter}
            style={{ width: 200 }}
            allowClear
            showSearch
            optionFilterProp="children"
            options={discoverBookmarks.map(b => ({ label: b.title, value: b.id }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增内容
        </Button>
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
        title={editingArticle ? '编辑发现内容' : '新增发现内容'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true, message: '请输入URL' }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item name="discoverBookmarkId" label="关联发现" rules={[{ required: true, message: '请选择关联发现' }]}>
            <Select
              placeholder="选择发现收藏"
              showSearch
              optionFilterProp="children"
              options={discoverBookmarks.map(b => ({ label: b.title, value: b.id }))}
            />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '文章', value: 'article' },
                { label: '视频', value: 'video' },
                { label: '文档', value: 'document' },
                { label: '链接', value: 'link' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ContentManagement;
