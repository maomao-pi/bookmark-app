import { useState } from 'react';
import { Card, Radio, Button, Spin, Alert, Space } from 'antd';
import { RobotOutlined, ReloadOutlined, CheckOutlined } from '@ant-design/icons';
import type { AIDescriptionOption } from '../types';
import './AIDescriptions.css';
interface AIDescriptionsProps {
  descriptions: AIDescriptionOption[] | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (description: string, style: string) => void;
  onRegenerate?: () => void;
  selectedDescription?: string;
}

export function AIDescriptions({
  descriptions,
  isLoading,
  error,
  onSelect,
  onRegenerate,
  selectedDescription
}: AIDescriptionsProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  const handleSelect = (option: AIDescriptionOption) => {
    setSelectedStyle(option.style);
    onSelect(option.text, option.style);
  };

  if (isLoading) {
    return (
      <Card 
        size="small" 
        className="ai-descriptions-card"
        title={
          <Space>
            <RobotOutlined />
            AI 正在生成描述...
          </Space>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#666' }}>
            正在分析网站内容，请稍候...
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        size="small" 
        className="ai-descriptions-card"
        title={
          <Space>
            <RobotOutlined />
            AI 描述生成失败
          </Space>
        }
      >
        <Alert
          message="AI服务暂时不可用"
          description={error}
          type="error"
          showIcon
          action={onRegenerate && (
            <Button size="small" onClick={onRegenerate}>
              重试
            </Button>
          )}
        />
      </Card>
    );
  }

  if (!descriptions || descriptions.length === 0) {
    return (
      <Card 
        size="small" 
        className="ai-descriptions-card"
        title={
          <Space>
            <RobotOutlined />
            AI 智能描述
          </Space>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
          <RobotOutlined style={{ fontSize: 24, marginBottom: 8 }} />
          <div>暂无AI生成的描述</div>
          {onRegenerate && (
            <Button 
              type="link" 
              onClick={onRegenerate}
              style={{ marginTop: 8 }}
            >
              生成AI描述
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      size="small" 
      className="ai-descriptions-card"
      title={
        <Space>
          <RobotOutlined />
          AI 智能描述建议
          {onRegenerate && (
            <Button 
              type="text" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={onRegenerate}
              title="重新生成"
            />
          )}
        </Space>
      }
    >
      <Radio.Group 
        value={selectedStyle}
        onChange={(e) => {
          const option = descriptions.find(d => d.style === e.target.value);
          if (option) {
            handleSelect(option);
          }
        }}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {descriptions.map((option, index) => (
            <div 
              key={index} 
              className={`ai-description-option ${
                selectedStyle === option.style ? 'selected' : ''
              } ${selectedDescription === option.text ? 'applied' : ''}`}
            >
              <Radio value={option.style} style={{ width: '100%' }}>
                <div style={{ marginLeft: 8 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4
                  }}>
                    <span style={{ 
                      fontWeight: 500,
                      color: '#1890ff',
                      fontSize: 12
                    }}>
                      {option.style}
                    </span>
                    {selectedDescription === option.text && (
                      <CheckOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                    )}
                  </div>
                  <div style={{ 
                    color: '#333',
                    lineHeight: 1.5,
                    fontSize: 13
                  }}>
                    {option.text}
                  </div>
                </div>
              </Radio>
            </div>
          ))}
        </Space>
      </Radio.Group>
      
      {selectedStyle && (
        <div style={{ 
          marginTop: 12, 
          padding: '8px 12px',
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 4,
          fontSize: 12,
          color: '#52c41a'
        }}>
          ✓ 已选择 "{selectedStyle}" 风格描述
        </div>
      )}
    </Card>
  );
}

export default AIDescriptions;