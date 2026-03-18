import { useState, useEffect, useCallback } from 'react';
import { Button, Input, List, Popconfirm, message, Empty, Spin, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { Note } from '../types';
import { userApi } from '../services/userApi';
import './NoteSection.css';

const { TextArea } = Input;
const { Text } = Typography;

interface NoteSectionProps {
  bookmarkId: string;
}

export function NoteSection({ bookmarkId }: NoteSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.getNotes(bookmarkId);
      setNotes(data);
    } catch (err) {
      console.error('加载笔记失败:', err);
      message.error('笔记加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }, [bookmarkId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAdd = async () => {
    if (!newContent.trim()) {
      message.warning('请输入笔记内容');
      return;
    }
    setSaving(true);
    try {
      const note = await userApi.createNote(bookmarkId, newContent.trim());
      setNotes(prev => [note, ...prev]);
      setNewContent('');
      setAdding(false);
      message.success('笔记已添加');
    } catch {
      message.error('添加失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim()) {
      message.warning('请输入笔记内容');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateNote(bookmarkId, noteId, editContent.trim());
      setNotes(prev =>
        prev.map(n => n.id === noteId ? { ...n, content: editContent.trim(), updatedAt: new Date().toISOString() } : n)
      );
      setEditingId(null);
      message.success('笔记已更新');
    } catch {
      message.error('更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await userApi.deleteNote(bookmarkId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      message.success('笔记已删除');
    } catch {
      message.error('删除失败，请重试');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="note-section">
      <div className="note-section-header">
        <span className="note-section-title">笔记</span>
        {!adding && (
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAdding(true)}
            className="note-add-btn"
          >
            添加笔记
          </Button>
        )}
      </div>

      {adding && (
        <div className="note-editor">
          <TextArea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="写下你的笔记..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            autoFocus
          />
          <div className="note-editor-actions">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={handleAdd}
              loading={saving}
            >
              保存
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => { setAdding(false); setNewContent(''); }}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="note-loading"><Spin size="small" /></div>
      ) : notes.length === 0 && !adding ? (
        <Empty description="暂无笔记" image={Empty.PRESENTED_IMAGE_SIMPLE} className="note-empty" />
      ) : (
        <List
          dataSource={notes}
          renderItem={note => (
            <List.Item className="note-item" key={note.id}>
              {editingId === note.id ? (
                <div className="note-edit-area" style={{ width: '100%' }}>
                  <TextArea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    autoFocus
                  />
                  <div className="note-editor-actions">
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleSaveEdit(note.id)}
                      loading={saving}
                    >
                      保存
                    </Button>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setEditingId(null)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="note-item-content">
                  <div className="note-text">{note.content}</div>
                  <div className="note-footer">
                    <Text type="secondary" className="note-date">{formatDate(note.createdAt)}</Text>
                    <div className="note-item-actions">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleStartEdit(note)}
                      />
                      <Popconfirm
                        title="确认删除此笔记？"
                        onConfirm={() => handleDelete(note.id)}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              )}
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
