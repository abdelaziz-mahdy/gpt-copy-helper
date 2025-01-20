import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import ignore from "ignore";

export function activate(context: vscode.ExtensionContext) {
  let copyFolderDisposable = vscode.commands.registerCommand(
    "gptCopyHelper.copyFolderContent",
    async (uri: vscode.Uri) => {
      if (uri) {
        const folderPath = uri.fsPath;
        const minimizedContent = await readFolderContent(
          folderPath,
          folderPath
        );
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
        const relativePath = vscode.workspace.asRelativePath(filePath);
        const minimizedContent = minimizeContent(fileContent, filePath);
        await vscode.env.clipboard.writeText(
          `${relativePath}\n${minimizedContent}`
        );
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

async function readFolderContent(
  folderPath: string,
  baseFolderPath: string
): Promise<string> {
  const excludePatterns = vscode.workspace
    .getConfiguration("gptCopyHelper")
    .get("excludeFiles", []);
  const respectGitIgnore = vscode.workspace
    .getConfiguration("gptCopyHelper")
    .get("respectGitIgnore", true); // Get the setting

  let content = "";
  const files = await fs.promises.readdir(folderPath);

  // Create an ignore filter (if enabled)
  const ig = ignore();
  if (respectGitIgnore) {
    const gitIgnorePath = path.join(baseFolderPath, ".gitignore");
    if (fs.existsSync(gitIgnorePath)) {
      const gitIgnoreContent = await fs.promises.readFile(
        gitIgnorePath,
        "utf-8"
      );
      ig.add(gitIgnoreContent);
    }
  }

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = await fs.promises.stat(filePath);
    const relativePath = path.relative(baseFolderPath, filePath);

    // Check if ignored by .gitignore or excludePatterns
    if (
      (respectGitIgnore && ig.ignores(relativePath)) ||
      excludePatterns.some((pattern: string) => filePath.includes(pattern))
    ) {
      continue;
    }

    if (stat.isDirectory()) {
      content += await readFolderContent(filePath, baseFolderPath);
    } else {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const relativeToWorkspace = vscode.workspace.asRelativePath(filePath);
      content += `${relativeToWorkspace}\n${minimizeContent(
        fileContent,
        filePath
      )}\n\n`;
    }
  }

  return content;
}

function minimizeContent(content: string, filePath: string): string {
  const excludeExtensions = vscode.workspace
    .getConfiguration("gptCopyHelper")
    .get("excludeMinimizeExtensions", []);
  const minimizeAllFiles = vscode.workspace
    .getConfiguration("gptCopyHelper")
    .get("minimizeAllFiles", true);

  if (
    !minimizeAllFiles ||
    excludeExtensions.some((ext: string) => filePath.endsWith(ext))
  ) {
    return content;
  }

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
