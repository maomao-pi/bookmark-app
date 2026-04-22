import { useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message } from 'antd';
import { GlobalOutlined, RobotOutlined } from '@ant-design/icons';
import type { Category, Bookmark, BookmarkFormData } from '../types';
import { useAI } from '../hooks/useAI';

interface BookmarkModalProps {
  open: boolean;
  bookmark: Bookmark | null;
  categories: Category[];
  onSave: (data: BookmarkFormData) => void;
  onCancel: () => void;
  onAddCategory: () => void;
}

export function BookmarkModal({ 
  open, 
  bookmark, 
  categories, 
  onSave, 
  onCancel,
  onAddCategory 
}: BookmarkModalProps) {
  const [form] = Form.useForm();
  const { config: aiConfig, extractMetadata, generateDescriptions, suggestTags, isLoading, error, clearError } = useAI();
  const [aiGenerated, setAiGenerated] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isExtractingTitle, setIsExtractingTitle] = useState(false);
  const watchedTitle = Form.useWatch('title', form) as string | undefined;
  const watchedUrl = Form.useWatch('url', form) as string | undefined;
  const canGenerateDescription = !!watchedTitle?.trim() && !!watchedUrl?.trim();
  const lastTagSuggestKeyRef = useRef('');
  const lastTitleExtractKeyRef = useRef('');
  const lastAutoFilledTitleRef = useRef('');

  const initialValues = bookmark
    ? {
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description,
        categoryId: bookmark.categoryId === '' || bookmark.categoryId === null || bookmark.categoryId === undefined ? null : bookmark.categoryId,
        favicon: bookmark.favicon || '',
        tags: bookmark.tags || [],
        thumbnail: bookmark.thumbnail || ''
      }
    : {
        title: '',
        url: '',
        description: '',
        categoryId: null,
        favicon: '',
        tags: [],
        thumbnail: ''
      };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('handleSubmit values.categoryId:', values.categoryId, 'type:', typeof values.categoryId);
      
      const bookmarkData: BookmarkFormData = {
        title: values.title?.trim() || '',
        url: values.url?.trim() || '',
        description: values.description?.trim() || '',
        categoryId: values.categoryId === '' || values.categoryId === undefined ? null : values.categoryId,
        favicon: values.favicon?.trim() || '',
        tags: Array.isArray(values.tags) ? values.tags.filter((t: string) => t?.trim()).map((t: string) => t.trim()) : [],
        thumbnail: values.thumbnail?.trim() || ''
      };
      
      console.log('handleSubmit bookmarkData.categoryId:', bookmarkData.categoryId);
      onSave(bookmarkData);
    } catch {
      // 表单验证失败
    }
  };

  const categoryOptions = categories.map(c => ({
    label: c.name,
    value: c.id
  }));

  const getDomainName = (url: string): string => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const getFaviconUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  const tryAutoFillFavicon = (url: string) => {
    if (!isValidHttpUrl(url)) {
      return;
    }
    const faviconUrl = getFaviconUrl(url);
    if (faviconUrl) {
      form.setFieldValue('favicon', faviconUrl);
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

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
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

  useEffect(() => {
    if (!open) {
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
    if (!bookmark) {
      form.setFieldValue('favicon', '');
    }
  }, [open, clearError]);

  useEffect(() => {
    if (!open || bookmark) {
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
      tryAutoFillFavicon(url);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [open, bookmark, watchedUrl]);

  useEffect(() => {
    if (!open || bookmark) {
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
  }, [open, bookmark, watchedTitle, watchedUrl]);

  const handleGenerateDescription = async () => {
    if (!canGenerateDescription) {
      return;
    }

    try {
      await form.validateFields(['title', 'url']);
      clearError();
      setAiGenerated(false);

      const title = form.getFieldValue('title')?.trim() || '';
      const url = form.getFieldValue('url')?.trim() || '';
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

  return (
    <Modal
      title={bookmark ? '编辑收藏' : '添加收藏'}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={500}
    >
      <Form
        key={bookmark?.id || 'new'}
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={initialValues}
      >
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
          <Input 
            placeholder="https://www.google.com" 
          />
        </Form.Item>
        <Form.Item
          name="favicon"
          label="网站图标（可选）"
        >
          <Input placeholder="手动输入图标URL" />
        </Form.Item>
        
        <Form.Item
          name="thumbnail"
          label="封面图（可选）"
        >
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
          <Input.TextArea 
            placeholder="简要描述..." 
            rows={2}
          />
        </Form.Item>
        
        <Form.Item
          name="categoryId"
          label="分类"
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              placeholder="无分类"
              options={[{ label: '无分类', value: '' }, ...categoryOptions]}
              style={{ flex: 1 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Button onClick={onAddCategory}>新建</Button>
          </div>
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
      </Form>
    </Modal>
  );
}
