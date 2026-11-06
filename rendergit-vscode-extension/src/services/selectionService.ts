import * as vscode from 'vscode';

export async function normalizeSelectionFromCommandArgs(args: unknown[]): Promise<vscode.Uri[]> {
  const resource = args[0] instanceof vscode.Uri ? args[0] : undefined;
  const selectedResources = Array.isArray(args[1])
    ? args[1].filter((item): item is vscode.Uri => item instanceof vscode.Uri)
    : undefined;

  let items: vscode.Uri[] = [];

  if (selectedResources && selectedResources.length > 0) {
    items = selectedResources;
  } else if (resource) {
    items = [resource];
  } else if (vscode.window.activeTextEditor) {
    // Standard fallback if triggered from command palette without right-clicking
    items = [vscode.window.activeTextEditor.document.uri];
  }

  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}