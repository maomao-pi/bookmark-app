import { Modal, Form, Input } from 'antd';
import { useEffect } from 'react';

interface CategoryModalProps {
  open: boolean;
  categoryName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  onCreated?: () => void;
}

export function CategoryModal({ open, categoryName, onSave, onCancel, onCreated }: CategoryModalProps) {
  const [form] = Form.useForm();
  const isEditing = Boolean(categoryName);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ name: categoryName || '' });
    }
  }, [open, categoryName, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave(values.name.trim());
      if (!isEditing && onCreated) {
        onCreated();
      }
    } catch {
      // 表单验证失败
    }
  };

  return (
    <Modal
      title={categoryName ? '编辑分类' : '添加分类'}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      destroyOnClose
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
      >
        <Form.Item
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
        >
          <Input placeholder="例如：技术博客" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
