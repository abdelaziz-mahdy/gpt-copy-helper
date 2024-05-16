import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  let copyFolderDisposable = vscode.commands.registerCommand(
    "gptCopyHelper.copyFolderContent",
    async (uri: vscode.Uri) => {
      if (uri) {
        const folderPath = uri.fsPath;
        const minimizedContent = await readFolderContent(folderPath);
        await vscode.env.clipboard.writeText(minimizedContent);
        vscode.window.showInformationMessage(
          "Folder content copied to clipboard!"
        );
      } else {
        vscode.window.showErrorMessage("No folder selected.");
      }
    }
  );

  let copyFileDisposable = vscode.commands.registerCommand(
    "gptCopyHelper.copyFileContent",
    async (uri: vscode.Uri) => {
      if (uri) {
        const filePath = uri.fsPath;
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        const minimizedContent = minimizeContent(fileContent);
        await vscode.env.clipboard.writeText(minimizedContent);
        vscode.window.showInformationMessage(
          "File content copied to clipboard!"
        );
      } else {
        vscode.window.showErrorMessage("No file selected.");
      }
    }
  );

  context.subscriptions.push(copyFolderDisposable);
  context.subscriptions.push(copyFileDisposable);
}

async function readFolderContent(folderPath: string): Promise<string> {
  let content = "";
  const files = await fs.promises.readdir(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      content += await readFolderContent(filePath);
    } else {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      content += `${filePath}\n${minimizeContent(fileContent)}\n\n`;
    }
  }

  return content;
}

function minimizeContent(content: string): string {
  const lines = content.split("\n");
  let minimizedContent = "";
  const commentPatterns = [
    /^\s*\/\//, // Single-line comments
    /^\s*\/\*\*/, // Multi-line comment start
    /^\s*\*\//, // Multi-line comment end
    /^\s*\*/, // Multi-line comment continuation
    /^\s*#/, // Hash-style comments (e.g., in some scripts)
  ];

  for (const line of lines) {
    if (commentPatterns.some((pattern) => pattern.test(line))) {
      minimizedContent += line + "\n"; // Keep comment lines as they are
    } else {
      minimizedContent += line.replace(/\s+/g, " ").trim() + " ";
    }
  }

  return minimizedContent.trim();
}

export function deactivate() {}
