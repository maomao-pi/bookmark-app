import { useState, useEffect } from 'react';
import { Drawer, List, Button, Popconfirm, Form, Input, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { Category, Bookmark } from '../types';
import { logger } from '../utils/logger';

  interface CategoryManageModalProps {
  open: boolean;
  categories: Category[];
  bookmarks: Bookmark[];
  onClose: () => void;
  onSave: (name: string, editingCategoryId?: string) => Promise<void>;
  onDelete: (category: Category) => void;
  editingCategory?: Category | null; // external trigger to open in edit mode
}

type Mode = 'list' | 'form';
type FormMode = 'add' | 'edit';

export function CategoryManageModal({
  open,
  categories,
  bookmarks,
  onClose,
  onSave,
  onDelete,
  editingCategory,
}: CategoryManageModalProps) {
  const [mode, setMode] = useState<Mode>('list');
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [internalEditing, setInternalEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // When drawer opens, check if external editingCategory is set
  useEffect(() => {
    if (open) {
      if (editingCategory) {
        setMode('form');
        setFormMode('edit');
        setInternalEditing(editingCategory);
        form.setFieldsValue({ name: editingCategory.name });
      } else {
        setMode('list');
        setFormMode('add');
        setInternalEditing(null);
        form.resetFields();
      }
    }
  }, [open, editingCategory, form]);

  // Sync reset when drawer closes
  useEffect(() => {
    if (!open) {
      setMode('list');
      setFormMode('add');
      setInternalEditing(null);
      form.resetFields();
    }
  }, [open, form]);

  const getCategoryCount = (categoryId: string) =>
    bookmarks.filter((b) => b.categoryId === categoryId).length;

  const handleAddClick = () => {
    setFormMode('add');
    setInternalEditing(null);
    form.resetFields();
    setMode('form');
  };

  const handleEditClick = (category: Category) => {
    setFormMode('edit');
    setInternalEditing(category);
    form.setFieldsValue({ name: category.name });
    setMode('form');
  };

  const handleBackToList = () => {
    setMode('list');
    setFormMode('add');
    setInternalEditing(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const trimmedName = values.name.trim();
      if (!trimmedName) {
        message.error('分类名称不能为空');
        return;
      }
      setSaving(true);
      try {
        await onSave(trimmedName, internalEditing?.id);
        handleBackToList();
      } catch (err) {
        logger.warn('CategoryManageModal.handleSave', 'Save failed:', err);
      } finally {
        setSaving(false);
      }
    } catch (err) {
      logger.warn('CategoryManageModal.handleSave', 'Form validation failed:', err);
    }
  };

  const handleDeleteConfirm = (category: Category) => {
    onDelete(category);
  };

  // ── Form view ────────────────────────────────────────────────
  const formView = (
    <div className="category-form-section">
      <div className="category-form-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBackToList}
          className="category-form-back-btn"
        >
          返回列表
        </Button>
        <span className="category-form-title">
          {formMode === 'add' ? '添加分类' : '编辑分类'}
        </span>
      </div>
      <Form form={form} layout="vertical" className="category-inline-form">
        <Form.Item
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
        >
          <Input placeholder="例如：技术博客" maxLength={50} />
        </Form.Item>
        <Button type="primary" loading={saving} onClick={handleSave} block>
          {saving ? '保存中…' : '保存'}
        </Button>
      </Form>
    </div>
  );

  // ── List view ────────────────────────────────────────────────
  const listView = (
    <>
      {categories.length > 0 ? (
        <List
          className="category-manage-list"
          dataSource={categories}
          renderItem={(category) => {
            const count = getCategoryCount(category.id);
            return (
              <List.Item
                className="category-manage-item"
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditClick(category)}
                    aria-label={`编辑分类 ${category.name}`}
                  />,
                  <Popconfirm
                    key="delete"
                    title={`确定要删除分类「${category.name}」吗？`}
                    description={
                      count > 0
                        ? `该分类下有 ${count} 个收藏，删除后这些收藏将变为无分类。`
                        : undefined
                    }
                    onConfirm={() => handleDeleteConfirm(category)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`删除分类 ${category.name}`}
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={<span className="category-manage-title">{category.name}</span>}
                  description={<span className="category-manage-count">{count} 个收藏</span>}
                />
              </List.Item>
            );
          }}
        />
      ) : (
        <div className="empty-categories">暂无分类</div>
      )}
    </>
  );

  return (
    <Drawer
      title={mode === 'form' ? '' : '管理分类'}
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      destroyOnClose
      className="category-manage-drawer"
      headerStyle={mode === 'form' ? { display: 'none' } : undefined}
      footer={
        mode === 'list' ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick} block>
            添加新分类
          </Button>
        ) : null
      }
    >
      {mode === 'form' ? formView : listView}
    </Drawer>
  );
}
