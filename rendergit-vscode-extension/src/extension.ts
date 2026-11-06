import * as vscode from 'vscode';
import { runCopyContentForLLMCommand } from './commands/copyContentForLLMCommand';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'rendergit.copyContentForLLM',
    async (...args: unknown[]) => {
      try {
        await runCopyContentForLLMCommand(args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`RenderGit: ${message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}