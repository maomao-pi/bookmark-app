import { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Button, Typography, message, Select, InputNumber, Divider } from 'antd';
import { SaveOutlined, ExperimentOutlined, RobotOutlined, BulbOutlined } from '@ant-design/icons';
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
        'recommend.internal.enabled': settings['recommend.internal.enabled'] !== 'false',
        'recommend.external.enabled': settings['recommend.external.enabled'] === 'true',
        'recommend.limit': parseInt(settings['recommend.limit'] || '10', 10),
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
        'theme.defaultMode': values['theme.defaultMode'],
        'theme.allowUserSwitch': String(values['theme.allowUserSwitch']),
        'ai.enabled': String(values['ai.enabled']),
        'ai.apiKey': values['ai.apiKey'] || '',
        'ai.baseUrl': values['ai.baseUrl'] || '',
        'ai.model': values['ai.model'] || '',
        'recommend.internal.enabled': String(values['recommend.internal.enabled']),
        'recommend.external.enabled': String(values['recommend.external.enabled']),
        'recommend.limit': String(values['recommend.limit'] || 10),
        'ai.organizeEnabled': String(values['ai.organizeEnabled']),
        'ai.organizeFrequencyDays': String(values['ai.organizeFrequencyDays'] || 7),
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

      <Card title={<span><RobotOutlined /> AI 功能配置</span>} style={{ marginBottom: 16 }}>
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
          <Divider style={{ margin: '16px 0' }} />
          <Form.Item name="ai.organizeEnabled" label="启用 AI 整理建议" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="ai.organizeFrequencyDays" label="整理建议生成频率（天）">
            <InputNumber min={1} max={30} style={{ width: 120 }} />
          </Form.Item>
        </Form>
      </Card>

      <Card title={<span><BulbOutlined /> 内容推荐配置</span>} style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="recommend.internal.enabled" label="启用内部推荐（基于收藏库）" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="recommend.external.enabled" label="启用外部内容推荐" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="recommend.limit" label="每次推荐数量">
            <InputNumber min={1} max={50} style={{ width: 120 }} />
          </Form.Item>
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
