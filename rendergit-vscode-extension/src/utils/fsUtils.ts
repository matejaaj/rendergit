import * as vscode from 'vscode';

export function basename(uri: vscode.Uri): string {
  const parts = uri.path.split('/');
  return parts[parts.length - 1] || '';
}

export function extension(uri: vscode.Uri): string {
  const name = basename(uri);
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

export function sortDirectoryEntries(entries: [string, vscode.FileType][]): void {
  entries.sort((a, b) => {
    const dirA = (a[1] & vscode.FileType.Directory) !== 0;
    const dirB = (b[1] & vscode.FileType.Directory) !== 0;
    if (dirA !== dirB) {
      return dirA ? -1 : 1;
    }
    return a[0].localeCompare(b[0]);
  });
}