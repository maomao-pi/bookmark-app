import { Drawer, List, Button, Popconfirm } from 'antd';
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
  const getCategoryCount = (categoryId: string) =>
    bookmarks.filter(b => b.categoryId === categoryId).length;

  return (
    <Drawer
      title="管理分类"
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      destroyOnClose
      className="category-manage-drawer"
      footer={
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} block>
          添加新分类
        </Button>
      }
    >
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
                    onClick={() => onEdit(category)}
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
                    onConfirm={() => onDelete(category)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除分类 ${category.name}`} />
                  </Popconfirm>
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
        <div className="empty-categories">
          暂无分类
        </div>
      )}
    </Drawer>
  );
}
