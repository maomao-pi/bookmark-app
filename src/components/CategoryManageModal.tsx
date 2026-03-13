import { Modal, List, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { Category, Bookmark } from '../types';

interface CategoryManageModalProps {
  open: boolean;
  categories: Category[];
  bookmarks: Bookmark[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryManageModal({
  open,
  categories,
  bookmarks,
  onClose,
  onAdd,
  onEdit,
  onDelete
}: CategoryManageModalProps) {
  const getCategoryCount = (categoryId: string) => {
    return bookmarks.filter(b => b.categoryId === categoryId).length;
  };

  return (
    <Modal
      title="管理分类"
      open={open}
      onCancel={onClose}
      footer={
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          添加新分类
        </Button>
      }
      width={500}
      destroyOnClose
    >
      {categories.length > 0 ? (
        <List
          dataSource={categories}
          renderItem={(category) => (
            <List.Item
              className="category-manage-item"
              actions={[
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(category)}
                />,
                <Popconfirm
                  key="delete"
                  title={`确定要删除分类"${category.name}"吗？`}
                  description={
                    getCategoryCount(category.id) > 0 
                      ? `该分类下有 ${getCategoryCount(category.id)} 个收藏，删除后这些收藏将变为无分类。`
                      : undefined
                  }
                  onConfirm={() => onDelete(category)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={category.name}
                description={`${getCategoryCount(category.id)} 个收藏`}
              />
            </List.Item>
          )}
        />
      ) : (
        <div className="empty-categories">
          暂无分类
        </div>
      )}
    </Modal>
  );
}
