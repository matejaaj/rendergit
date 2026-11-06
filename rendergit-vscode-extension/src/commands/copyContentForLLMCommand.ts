import * as vscode from 'vscode';
import { getRenderGitConfig } from '../config/getRenderGitConfig';
import { buildFileSystemTree, flattenTreeFiles } from '../services/fileSystemWalker';
import { buildDocumentsPayload, buildProjectTreePayload, summarizeSkipped, humanBytes } from '../services/contentRenderer';
import { normalizeSelectionFromCommandArgs } from '../services/selectionService';

export async function runCopyContentForLLMCommand(args: unknown[]): Promise<void> {
  const config = getRenderGitConfig();
  const selected = await normalizeSelectionFromCommandArgs(args);

  if (selected.length === 0) {
    throw new Error('No files or folders are selected.');
  }

  const fileTree = await buildFileSystemTree(selected, config);
  const fileEntries = flattenTreeFiles(fileTree);
  const included = fileEntries.filter((entry) => entry.reason === 'ok');

  if (included.length === 0) {
    const skippedSummary = summarizeSkipped(fileEntries);
    throw new Error(`No text files were eligible to copy. ${skippedSummary}`.trim());
  }

  let output = '';

  if (config.includeProjectTree) {
    output += buildProjectTreePayload(fileTree);
    output += '\n\n';
  }

  output += await buildDocumentsPayload(included, config.convertNotebooks);

  await vscode.env.clipboard.writeText(output);

  const skippedSummary = summarizeSkipped(fileEntries);
  const payloadBytes = Buffer.byteLength(output, 'utf8');

  const message = [
    `Copied ${included.length} file${included.length === 1 ? '' : 's'} for LLM.`,
    skippedSummary,
    `Payload size: ${humanBytes(payloadBytes)}.`
  ].filter(Boolean).join(' ');

  void vscode.window.showInformationMessage(message);
}