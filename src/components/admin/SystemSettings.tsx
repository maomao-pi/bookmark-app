import { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Button, Typography, message, Select, InputNumber, Divider, Tabs, Alert } from 'antd';
import { SaveOutlined, ExperimentOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';

const { Title } = Typography;

interface SystemSettingsProps {
  api: AdminApi | null;
}

export function SystemSettings({ api }: SystemSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testingSearch, setTestingSearch] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const settings = await api.getSettings();
      form.setFieldsValue({
        'theme.defaultMode': settings['theme.defaultMode'] || 'light',
        'theme.allowUserSwitch': settings['theme.allowUserSwitch'] === 'true',
        
        // 文本模型配置（兼容旧配置）
        'ai.text.enabled': settings['ai.text.enabled'] !== 'false',
        'ai.text.apiKey': settings['ai.text.apiKey'] || settings['ai.apiKey'] || '',
        'ai.text.baseUrl': settings['ai.text.baseUrl'] || settings['ai.baseUrl'] || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'ai.text.model': settings['ai.text.model'] || settings['ai.model'] || 'qwen3-plus',
        
        // 联网搜索模型配置
        'ai.search.enabled': settings['ai.search.enabled'] === 'true',
        'ai.search.apiKey': settings['ai.search.apiKey'] || '',
        'ai.search.baseUrl': settings['ai.search.baseUrl'] || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'ai.search.model': settings['ai.search.model'] || 'qwen3-search',
        
        // 推荐配置
        'recommend.internal.enabled': settings['recommend.internal.enabled'] !== 'false',
        'recommend.external.enabled': settings['recommend.external.enabled'] === 'true',
        'recommend.limit': parseInt(settings['recommend.limit'] || '10', 10),
        
        // 整理建议配置
        'ai.organizeEnabled': settings['ai.organizeEnabled'] !== 'false',
        'ai.organizeFrequencyDays': parseInt(settings['ai.organizeFrequencyDays'] || '7', 10),
      });
    } catch (error) {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      const settings: Record<string, string> = {
        // 主题配置
        'theme.defaultMode': values['theme.defaultMode'],
        'theme.allowUserSwitch': String(values['theme.allowUserSwitch']),
        
        // 文本模型配置
        'ai.text.enabled': String(values['ai.text.enabled']),
        'ai.text.apiKey': values['ai.text.apiKey'] || '',
        'ai.text.baseUrl': values['ai.text.baseUrl'] || '',
        'ai.text.model': values['ai.text.model'] || '',
        
        // 联网搜索模型配置
        'ai.search.enabled': String(values['ai.search.enabled']),
        'ai.search.apiKey': values['ai.search.apiKey'] || '',
        'ai.search.baseUrl': values['ai.search.baseUrl'] || '',
        'ai.search.model': values['ai.search.model'] || '',
        
        // 推荐配置
        'recommend.internal.enabled': String(values['recommend.internal.enabled']),
        'recommend.external.enabled': String(values['recommend.external.enabled']),
        'recommend.limit': String(values['recommend.limit'] || 10),
        
        // 整理建议配置
        'ai.organizeEnabled': String(values['ai.organizeEnabled']),
        'ai.organizeFrequencyDays': String(values['ai.organizeFrequencyDays'] || 7),
      };
      await api.updateSettings(settings);
      message.success('设置已保存');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleTestTextAi = async () => {
    if (!api) return;
    setTestingAi(true);
    try {
      const values = form.getFieldsValue(['ai.text.apiKey', 'ai.text.baseUrl', 'ai.text.model']);
      await api.testAiConnection({
        apiKey: values['ai.text.apiKey'],
        baseUrl: values['ai.text.baseUrl'],
        model: values['ai.text.model'],
      });
      message.success('文本 AI 连接测试成功');
    } catch (error) {
      message.error('文本 AI 连接测试失败，请检查配置');
    } finally {
      setTestingAi(false);
    }
  };

  const handleTestSearchAi = async () => {
    if (!api) return;
    setTestingSearch(true);
    try {
      const values = form.getFieldsValue(['ai.search.apiKey', 'ai.search.baseUrl', 'ai.search.model']);
      await api.testAiConnection({
        apiKey: values['ai.search.apiKey'],
        baseUrl: values['ai.search.baseUrl'],
        model: values['ai.search.model'],
      });
      message.success('联网搜索 AI 连接测试成功');
    } catch (error) {
      message.error('联网搜索 AI 连接测试失败，请检查配置');
    } finally {
      setTestingSearch(false);
    }
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>系统设置</Title>

      <Form form={form} layout="vertical">
        <Tabs
          items={[
            {
              key: 'theme',
              label: '内容主题配置',
              children: (
                <Card bordered={false}>
                  <Form.Item name="theme.defaultMode" label="默认主题模式">
                    <Select
                      options={[
                        { label: '浅色', value: 'light' },
                        { label: '深色', value: 'dark' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="theme.allowUserSwitch" label="允许用户切换主题" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Card>
              ),
            },
            {
              key: 'ai-text',
              label: 'AI 文本模型',
              children: (
                <Card bordered={false}>
                  <Alert
                    message="文本模型用途"
                    description="用于描述生成、标签建议、AI 整理建议等需要文本生成的功能。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Form.Item name="ai.text.enabled" label="启用文本 AI 功能" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="ai.text.apiKey" label="API Key" rules={[{ required: false }]}>
                    <Input.Password placeholder="请输入阿里云百炼 API Key" />
                  </Form.Item>
                  <Form.Item name="ai.text.baseUrl" label="API 地址">
                    <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
                  </Form.Item>
                  <Form.Item name="ai.text.model" label="模型名称">
                    <Input placeholder="qwen3-plus" />
                  </Form.Item>
                  <Button
                    icon={<ExperimentOutlined />}
                    onClick={handleTestTextAi}
                    loading={testingAi}
                  >
                    测试连接
                  </Button>
                  <Divider style={{ margin: '16px 0' }} />
                  <Form.Item name="ai.organizeEnabled" label="启用 AI 整理建议" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="ai.organizeFrequencyDays" label="整理建议生成频率（天）">
                    <InputNumber min={1} max={30} style={{ width: 120 }} />
                  </Form.Item>
                </Card>
              ),
            },
            {
              key: 'ai-search',
              label: 'AI 联网搜索',
              children: (
                <Card bordered={false}>
                  <Alert
                    message="联网搜索模型用途"
                    description="用于 AI 为你推荐功能，需要返回真实可访问的链接。推荐使用 qwen3-search 模型。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Form.Item name="ai.search.enabled" label="启用联网搜索 AI" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="ai.search.apiKey" label="API Key">
                    <Input.Password placeholder="请输入阿里云百炼 API Key（可与文本模型相同或不同）" />
                  </Form.Item>
                  <Form.Item name="ai.search.baseUrl" label="API 地址">
                    <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
                  </Form.Item>
                  <Form.Item name="ai.search.model" label="模型名称">
                    <Input placeholder="qwen3-search" />
                  </Form.Item>
                  <Button
                    icon={<ExperimentOutlined />}
                    onClick={handleTestSearchAi}
                    loading={testingSearch}
                  >
                    测试连接
                  </Button>
                </Card>
              ),
            },
            {
              key: 'recommend',
              label: '内容推荐配置',
              children: (
                <Card bordered={false}>
                  <Form.Item name="recommend.internal.enabled" label="启用内部推荐（基于收藏库）" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="recommend.external.enabled" label="启用外部内容推荐" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item name="recommend.limit" label="每次推荐数量">
                    <InputNumber min={1} max={50} style={{ width: 120 }} />
                  </Form.Item>
                </Card>
              ),
            },
          ]}
        />
      </Form>

      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSave}
        loading={loading}
      >
        保存设置
      </Button>
    </div>
  );
}
