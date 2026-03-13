import { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Button, Typography, message, Select } from 'antd';
import { SaveOutlined, ExperimentOutlined } from '@ant-design/icons';
import { AdminApi } from '../../services/adminApi';

const { Title } = Typography;

interface SystemSettingsProps {
  api: AdminApi | null;
}

export function SystemSettings({ api }: SystemSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
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
        'ai.enabled': settings['ai.enabled'] === 'true',
        'ai.apiKey': settings['ai.apiKey'] || '',
        'ai.baseUrl': settings['ai.baseUrl'] || 'https://open.bigmodel.cn/api/paas/v4',
        'ai.model': settings['ai.model'] || 'glm-4',
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
        'theme.defaultMode': values['theme.defaultMode'],
        'theme.allowUserSwitch': String(values['theme.allowUserSwitch']),
        'ai.enabled': String(values['ai.enabled']),
        'ai.apiKey': values['ai.apiKey'] || '',
        'ai.baseUrl': values['ai.baseUrl'] || '',
        'ai.model': values['ai.model'] || '',
      };
      await api.updateSettings(settings);
      message.success('设置已保存');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleTestAi = async () => {
    if (!api) return;
    setTestingAi(true);
    try {
      const values = form.getFieldsValue(['ai.apiKey', 'ai.baseUrl', 'ai.model']);
      await api.testAiConnection({
        apiKey: values['ai.apiKey'],
        baseUrl: values['ai.baseUrl'],
        model: values['ai.model'],
      });
      message.success('AI 连接测试成功');
    } catch (error) {
      message.error('AI 连接测试失败，请检查配置');
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>系统设置</Title>

      <Card title="主题配置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
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
        </Form>
      </Card>

      <Card title="AI 功能配置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="ai.enabled" label="启用 AI 功能" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="ai.apiKey" label="API Key">
            <Input.Password placeholder="请输入 GLM API Key" />
          </Form.Item>
          <Form.Item name="ai.baseUrl" label="API 地址">
            <Input placeholder="https://open.bigmodel.cn/api/paas/v4" />
          </Form.Item>
          <Form.Item name="ai.model" label="模型名称">
            <Input placeholder="glm-4" />
          </Form.Item>
          <Button
            icon={<ExperimentOutlined />}
            onClick={handleTestAi}
            loading={testingAi}
          >
            测试连接
          </Button>
        </Form>
      </Card>

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
