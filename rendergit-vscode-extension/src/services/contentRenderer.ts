import * as vscode from 'vscode';
import { FileDecisionReason, FileEntry, TreeNode } from '../types';
import { extension } from '../utils/fsUtils';

const NOTEBOOK_EXTENSIONS = new Set(['.ipynb']);
const UTF8_DECODER_LOSSY = new TextDecoder('utf-8');

export async function buildDocumentsPayload(
  entries: FileEntry[],
  convertNotebooks: boolean
): Promise<string> {
  let output = '<documents>\n';

  for (const [index, entry] of entries.entries()) {
    const content = await readSourceText(entry, convertNotebooks);

    output += `<document index="${index + 1}">\n`;
    output += `<source>${escapeXml(entry.relativePath)}</source>\n`;
    output += '<document_content>\n';
    // Wrap in CDATA to prevent LLM parsing breakage if code contains </document_content>
    output += `<![CDATA[\n${content.replace(/]]>/g, ']]]]><![CDATA[>')}\n]]>\n`;
    output += '</document_content>\n';
    output += '</document>\n';
  }

  output += '</documents>\n';
  return output;
}

export function buildProjectTreePayload(forest: TreeNode[]): string {
  let output = '<project_tree>\n';
  output += forest.map(node => renderTreeNode(node, '', true, true)).join('\n');
  output += '\n</project_tree>';
  return output;
}

export function summarizeSkipped(entries: FileEntry[]): string {
  const counters: Record<FileDecisionReason, number> = {
    ok: 0,
    binary: 0,
    too_large: 0,
    excluded: 0,
    missing: 0
  };

  for (const entry of entries) {
    counters[entry.reason] += 1;
  }

  const parts: string[] = [];
  if (counters.binary > 0) parts.push(`${counters.binary} binary`);
  if (counters.too_large > 0) parts.push(`${counters.too_large} too large`);
  if (counters.excluded > 0) parts.push(`${counters.excluded} excluded folder${counters.excluded === 1 ? '' : 's'}`);
  if (counters.missing > 0) parts.push(`${counters.missing} missing/unreadable`);

  return parts.length > 0 ? `Skipped: ${parts.join(', ')}.` : '';
}

export function humanBytes(value: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return index === 0 ? `${Math.round(size)} ${units[index]}` : `${size.toFixed(1)} ${units[index]}`;
}

async function readSourceText(entry: FileEntry, convertNotebooks: boolean): Promise<string> {
  const bytes = entry.content ?? await vscode.workspace.fs.readFile(entry.uri);
  const text = UTF8_DECODER_LOSSY.decode(bytes);

  if (convertNotebooks && NOTEBOOK_EXTENSIONS.has(extension(entry.uri))) {
    return notebookToPythonText(text);
  }

  return text;
}

function notebookToPythonText(rawNotebook: string): string {
  try {
    const notebook = JSON.parse(rawNotebook) as {
      cells?: Array<{ cell_type?: string; source?: string | string[] }>;
    };

    const cells = notebook.cells ?? [];
    const chunks: string[] = [];

    cells.forEach((cell, index) => {
      if (index > 0) chunks.push('');

      const cellType = cell.cell_type ?? 'unknown';
      const source = normalizeNotebookSource(cell.source);

      if (cellType === 'markdown') {
        chunks.push('# %% [markdown]');
        chunks.push(markdownToPythonComments(source));
      } else if (cellType === 'code') {
        chunks.push('# %%');
        chunks.push(source.replace(/\n$/, ''));
      } else {
        chunks.push(`# %% [${cellType}]`);
        chunks.push(markdownToPythonComments(source));
      }
    });

    return chunks.join('\n').replace(/\s*$/, '\n');
  } catch {
    return rawNotebook;
  }
}

function normalizeNotebookSource(source?: string | string[]): string {
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return source.join('');
  return '';
}

function markdownToPythonComments(text: string): string {
  if (text.length === 0) return '#';
  const lines = text.split(/\r?\n/);
  return lines.map((line) => (line.length === 0 ? '#' : `# ${line}`)).join('\n');
}

function renderTreeNode(node: TreeNode, prefix = '', isLast = true, isRoot = false): string {
  const line = isRoot
    ? `${node.name}${node.excluded ? ' [excluded]' : ''}`
    : `${prefix}${isLast ? '└── ' : '├── '}${node.name}${node.excluded ? ' [excluded]' : ''}`;

  if (!node.isDirectory || node.excluded || !node.children?.length) {
    return line;
  }

  const childPrefix = isRoot ? '' : `${prefix}${isLast ? '    ' : '│   '}`;
  const childLines = node.children.map((child, index) =>
    renderTreeNode(child, childPrefix, index === node.children!.length - 1, false)
  );

  return [line, ...childLines].join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}