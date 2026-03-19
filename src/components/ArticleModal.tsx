import { Modal, Form, Input, Radio, Switch, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import { LoadingOutlined, PushpinOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import type { Article, ArticleFormData } from '../types';
import { useAI } from '../hooks/useAI';

interface ArticleModalProps {
  open: boolean;
  article: Article | null;
  defaultType?: 'article' | 'video' | 'document' | 'link';
  onSave: (data: ArticleFormData) => void;
  onCancel: () => void;
}

export function ArticleModal({ open, article, defaultType = 'article', onSave, onCancel }: ArticleModalProps) {
  const [form] = Form.useForm();
  const { extractMetadata, clearError } = useAI();
  const [isExtracting, setIsExtracting] = useState(false);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOpenRef = useRef(false);

  // 仅在弹窗「从关到开」时初始化表单，避免编辑过程中被重复 setFieldsValue 覆盖已填写内容
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (article) {
        form.setFieldsValue({
          title: article.title ?? '',
          url: article.url ?? '',
          description: article.description ?? '',
          type: article.type ?? 'article',
          pinned: article.pinned ?? false,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ type: defaultType, pinned: false });
      }
      clearError();
    }
    prevOpenRef.current = open;
  }, [open, article, form, defaultType, clearError]);

  const initialValues = useMemo(() => {
    if (!open) return undefined;
    if (article) {
      return {
        title: article.title ?? '',
        url: article.url ?? '',
        description: article.description ?? '',
        type: article.type ?? 'article',
        pinned: article.pinned ?? false,
      };
    }
    return { type: defaultType, pinned: false };
  }, [open, article, defaultType]);

  // URL 变化时：防抖 600ms 后尝试通过 AI 获取标题（仅新增时、标题为空时）
  const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = (e?.target?.value || '').trim();
    clearError();

    if (urlDebounceRef.current) {
      clearTimeout(urlDebounceRef.current);
      urlDebounceRef.current = null;
    }

    if (!url || article) return;

    try {
      new URL(url);
    } catch {
      return;
    }

    urlDebounceRef.current = setTimeout(async () => {
      urlDebounceRef.current = null;
      const currentTitle = form.getFieldValue('title')?.trim() || '';
      if (currentTitle) return;

      setIsExtracting(true);
      try {
        const metadata = await extractMetadata(url);
        if (!form.getFieldValue('title')?.trim() && metadata?.title?.trim()) {
          form.setFieldValue('title', metadata.title.trim());
        }
      } catch {
        // AI 失败时忽略
      } finally {
        setIsExtracting(false);
      }
    }, 600);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        title: values.title.trim(),
        url: values.url.trim(),
        description: values.description?.trim() || '',
        type: values.type,
        pinned: Boolean(values.pinned),
      });
    } catch {
      // 表单验证失败
    }
  };

  return (
    <Modal
      title={article ? '编辑内容' : '添加内容'}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      destroyOnClose
      width={500}
      bodyStyle={{ height: 420, overflow: 'auto' }}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={initialValues}
      >
        <Form.Item
          name="type"
          label="内容类型"
          rules={[{ required: true, message: '请选择内容类型' }]}
        >
          <Radio.Group>
            <Radio value="article">文章</Radio>
            <Radio value="video">视频</Radio>
            <Radio value="document">文档</Radio>
            <Radio value="link">链接</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
          extra={!article && "输入 URL 后将尝试通过 AI 自动填充标题（需配置 API Key）"}
        >
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item
          name="url"
          label="URL"
          rules={[
            { required: true, message: '请输入URL' },
            { type: 'url', message: '请输入有效的URL' }
          ]}
        >
          <Input
            placeholder="https://..."
            onChange={handleURLChange}
            suffix={isExtracting ? <Spin indicator={<LoadingOutlined />} size="small" /> : null}
          />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="简要描述..." rows={3} />
        </Form.Item>

        <Form.Item name="pinned" valuePropName="checked" label={<span><PushpinOutlined style={{ marginRight: 4 }} />置顶显示</span>}>
          <Switch checkedChildren="置顶" unCheckedChildren="普通" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
