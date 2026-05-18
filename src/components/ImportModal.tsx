import { useState, useCallback, useRef } from 'react';
import { Modal, Button, Tree, message, Alert, Space, Checkbox, Typography, Popconfirm, Progress, Card, Radio } from 'antd';
import { FolderOutlined, FileTextOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { parseBookmarkHtml, type ParsedFolder, type ParsedBookmark } from '../utils/bookmarkParser';
import './ImportModal.css';

const { Text } = Typography;

interface ImportProgress {
  current: number;
  total: number;
  currentUrl?: string;
}

interface ImportResult {
  importedCount: number;
  createdCategoryIds: string[];
  createdBookmarkIds: string[];
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (
    items: Array<{ title: string; url: string; categoryName?: string; description?: string; tags?: string[] }>,
    createCategories: boolean,
    useAI: boolean,
    onProgress?: (progress: ImportProgress) => void,
    isCanceled?: () => boolean
  ) => Promise<ImportResult>;
  onUndo: (result: ImportResult) => Promise<void>;
  existingUrls: Set<string>;
  aiEnabled: boolean; // AI 功能是否启用
  /** 导入目标类型：'bookmarks' 收藏 | 'discover' 发现 */
  targetType?: 'bookmarks' | 'discover';
}

export function ImportModal({ open, onClose, onImport, onUndo, existingUrls, aiEnabled, targetType = 'bookmarks' }: ImportModalProps) {
  const [parsedData, setParsedData] = useState<ReturnType<typeof parseBookmarkHtml> | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'skip' | 'update'>('skip');
  const [createCategories, setCreateCategories] = useState(true);
  const [useAIForDescription, setUseAIForDescription] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingProgress, setImportingProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [undoing, setUndoing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<boolean>(false);

  // 根据目标类型返回文本
  const getItemName = () => targetType === 'discover' ? '发现内容' : '书签';

  const handleCancelImport = () => {
    cancelRef.current = true;
    setImportingProgress(null);
    setImporting(false);
    message.info('已取消导入');
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.html')) {
      message.error('请选择 HTML 格式的书签文件');
      return;
    }

    // 解析文件内容
    const reader = new FileReader();
    reader.onload = (event) => {
      const html = event.target?.result as string;
      try {
        const result = parseBookmarkHtml(html);
        setParsedData(result);

        // 默认选中所有项目
        const allKeys = collectAllKeys(result.folders, result.flatBookmarks);
        setSelectedKeys(allKeys);

        message.success(`成功解析 ${result.totalCount} 个${getItemName()}`);
      } catch (err) {
        message.error('解析书签文件失败，请确认文件格式正确');
        console.error('Parse error:', err);
      }
    };
    reader.readAsText(file);

    // 重置 input 以便可以选择相同文件
    e.target.value = '';
  }, []);

  const handleImport = async () => {
    if (!parsedData || selectedKeys.length === 0) {
      message.warning('请选择要导入的书签');
      return;
    }

    // 重置取消标志
    cancelRef.current = false;
    setImporting(true);
    setImportingProgress({ current: 0, total: 0 });

    try {
      const items: Array<{ title: string; url: string; categoryName?: string }> = [];

      // 收集选中的书签
      const selectedSet = new Set(selectedKeys);

      // 从 flatBookmarks 中获取选中的
      for (const bookmark of parsedData.flatBookmarks) {
        const key = `bm-${bookmark.url}`;
        if (selectedSet.has(key)) {
          if (importMode === 'skip' && existingUrls.has(bookmark.url)) {
            continue;
          }
          items.push({ title: bookmark.title, url: bookmark.url });
        }
      }

      // 从 folders 中获取选中的
      const addFromFolders = (folders: ParsedFolder[]) => {
        for (const folder of folders) {
          // 只使用当前文件夹名称，不保留完整路径
          const folderName = folder.name;

          for (const item of folder.children) {
            if ('url' in item) {
              const key = `bm-${item.url}`;
              if (selectedSet.has(key)) {
                if (importMode === 'skip' && existingUrls.has(item.url)) {
                  continue;
                }
                items.push({
                  title: item.title,
                  url: item.url,
                  categoryName: createCategories ? folderName : undefined
                });
              }
            } else {
              // 递归处理子文件夹（注意：只传文件夹名称，不传完整路径）
              addFromFolders([item as ParsedFolder]);
            }
          }
        }
      };

      addFromFolders(parsedData.folders);

      // 进度回调
      const onProgress = (progress: ImportProgress) => {
        setImportingProgress(progress);
      };

      // 取消检查回调
      const isCanceled = () => cancelRef.current;

      const result = await onImport(items, createCategories, useAIForDescription, onProgress, isCanceled);
      setImportResult(result);
      message.success(`成功导入 ${result.importedCount} 个${getItemName()}`);
    } catch (err) {
      if (cancelRef.current) {
        message.info('导入已取消');
      } else {
        message.error('导入失败，请重试');
        console.error('Import error:', err);
      }
    } finally {
      setImporting(false);
      setImportingProgress(null);
    }
  };

  const handleUndo = async () => {
    if (!importResult) return;

    setUndoing(true);
    try {
      await onUndo(importResult);
      message.success('已撤销导入');
      setImportResult(null);
      setParsedData(null);
      setSelectedKeys([]);
      onClose();
    } catch (err) {
      message.error('撤销失败，请重试');
      console.error('Undo error:', err);
    } finally {
      setUndoing(false);
    }
  };

  const handleClose = () => {
    if (importing) return; // 导入中不允许关闭
    setParsedData(null);
    setSelectedKeys([]);
    setImportResult(null); // 关闭时清除结果
    onClose();
  };

  const buildTreeData = (): TreeDataNode[] => {
    if (!parsedData) return [];

    const nodes: TreeDataNode[] = [];

    // 添加顶层文件夹
    const addFolderNodes = (folders: ParsedFolder[], parentKey: string): TreeDataNode[] => {
      return folders.map((folder, index) => {
        const folderKey = `${parentKey}-f-${index}`;
        const { children: treeNodes, bookmarkKeys } = collectFolderContents(folder, folderKey);

        return {
          key: folderKey,
          title: (
            <span>
              <FolderOutlined className="import-modal-folder-icon" />
              {folder.name}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                ({bookmarkKeys.length} 个{getItemName()})
              </Text>
            </span>
          ),
          children: [
            ...treeNodes,
            ...folder.children
              .filter((item): item is ParsedBookmark => 'url' in item)
              .map((bookmark) => {
                const bmKey = `bm-${bookmark.url}`;
                const isDuplicate = existingUrls.has(bookmark.url);
                return {
                  key: bmKey,
                  title: (
                    <span>
                      <FileTextOutlined className="import-modal-file-icon" />
                      {bookmark.title}
                      {isDuplicate && (
                        <span className="import-modal-duplicate-tag">已存在</span>
                      )}
                    </span>
                  ),
                  isLeaf: true
                };
              })
          ]
        };
      });
    };

    // 添加顶层书签（不在任何文件夹中的）
    const topLevelBookmarks = parsedData.flatBookmarks.map((bookmark) => {
      const bmKey = `bm-${bookmark.url}`;
      const isDuplicate = existingUrls.has(bookmark.url);
      return {
        key: bmKey,
        title: (
          <span>
            <FileTextOutlined className="import-modal-file-icon" />
            {bookmark.title}
            {isDuplicate && (
              <span className="import-modal-duplicate-tag">已存在</span>
            )}
          </span>
        ),
        isLeaf: true
      };
    });

    nodes.push(...addFolderNodes(parsedData.folders, 'root'));

    if (topLevelBookmarks.length > 0) {
      nodes.push({
        key: 'root-toplevel',
        title: (
          <span>
            <FolderOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
            未分类书签
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              ({topLevelBookmarks.length} 个书签)
            </Text>
          </span>
        ),
        children: topLevelBookmarks
      });
    }

    return nodes;
  };

  return (
    <Modal
      title={targetType === 'discover' ? '导入发现内容' : '导入浏览器书签'}
      open={open}
      onCancel={handleClose}
      width={640}
      footer={
        importResult ? (
          // 导入成功后显示撤销按钮
          <Space>
            <Text type="secondary" style={{ marginRight: 8 }}>
              已导入 {importResult.importedCount} 个{targetType === 'discover' ? '发现内容' : '书签'}
            </Text>
            <Popconfirm
              title="确定要撤销导入吗？"
              description="撤销后不可恢复，已导入的内容和新建的分类都将被删除"
              onConfirm={handleUndo}
              okText="确定撤销"
              cancelText="取消"
              okButtonProps={{ danger: true, loading: undoing }}
            >
              <Button icon={<UndoOutlined />} danger loading={undoing}>
                撤销导入
              </Button>
            </Popconfirm>
            <Button type="primary" onClick={handleClose}>
              完成
            </Button>
          </Space>
        ) : parsedData ? (
          // 选择文件后显示导入按钮
          [
            importing ? (
              <Button key="cancel" onClick={handleCancelImport}>
                取消导入
              </Button>
            ) : (
              <Button key="cancel" onClick={handleClose}>
                取消
              </Button>
            ),
            <Button
              key="import"
              type="primary"
              loading={importing}
              disabled={selectedKeys.length === 0}
              onClick={handleImport}
            >
              导入 {selectedKeys.length} 个{getItemName()}
            </Button>,
          ]
        ) : null // 上传提示状态不显示 footer
      }
    >
      {!parsedData ? (
        <div style={{ padding: '20px 0' }}>
          <input
            type="file"
            accept=".html"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div
            className="ant-upload-drag"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '40px 20px',
              border: '1px dashed #d9d9d9',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.3s'
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽上传浏览器书签 HTML 文件</p>
            <p className="ant-upload-hint">
              支持 Chrome、Firefox、Edge、Safari 等浏览器导出的书签文件
            </p>
          </div>

          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            message="如何导出浏览器书签？"
            description={
              <div style={{ fontSize: 12 }}>
                <div>Chrome/Edge: 设置 → 书签 → 书签管理器 → ⋮ → 导出书签</div>
                <div>Firefox: 书签 → 显示所有书签 → 组织和 → 导出</div>
              </div>
            }
          />
        </div>
      ) : (
        <div>
          {importing && importingProgress ? (
            <Alert
              type="info"
              showIcon
              className="import-modal-progress-container"
              message={
                <div>
                  <Text strong>正在导入...</Text>
                  <Progress
                    percent={Math.round((importingProgress.current / importingProgress.total) * 100)}
                    status="active"
                    showInfo={false}
                    style={{ marginTop: 8 }}
                  />
                  <div className="import-modal-progress-info">
                    <Text type="secondary" className="import-modal-progress-url">
                      {importingProgress.current} / {importingProgress.total}
                      {importingProgress.currentUrl && (
                        <span> - {importingProgress.currentUrl.substring(0, 40)}...</span>
                      )}
                    </Text>
                  </div>
                </div>
              }
            />
          ) : (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              message={
                <span>
                  解析完成，共发现{' '}
                  <strong>{parsedData.totalCount}</strong> 个{getItemName()}，分布在{' '}
                  <strong>{parsedData.folders.length}</strong> 个分类中
                </span>
              }
            />
          )}

          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {/* 导入选项卡片 */}
            <Card size="small" className="import-modal-option-card">
              <div className="import-modal-section-title">导入选项</div>

              <div
                className="import-modal-option-item"
                onClick={() => setCreateCategories(!createCategories)}
              >
                <Checkbox checked={createCategories} onChange={(e) => setCreateCategories(e.target.checked)} />
                <span className="import-modal-option-label">按浏览器文件夹创建分类</span>
              </div>

              {aiEnabled && (
                <div
                  className="import-modal-option-item"
                  onClick={() => setUseAIForDescription(!useAIForDescription)}
                >
                  <Checkbox checked={useAIForDescription} onChange={(e) => setUseAIForDescription(e.target.checked)} />
                  <span className="import-modal-option-label">使用 AI 自动生成描述和标签</span>
                </div>
              )}

              <div style={{ marginTop: 12, paddingLeft: 8 }}>
                <Text type="secondary" className="import-modal-section-title" style={{ marginBottom: 8, display: 'block' }}>重复书签处理</Text>
                <Radio.Group
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="import-mode-selector"
                >
                  <Radio.Button value="skip">跳过</Radio.Button>
                  <Radio.Button value="update">更新（覆盖）</Radio.Button>
                </Radio.Group>
              </div>
            </Card>

            {/* 书签选择区域 */}
            <div>
              <div className="import-modal-section-title">选择要导入的书签</div>
              <Tree
                checkable
                selectable={false}
                defaultExpandAll
                treeData={buildTreeData()}
                checkedKeys={selectedKeys}
                onCheck={(checked) => {
                  if (Array.isArray(checked)) {
                    setSelectedKeys(checked as string[]);
                  }
                }}
                className="import-modal-tree"
              />
              <div className="import-modal-selection-count">
                已选择 <strong>{selectedKeys.length}</strong> 个书签，共 <strong>{parsedData.totalCount}</strong> 个
              </div>
            </div>
          </Space>
        </div>
      )}
    </Modal>
  );
}

function collectAllKeys(folders: ParsedFolder[], flatBookmarks: ParsedBookmark[]): string[] {
  const keys: string[] = [];

  // 从 flat bookmarks
  for (const bookmark of flatBookmarks) {
    keys.push(`bm-${bookmark.url}`);
  }

  // 从 folders
  const collectFromFolder = (folder: ParsedFolder) => {
    for (const item of folder.children) {
      if ('url' in item) {
        keys.push(`bm-${item.url}`);
      } else {
        collectFromFolder(item as ParsedFolder);
      }
    }
  };

  for (const folder of folders) {
    collectFromFolder(folder);
  }

  return keys;
}

function collectFolderContents(
  folder: ParsedFolder,
  _parentKey: string
): { children: TreeDataNode[]; bookmarkKeys: string[] } {
  const children: TreeDataNode[] = [];
  const bookmarkKeys: string[] = [];

  for (const item of folder.children) {
    if ('url' in item) {
      bookmarkKeys.push(`bm-${item.url}`);
    }
  }

  return { children, bookmarkKeys };
}
