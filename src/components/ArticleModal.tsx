import { Modal, Form, Input, Radio, Button, Spin, Space } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { RobotOutlined, LoadingOutlined } from '@ant-design/icons';
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
  const { detectArticleType, extractMetadata, clearError } = useAI();
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiDetectedType, setAiDetectedType] = useState<string | null>(null);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (article) {
        form.setFieldsValue({
          title: article.title,
          url: article.url,
          description: article.description,
          type: article.type
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ type: defaultType });
      }
      // 重置AI状态
      setAiDetectedType(null);
      clearError();
    }
  }, [open, article, form, defaultType, clearError]);

  // URL 变化时：防抖 600ms 后自动识别类型 + 自动获取标题（仅当标题为空时）
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
      setIsExtracting(true);
      try {
        const currentTitle = form.getFieldValue('title')?.trim() || '';
        const [detectedType, metadata] = await Promise.all([
          detectArticleType(url),
          extractMetadata(url)
        ]);
        if (detectedType) {
          form.setFieldValue('type', detectedType);
          setAiDetectedType(detectedType);
        }
        // 仅使用 AI 返回的标题填充，确保正确识别，不使用域名回退
        if (!currentTitle && metadata?.title?.trim()) {
          form.setFieldValue('title', metadata.title.trim());
        }
      } catch {
        // AI 失败时不自动填标题，由用户手动输入或配置 API 后重试
      } finally {
        setIsExtracting(false);
      }
    }, 600);
  };

  // 手动触发AI检测
  const handleDetectType = async () => {
    const url = form.getFieldValue('url');
    if (url) {
      setIsExtracting(true);
      try {
        const detectedType = await detectArticleType(url);
        if (detectedType) {
          form.setFieldValue('type', detectedType);
          setAiDetectedType(detectedType);
        }
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        title: values.title.trim(),
        url: values.url.trim(),
        description: values.description?.trim() || '',
        type: values.type,
        aiGenerated: !!aiDetectedType // 标记是否为AI检测的类型
      });
    } catch {
      // 表单验证失败
    }
  };

  const getTitle = () => {
    if (article) {
      return '编辑内容';
    }
    return '添加内容';
  };

  const contentTypeLabels: Record<string, string> = {
    article: '文章',
    video: '视频',
    document: '文档',
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      destroyOnClose
      width={500}
      bodyStyle={{ height: 480, overflow: 'auto' }}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        <Form.Item
          name="type"
          label="内容类型"
          rules={[{ required: true, message: '请选择内容类型' }]}
          extra={
            <Space style={{ marginTop: 4 }}>
              {!article && (
                <Button 
                  type="link" 
                  size="small" 
                  icon={<RobotOutlined />}
                  onClick={handleDetectType}
                  disabled={!form.getFieldValue('url')}
                >
                  AI智能识别
                </Button>
              )}
              {isExtracting && <Spin size="small" />}
            </Space>
          }
        >
          <Radio.Group>
            <Radio value="article">文章</Radio>
            <Radio value="video">视频</Radio>
            <Radio value="document">文档</Radio>
          </Radio.Group>
          {aiDetectedType && (
            <div style={{ 
              marginTop: 8, 
              padding: '6px 12px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 4,
              fontSize: 12,
              color: '#52c41a'
            }}>
              🤖 AI检测为: {contentTypeLabels[aiDetectedType as keyof typeof contentTypeLabels]}
            </div>
          )}
        </Form.Item>
        
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
          extra={!article && "输入URL后将通过AI自动识别并填充标题（需在设置中配置GLM API）"}
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
          extra={!article && "输入URL后自动识别内容类型"}
        >
          <Input 
            placeholder="https://..." 
            onChange={handleURLChange}
            suffix={isExtracting && <LoadingOutlined />}
          />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="描述"
        >
          <Input.TextArea 
            placeholder="简要描述..." 
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}