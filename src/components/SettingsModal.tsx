import { Modal, Form, Input, Button, Alert, Space, Typography, Divider } from 'antd';
import { KeyOutlined, SaveOutlined, RestOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { AIService } from '../services/aiService';

const { Title, Text } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onApiKeySaved?: () => void; // 添加回调函数
}
export function SettingsModal({ open, onClose, onApiKeySaved }: SettingsModalProps) {
  const [form] = Form.useForm();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  } | null>(null);

  const handleTestConnection = async () => {
    const apiKey = form.getFieldValue('apiKey');
    if (!apiKey) {
      setTestResult({
        type: 'error',
        message: '请先输入API密钥'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await AIService.testApiConnection(apiKey);
      setTestResult({
        type: result.success ? 'success' : 'error',
        message: result.success ? result.data?.status || '连接成功' : result.error || '连接失败'
      });
    } catch (error) {
      setTestResult({
        type: 'error',
        message: error instanceof Error ? error.message : '测试失败'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 保存API密钥
      AIService.setApiKey(values.apiKey);
      
      // 显示保存成功消息
      setTestResult({
        type: 'success',
        message: 'API密钥已保存'
      });

      // 通知父组件API配置已更新
      onApiKeySaved?.();

      // 2秒后关闭弹窗
      setTimeout(() => {
        onClose();
        setTestResult(null);
      }, 2000);
    } catch {
      // 表单验证失败
    }
  };

  const handleCancel = () => {
    onClose();
    setTestResult(null);
  };

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>AI设置</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button 
          key="test" 
          icon={<RestOutlined />} 
          onClick={handleTestConnection}
          loading={isTesting}
          disabled={!form.getFieldValue('apiKey')}
        >
          测试连接
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
        >
          保存
        </Button>
      ]}
      width={600}
    >
      <div style={{ padding: '20px 0' }}>
        <Title level={5}>GLM-4.6 API 配置</Title>
        
        <Alert
          message="如何获取API密钥"
          description={
            <div>
              <p>1. 访问 <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer">智谱AI开放平台</a></p>
              <p>2. 注册并登录账号</p>
              <p>3. 在控制台创建API密钥</p>
              <p>4. 复制API密钥到下方输入框</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            apiKey: AIService.getApiKey() || ''
          }}
        >
          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[
              { required: true, message: '请输入GLM API密钥' },
              { min: 20, message: 'API密钥长度不足' }
            ]}
            extra="您的API密钥将被安全地存储在本地浏览器中"
          >
            <Input.Password
              placeholder="请输入您的GLM API密钥"
              prefix={<KeyOutlined />}
              size="large"
            />
          </Form.Item>
        </Form>

        {testResult && (
          <Alert
            message={testResult.type === 'success' ? '✓ ' + testResult.message : '✗ ' + testResult.message}
            type={testResult.type as 'success' | 'error' | 'info' | 'warning'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        <Divider />

        <div style={{ marginTop: 24 }}>
          <Title level={5}>API使用说明</Title>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>功能特性：</Text>
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                <li>自动URL元数据提取</li>
                <li>智能网站描述生成</li>
                <li>相关标签推荐</li>
                <li>内容类型自动检测</li>
              </ul>
            </div>
            
            <div>
              <Text strong>使用限制：</Text>
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                <li>API调用有频率限制</li>
                <li>本地缓存可减少重复调用</li>
                <li>24小时自动清除缓存</li>
              </ul>
            </div>

            <div>
              <Text strong>隐私保护：</Text>
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                <li>API密钥仅存储在本地</li>
                <li>不会上传到第三方服务器</li>
                <li>可随时清除或更换密钥</li>
              </ul>
            </div>
          </Space>
        </div>
      </div>
    </Modal>
  );
}

export default SettingsModal;