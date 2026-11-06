import * as vscode from 'vscode';

export type FileDecisionReason = 'ok' | 'binary' | 'too_large' | 'excluded' | 'missing';

export interface FileEntry {
  uri: vscode.Uri;
  relativePath: string;
  size: number;
  reason: FileDecisionReason;
  content?: Uint8Array;
}

export interface TreeNode {
  name: string;
  isDirectory: boolean;
  excluded?: boolean;
  entry?: FileEntry; 
  children?: TreeNode[];
}

export interface RenderGitConfig {
  maxBytes: number;
  excludeDirNames: Set<string>;
  includeProjectTree: boolean;
  convertNotebooks: boolean;
}