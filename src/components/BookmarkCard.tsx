import { Card, Tag, Button, Tooltip, Checkbox } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PushpinFilled, LinkOutlined } from '@ant-design/icons';
import type { Bookmark } from '../types';
import { logger } from '../utils/logger';
import './BookmarkCard.css';

interface BookmarkCardProps {
  bookmark: Bookmark & { pinned?: boolean };
  categoryName: string | null;
  onView: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  /** 是否显示卡片底部的查看/编辑/删除操作，发现页传 false */
  showActions?: boolean;
  /** 是否显示选择框 */
  selectable?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 选中状态变化回调 */
  onSelect?: (bookmark: Bookmark, selected: boolean) => void;
}

function getDomain(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (err) {
    logger.warn('BookmarkCard.getDomain', 'Invalid URL:', url);
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch (err) {
    logger.warn('BookmarkCard.getFaviconUrl', 'Invalid URL:', url);
    return '';
  }
}

export function BookmarkCard({ bookmark, categoryName, onView, onEdit, onDelete, showActions = true, selectable, selected, onSelect }: BookmarkCardProps) {
  const { tags = [] } = bookmark;
  const favicon = bookmark.favicon || getFaviconUrl(bookmark.url);

  const domain = getDomain(bookmark.url);
  // 只隐藏默认的「网页」类型，其余（包括「视频」）全部展示
  const displayTags = tags.filter(tag => tag && tag.trim() && tag !== '网页');
  const hasTags = displayTags.length > 0;
  // 单行只展示最多 2 个标签，剩余用 +N 表示
  const visibleTags = displayTags.slice(0, 2);
  const hiddenCount = displayTags.length - visibleTags.length;

  return (
    <Card
      className={`bookmark-card ${selected ? 'bookmark-card-selected' : ''}`}
      hoverable
      onClick={() => {
        if (selectable && onSelect) {
          onSelect(bookmark, !selected);
        } else {
          onView(bookmark);
        }
      }}
      style={selectable ? { cursor: 'pointer' } : undefined}
    >
      <div className="bookmark-card-inner">
        <div className="bookmark-card-header">
          {selectable && (
            <Checkbox
              checked={selected}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(bookmark, !selected);
              }}
              style={{ marginRight: 8 }}
            />
          )}
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
            <div className="bookmark-title" title={bookmark.title}>
              {bookmark.pinned && <PushpinFilled className="bookmark-pin-icon" />}
              {bookmark.title}
            </div>
            <div className="bookmark-meta">
              {categoryName && <Tag className="bookmark-category-tag">{categoryName}</Tag>}
              {hasTags ? (
                <>
                  {visibleTags.map((tag, index) => (
                    <Tag key={index} className="bookmark-tag">{tag}</Tag>
                  ))}
                  {hiddenCount > 0 && (
                    <Tag className="bookmark-tag bookmark-tag-more">+{hiddenCount}</Tag>
                  )}
                </>
              ) : (
                <Tag className="bookmark-type-tag" title={bookmark.url}>{domain}</Tag>
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
              <Tooltip title="直接访问">
                <Button
                  type="text"
                  icon={<LinkOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
                  }}
                />
              </Tooltip>
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
