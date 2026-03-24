import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Input, Tag, Modal, Typography, Popconfirm, message, Select, Form, Row, Col, Dropdown, Switch, Space, type MenuProps } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, ExportOutlined, MoreOutlined, PushpinOutlined, GlobalOutlined, RobotOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';
import type { DiscoverItem, CategoryItem, PageData } from '../../types/admin';
import { useAI } from '../../hooks/useAI';

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
  const [creatorKeyword, setCreatorKeyword] = useState('');
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
  const { config: aiConfig, extractMetadata, generateDescriptions, suggestTags, isLoading, error, clearError } = useAI();
  const [aiGenerated, setAiGenerated] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isExtractingTitle, setIsExtractingTitle] = useState(false);
  const watchedTitle = Form.useWatch('title', form) as string | undefined;
  const watchedUrl = Form.useWatch('url', form) as string | undefined;
  const lastTagSuggestKeyRef = useRef('');
  const lastTitleExtractKeyRef = useRef('');
  const lastAutoFilledTitleRef = useRef('');
  const lastUrlRef = useRef('');

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getDomainName = (url: string): string => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const buildMockDescription = (title: string, url: string): string => {
    const domain = getDomainName(url);
    return `${title}（${domain}）是一个值得收藏的网站，提供与主题相关的内容与功能，方便后续快速访问和使用。`;
  };

  const buildMockTitle = (url: string): string => {
    const domain = getDomainName(url);
    const mainPart = domain.split('.').filter(Boolean)[0] || domain;
    return mainPart
      .split(/[-_]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const buildMockTags = (title: string, url: string): string[] => {
    const seed = `${title} ${url}`.toLowerCase();
    const tags = new Set<string>();

    const addIfMatched = (patterns: string[], values: string[]) => {
      if (patterns.some(pattern => seed.includes(pattern))) {
        values.forEach(value => tags.add(value));
      }
    };

    addIfMatched(
      ['豆包', 'doubao', 'chatgpt', 'gpt', 'deepseek', 'kimi', '文心', '通义', 'copilot', 'claude'],
      ['AI助手', '智能问答']
    );
    addIfMatched(['写作', 'writer', 'copy', 'prompt'], ['内容生成', '写作辅助']);
    addIfMatched(['搜索', 'search', 'google', 'bing'], ['信息检索']);
    addIfMatched(['github', 'gitlab', 'api', 'dev', 'code'], ['开发工具', '编程资源']);
    addIfMatched(['youtube', 'bilibili', 'video', 'vimeo'], ['视频平台']);
    addIfMatched(['docs', 'doc', 'notion', 'wiki', 'guide'], ['文档资料']);
    addIfMatched(['course', 'learn', 'tutorial', 'study', '教育', '学习'], ['学习资源']);
    addIfMatched(['news', 'blog', 'medium', 'zhihu', 'juejin'], ['资讯内容']);
    addIfMatched(['design', 'figma', 'dribbble', 'ui', 'ux'], ['设计工具']);
    addIfMatched(['translate', '翻译'], ['语言翻译']);

    if (tags.size === 0) {
      tags.add('在线工具');
      tags.add('实用网站');
    }

    return Array.from(tags).slice(0, 6);
  };

  const loadSuggestedTags = async (title: string, url: string) => {
    setIsSuggestingTags(true);
    try {
      const aiTags = await suggestTags(url, title);
      const nextTags = aiTags && aiTags.length > 0 ? aiTags : buildMockTags(title, url);
      setSuggestedTags(nextTags);
    } catch {
      setSuggestedTags(buildMockTags(title, url));
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const tryAutoFillTitleByUrl = async (url: string) => {
    if (!isValidHttpUrl(url)) {
      return;
    }

    const currentTitle = form.getFieldValue('title')?.trim() || '';
    const canOverwriteTitle = !currentTitle || currentTitle === lastAutoFilledTitleRef.current;
    if (!canOverwriteTitle) {
      return;
    }

    setIsExtractingTitle(true);
    try {
      const metadata = await extractMetadata(url);
      const extractedTitle = metadata?.title?.trim() || '';
      const nextTitle = extractedTitle || buildMockTitle(url);

      if (nextTitle) {
        form.setFieldValue('title', nextTitle);
        lastAutoFilledTitleRef.current = nextTitle;
      }
    } catch {
      const fallbackTitle = buildMockTitle(url);
      if (fallbackTitle) {
        form.setFieldValue('title', fallbackTitle);
        lastAutoFilledTitleRef.current = fallbackTitle;
      }
    } finally {
      setIsExtractingTitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    const title = watchedTitle?.trim() || '';
    const url = watchedUrl?.trim() || '';
    if (!title || !url) {
      return;
    }

    try {
      await form.validateFields(['title', 'url']);
      clearError();
      setAiGenerated(false);

      const currentDescription = form.getFieldValue('description')?.trim() || '';

      const options = await generateDescriptions(title, url, currentDescription);
      const usedMock = !options || options.length === 0;
      const preferredDescription = options && options.length > 0
        ? options.find(option => option.style === '详细')?.text || options[0].text
        : buildMockDescription(title, url);

      if (usedMock) {
        clearError();
      }

      form.setFieldValue('description', preferredDescription.trim());
      setAiGenerated(true);
      message.success(usedMock ? '已使用本地模拟AI补充描述' : 'AI已补充描述');
    } catch {
      // 表单校验失败
    }
  };

  const canGenerateDescription = !!watchedTitle?.trim() && !!watchedUrl?.trim();

  useEffect(() => {
    if (!modalVisible) {
      return;
    }
    clearError();
    setAiGenerated(false);
    setSuggestedTags([]);
    setIsSuggestingTags(false);
    setIsExtractingTitle(false);
    lastTagSuggestKeyRef.current = '';
    lastTitleExtractKeyRef.current = '';
    lastAutoFilledTitleRef.current = '';
    if (!editingItem) {
      form.setFieldValue('favicon', '');
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
  }, [modalVisible, form, editingItem, clearError]);

  useEffect(() => {
    if (!modalVisible || editingItem) {
      return;
    }

    const url = watchedUrl?.trim() || '';
    if (!url || !isValidHttpUrl(url)) {
      lastTitleExtractKeyRef.current = '';
      return;
    }

    const key = url;
    if (key === lastTitleExtractKeyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastTitleExtractKeyRef.current = key;
      tryAutoFillTitleByUrl(url);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [modalVisible, editingItem, watchedUrl]);

  useEffect(() => {
    if (!modalVisible || editingItem) {
      return;
    }

    const title = watchedTitle?.trim() || '';
    const url = watchedUrl?.trim() || '';
    if (!title || !url) {
      setSuggestedTags([]);
      lastTagSuggestKeyRef.current = '';
      return;
    }

    const key = `${title}__${url}`;
    if (key === lastTagSuggestKeyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastTagSuggestKeyRef.current = key;
      loadSuggestedTags(title, url);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [modalVisible, editingItem, watchedTitle, watchedUrl]);

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
        creatorKeyword: creatorKeyword || undefined,
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
  }, [api, pagination.pageSize, keyword, categoryFilter, statusFilter, creatorKeyword]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

  const handleTogglePin = async (item: DiscoverItem, checked: boolean) => {
    if (!api) return;
    const newPinned = checked ? 1 : 0;
    setData(prev => prev.map(d => d.id === item.id ? { ...d, pinned: newPinned } : d));
    try {
      await api.updateDiscover(item.id, { pinned: newPinned });
      message.success(checked ? '已置顶' : '已取消置顶');
    } catch {
      setData(prev => prev.map(d => d.id === item.id ? { ...d, pinned: item.pinned } : d));
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
      title: '创建者',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 140,
      render: (value?: string, record?: DiscoverItem) => (
        <Tag color={record?.createdByType === 'admin' ? 'gold' : 'blue'}>
          {value || '-'}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: <span><PushpinOutlined style={{ marginRight: 4 }} />置顶</span>,
      dataIndex: 'pinned',
      key: 'pinned',
      width: 90,
      render: (pinned: number, record: DiscoverItem) => (
        <Switch
          checked={pinned === 1}
          checkedChildren="置顶"
          unCheckedChildren="普通"
          onChange={(checked) => handleTogglePin(record, checked)}
        />
      ),
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
            onClick: () => {
              Modal.confirm({
                title: '确定删除此内容吗？',
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
        <Title level={4} style={{ marginBottom: 16 }}>发现内容管理</Title>
        <Row gutter={16} wrap>
          <Col flex="none">
            <Search
              placeholder="搜索标题"
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col flex="none">
            <Select
              placeholder="选择分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ label: '全部分类', value: undefined }, ...categoryOptions]}
              style={{ width: 160 }}
              allowClear
            />
          </Col>
          <Col flex="none">
            <Input
              placeholder="创建者账号"
              value={creatorKeyword}
              onChange={(e) => setCreatorKeyword(e.target.value)}
              style={{ width: 160 }}
              allowClear
            />
          </Col>
          <Col flex="none">
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
          <Col flex="none">
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
        scroll={{ x: 'max-content' }}
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
          <Form.Item
            name="title"
            label="网站标题"
            rules={[{ required: true, message: '请输入网站标题' }]}
            extra={isExtractingTitle ? '正在根据网址自动识别标题...' : '填写网址后会自动识别标题，可手动修改'}
          >
            <Input
              placeholder="例如：Google"
              prefix={<GlobalOutlined style={{ color: '#6B6560' }} />}
            />
          </Form.Item>

          <Form.Item
            name="url"
            label="网站网址"
            rules={[
              { required: true, message: '请输入网站网址' },
              { type: 'url', message: '请输入有效的网址' }
            ]}
            extra="请输入有效的网站网址"
          >
            <Input placeholder="https://www.google.com" />
          </Form.Item>

          <Form.Item name="favicon" label="网站图标（可选）">
            <Input placeholder="手动输入图标URL" />
          </Form.Item>

          <Form.Item name="thumbnail" label="封面图（可选）">
            <Input placeholder="图片URL" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            extra={
              aiConfig.enabled ? (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Button
                    type="dashed"
                    icon={<RobotOutlined />}
                    size="small"
                    onClick={handleGenerateDescription}
                    disabled={!canGenerateDescription}
                    loading={isLoading}
                  >
                    AI生成描述
                  </Button>
                  {!canGenerateDescription && (
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                      请先填写网站标题和网址
                    </span>
                  )}
                  {!!error && (
                    <span style={{ color: '#ff4d4f', fontSize: 12 }}>
                      AI生成失败：{error}
                    </span>
                  )}
                  {aiGenerated && !error && (
                    <span style={{ color: '#52c41a', fontSize: 12 }}>
                      已使用AI补充描述，可继续手动编辑
                    </span>
                  )}
                </Space>
              ) : null
            }
          >
            <Input.TextArea placeholder="简要描述..." rows={2} />
          </Form.Item>

          <Form.Item name="categoryId" label="分类">
            <Select options={categoryOptions} allowClear placeholder="选择分类" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="网站类型标签"
            extra={
              aiConfig.enabled ? (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>填写标题和网址后将自动生成标签建议，也可手动输入。</span>
                  {isSuggestingTags && <span style={{ color: '#8c8c8c', fontSize: 12 }}>AI正在生成标签建议...</span>}
                  {!isSuggestingTags && suggestedTags.length > 0 && (
                    <span style={{ color: '#52c41a', fontSize: 12 }}>
                      AI建议：{suggestedTags.join(' / ')}
                    </span>
                  )}
                </Space>
              ) : (
                <span>填写标题和网址后可手动输入标签。</span>
              )
            }
          >
            <Select
              mode="tags"
              placeholder="输入后回车添加标签"
              style={{ width: '100%' }}
              tokenSeparators={[',', '，']}
              maxTagCount="responsive"
              options={suggestedTags.map(tag => ({ label: tag, value: tag }))}
            />
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
