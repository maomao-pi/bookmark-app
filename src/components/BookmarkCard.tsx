import { Card, Tag, Button, Tooltip } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Bookmark } from '../types';
import './BookmarkCard.css';

interface BookmarkCardProps {
  bookmark: Bookmark;
  categoryName: string | null;
  onView: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  /** 是否显示卡片底部的查看/编辑/删除操作，发现页传 false */
  showActions?: boolean;
}

function getDomain(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return '';
  }
}

export function BookmarkCard({ bookmark, categoryName, onView, onEdit, onDelete, showActions = true }: BookmarkCardProps) {
  const { tags = [] } = bookmark;
  const favicon = bookmark.favicon || getFaviconUrl(bookmark.url);

  const domain = getDomain(bookmark.url);
  // 只隐藏默认的「网页」类型，其余（包括「视频」）全部展示
  const displayTags = tags.filter(tag => tag && tag.trim() && tag !== '网页');
  const hasTags = displayTags.length > 0;

  return (
    <Card 
      className="bookmark-card"
      hoverable
      onClick={() => onView(bookmark)}
    >
      <div className="bookmark-card-inner">
        <div className="bookmark-card-header">
          <div className="bookmark-avatar">
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="bookmark-avatar-img"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const fallback = img.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              className="bookmark-avatar-fallback"
              style={{ display: favicon ? 'none' : 'flex' }}
            >
              {bookmark.title?.charAt(0) || '网'}
            </span>
          </div>
          <div className="bookmark-info">
            <div className="bookmark-title" title={bookmark.title}>{bookmark.title}</div>
            <div className="bookmark-meta">
              {categoryName && <Tag className="bookmark-category-tag">{categoryName}</Tag>}
              {hasTags ? (
                displayTags.slice(0, 3).map((tag, index) => (
                  <Tag key={index} className="bookmark-tag">{tag}</Tag>
                ))
              ) : (
                <Tag className="bookmark-type-tag" title={bookmark.url}>{domain}</Tag>
              )}
              {hasTags && displayTags.length > 3 && (
                <Tag className="bookmark-tag">+{displayTags.length - 3}</Tag>
              )}
            </div>
          </div>
        </div>
        
        {bookmark.description && (
          <div className="bookmark-description">
            {bookmark.description}
          </div>
        )}
        
        <div className="bookmark-footer">
          <div className="bookmark-url" title={bookmark.url}>
            {domain}
          </div>
          {showActions && (
            <div className="bookmark-actions" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="查看详情">
                <Button 
                  type="text" 
                  icon={<EyeOutlined />} 
                  onClick={() => onView(bookmark)}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={() => onEdit(bookmark)}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => onDelete(bookmark)}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
