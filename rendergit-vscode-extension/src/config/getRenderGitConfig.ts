import * as vscode from 'vscode';
import { RenderGitConfig } from '../types';

const ALWAYS_EXCLUDED = ['.git'];

export function getRenderGitConfig(): RenderGitConfig {
  const config = vscode.workspace.getConfiguration('rendergit');
  const userExcludes = config.get<string[]>('excludeDirNames', []);

  return {
    maxBytes: config.get<number>('maxBytes', 100 * 1024),
    excludeDirNames: new Set([...ALWAYS_EXCLUDED, ...userExcludes]),
    includeProjectTree: config.get<boolean>('includeProjectTree', true),
    convertNotebooks: config.get<boolean>('convertNotebooks', true)
  };
}