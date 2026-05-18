/**
 * 解析浏览器导出的 Netscape Bookmark HTML 文件
 * 支持 Chrome、Firefox、Edge、Safari 等浏览器导出的格式
 */

export interface ParsedBookmark {
  title: string;
  url: string;
  icon?: string;
  addDate?: number;
}

export interface ParsedFolder {
  name: string;
  children: (ParsedBookmark | ParsedFolder)[];
}

export interface ParseResult {
  folders: ParsedFolder[];
  flatBookmarks: ParsedBookmark[];
  totalCount: number;
}

/**
 * 解析 Netscape Bookmark HTML 文件内容
 */
export function parseBookmarkHtml(html: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const folders: ParsedFolder[] = [];
  const flatBookmarks: ParsedBookmark[] = [];

  // 找到根目录下的 DL 元素
  const rootDl = findRootDl(doc);
  if (rootDl) {
    parseDlElement(rootDl, folders, flatBookmarks);
  }

  return {
    folders,
    flatBookmarks,
    totalCount: countBookmarks(folders, flatBookmarks)
  };
}

function findRootDl(doc: Document): Element | null {
  // Netscape 格式通常在 H1 后面跟着 DL
  const h1 = doc.querySelector('h1');
  if (h1) {
    let sibling = h1.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === 'DL') {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
  }

  // 备用：直接查找顶层的 DL
  const dls = doc.querySelectorAll('dl');
  for (const dl of dls) {
    // 检查是否在根目录下
    let parent = dl.parentElement;
    let depth = 0;
    while (parent) {
      if (parent.tagName === 'BODY') {
        depth = 0;
        break;
      }
      if (parent.tagName === 'DL') {
        depth++;
      }
      parent = parent.parentElement;
    }
    if (depth <= 1) {
      return dl;
    }
  }

  return null;
}

function parseDlElement(
  dl: Element,
  folders: ParsedFolder[],
  flatBookmarks: ParsedBookmark[]
): void {
  const children = dl.children;

  for (const child of children) {
    if (child.tagName === 'DT') {
      const dtChildren = child.children;

      for (const dtChild of dtChildren) {
        if (dtChild.tagName === 'H3') {
          // 这是一个文件夹
          const folderName = dtChild.textContent?.trim() || '未命名文件夹';
          const folderContent = findNextSiblingDl(dtChild);

          if (folderContent) {
            const subFolders: ParsedFolder[] = [];
            const subBookmarks: ParsedBookmark[] = [];
            parseDlElement(folderContent, subFolders, subBookmarks);

            folders.push({
              name: folderName,
              children: [...subFolders, ...subBookmarks]
            });
          } else {
            folders.push({
              name: folderName,
              children: []
            });
          }
        } else if (dtChild.tagName === 'A') {
          // 这是一个书签
          const bookmark = parseBookmarkAnchor(dtChild as HTMLAnchorElement);
          if (bookmark) {
            flatBookmarks.push(bookmark);
          }
        }
      }
    }
  }
}

function findNextSiblingDl(element: Element): Element | null {
  let sibling = element.nextElementSibling;
  while (sibling) {
    if (sibling.tagName === 'DL') {
      return sibling;
    }
    // 如果遇到 DT 或其他非 DL 元素，继续查找
    sibling = sibling.nextElementSibling;
  }
  return null;
}

function parseBookmarkAnchor(a: HTMLAnchorElement): ParsedBookmark | null {
  const href = a.getAttribute('href');
  if (!href || !isValidUrl(href)) {
    return null;
  }

  // 跳过 javascript: 和其他非 HTTP(S) 链接
  if (href.startsWith('javascript:') || href.startsWith('place:')) {
    return null;
  }

  const title = a.textContent?.trim() || new URL(href).hostname;
  const addDateStr = a.getAttribute('add_date');
  const addDate = addDateStr ? parseInt(addDateStr, 10) : undefined;

  // ICON 属性可能包含 base64 编码的图片或 URL
  const icon = a.getAttribute('icon');

  return {
    title,
    url: href,
    icon: icon || undefined,
    addDate: addDate && !isNaN(addDate) ? addDate : undefined
  };
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function countBookmarks(folders: ParsedFolder[], flat: ParsedBookmark[]): number {
  let count = flat.length;

  for (const folder of folders) {
    count += countBookmarksFromFolder(folder);
  }

  return count;
}

function countBookmarksFromFolder(folder: ParsedFolder): number {
  let count = 0;

  for (const item of folder.children) {
    if ('url' in item) {
      count++;
    } else {
      count += countBookmarksFromFolder(item as ParsedFolder);
    }
  }

  return count;
}

/**
 * 将嵌套的文件夹结构扁平化为 category -> bookmarks 的映射
 */
export function flattenFolders(
  folders: ParsedFolder[],
  categoryPrefix = ''
): Array<{ categoryName: string; bookmarks: ParsedBookmark[] }> {
  const result: Array<{ categoryName: string; bookmarks: ParsedBookmark[] }> = [];

  for (const folder of folders) {
    const categoryName = categoryPrefix ? `${categoryPrefix} / ${folder.name}` : folder.name;
    const bookmarks: ParsedBookmark[] = [];

    for (const item of folder.children) {
      if ('url' in item) {
        bookmarks.push(item);
      } else {
        // 递归处理子文件夹
        result.push(...flattenFolders([item as ParsedFolder], categoryName));
      }
    }

    result.push({ categoryName, bookmarks });
  }

  return result;
}

/**
 * 从解析结果中获取所有书签（包含嵌套文件夹中的）
 */
export function getAllBookmarks(result: ParseResult): ParsedBookmark[] {
  const all: ParsedBookmark[] = [...result.flatBookmarks];

  function collectFromFolders(folders: ParsedFolder[]) {
    for (const folder of folders) {
      for (const item of folder.children) {
        if ('url' in item) {
          all.push(item);
        } else {
          collectFromFolders([item as ParsedFolder]);
        }
      }
    }
  }

  collectFromFolders(result.folders);
  return all;
}
