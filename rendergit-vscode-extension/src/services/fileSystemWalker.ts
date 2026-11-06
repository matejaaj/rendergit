import * as vscode from 'vscode';
import { FileEntry, TreeNode, RenderGitConfig } from '../types';
import { basename, extension, sortDirectoryEntries } from '../utils/fsUtils';

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.mp3', '.mp4', '.mov', '.avi', '.mkv', '.wav', '.ogg', '.flac',
  '.ttf', '.otf', '.eot', '.woff', '.woff2',
  '.so', '.dll', '.dylib', '.class', '.jar', '.exe', '.bin'
]);

export async function buildFileSystemTree(
  roots: vscode.Uri[],
  config: RenderGitConfig
): Promise<TreeNode[]> {
  const forest: TreeNode[] = [];
  const seenUris = new Set<string>();

  for (const root of roots) {
    const node = await visitUri(root, config, seenUris);
    if (node) forest.push(node);
  }

  return forest;
}

export function flattenTreeFiles(nodes: TreeNode[]): FileEntry[] {
  const files: FileEntry[] = [];
  const walk = (node: TreeNode) => {
    if (node.entry) files.push(node.entry);
    node.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function visitUri(
  uri: vscode.Uri,
  config: RenderGitConfig,
  seenUris: Set<string>
): Promise<TreeNode | undefined> {
  const key = uri.toString();
  if (seenUris.has(key)) return undefined;
  seenUris.add(key);

  const name = basename(uri);
  let stat: vscode.FileStat;

  try {
    stat = await vscode.workspace.fs.stat(uri);
  } catch {
    return { name, isDirectory: false, entry: createFileEntry(uri, 0, 'missing') };
  }

  if ((stat.type & vscode.FileType.Directory) !== 0) {
    if (config.excludeDirNames.has(name)) {
      return { name, isDirectory: true, excluded: true, entry: createFileEntry(uri, 0, 'excluded') };
    }

    const node: TreeNode = { name, isDirectory: true, children: [] };
    const children = await vscode.workspace.fs.readDirectory(uri);
    sortDirectoryEntries(children);

    for (const [childName, childType] of children) {
      if ((childType & vscode.FileType.SymbolicLink) !== 0) continue;
      const childNode = await visitUri(vscode.Uri.joinPath(uri, childName), config, seenUris);
      if (childNode) node.children!.push(childNode);
    }
    return node;
  }

  const size = stat.size;
  let reason: FileEntry['reason'] = 'ok';
  let content: Uint8Array | undefined;

  if (size > config.maxBytes) {
    reason = 'too_large';
  } else if (BINARY_EXTENSIONS.has(extension(uri))) {
    reason = 'binary';
  } else {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      if (looksBinary(bytes)) reason = 'binary';
      else content = bytes;
    } catch {
      reason = 'missing';
    }
  }

  return { name, isDirectory: false, entry: createFileEntry(uri, size, reason, content) };
}

function createFileEntry(
  uri: vscode.Uri,
  size: number,
  reason: FileEntry['reason'],
  content?: Uint8Array
): FileEntry {
  return { uri, relativePath: computeRelativePath(uri), size, reason, content };
}

function looksBinary(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 8192);
  for (let i = 0; i < limit; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

function computeRelativePath(uri: vscode.Uri): string {
  const workspaceRelative = vscode.workspace.asRelativePath(uri, false);
  if (workspaceRelative !== uri.fsPath) {
    return workspaceRelative.replace(/\\/g, '/');
  }
  return basename(uri);
}