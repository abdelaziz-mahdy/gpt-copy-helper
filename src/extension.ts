import * as vscode from "vscode";
import * as path from "path";
import ignore, { Ignore } from "ignore";
import { TextDecoder } from "util";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gptCopyHelper.copyFolderContent",
      async (uri: vscode.Uri) => {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!uri || !workspaceFolder) {
          vscode.window.showErrorMessage(
            "No folder selected or not in a workspace."
          );
          return;
        }
        const folderPath = uri.fsPath;
        const minimizedContent = await readFolderContent(
          workspaceFolder,
          folderPath
        );
        if (minimizedContent) {
          await vscode.env.clipboard.writeText(minimizedContent);
          vscode.window.showInformationMessage(
            "Folder content copied to clipboard!"
          );
        } else {
          vscode.window.showErrorMessage(
            "Failed to read folder content or folder is empty. or all files are excluded."
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gptCopyHelper.copyFileContent",
      async (uri: vscode.Uri) => {
        if (!uri) {
          vscode.window.showErrorMessage("No file selected.");
          return;
        }
        const filePath = uri.fsPath;
        try {
          const fileContent = await vscode.workspace.fs.readFile(uri);
          const relativePath = vscode.workspace.asRelativePath(filePath);
          const minimizedContent = minimizeContent(
            new TextDecoder().decode(fileContent),
            filePath
          );
          await vscode.env.clipboard.writeText(
            `${relativePath}\n${minimizedContent}`
          );
          vscode.window.showInformationMessage(
            "File content copied to clipboard!"
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Error reading file: ${error}`);
        }
      }
    )
  );
}

async function readFolderContent(
  workspaceFolder: vscode.WorkspaceFolder,
  folderPath: string
): Promise<string> {
  const excludePatterns: string[] = vscode.workspace
    .getConfiguration("gptCopyHelper")
    .get("excludeFiles", []);
  const respectGitIgnore: boolean = vscode.workspace
    .getConfiguration("gptCopyHelper")
    .get("respectGitIgnore", true);

  const ig = await loadGitIgnore(respectGitIgnore, workspaceFolder);

  return await readDirectory(workspaceFolder, folderPath, ig, excludePatterns);
}

async function readDirectory(
  workspaceFolder: vscode.WorkspaceFolder,
  dirPath: string,
  ig: Ignore | null,
  excludePatterns: string[]
): Promise<string> {
  let content = "";
  const entries = await vscode.workspace.fs.readDirectory(
    vscode.Uri.file(dirPath)
  );

  for (const [entryName, entryType] of entries) {
    const entryPath = vscode.Uri.joinPath(vscode.Uri.file(dirPath), entryName);
    const relativePath = path.posix.relative(
      workspaceFolder.uri.path,
      entryPath.path
    );

    if (
      ig?.ignores(relativePath) ||
      excludePatterns.some((pattern) => relativePath.includes(pattern))
    ) {
      console.log(`Ignoring ${relativePath}`);
      continue;
    }

    if (entryType === vscode.FileType.Directory) {
      content += await readDirectory(
        workspaceFolder,
        entryPath.fsPath,
        ig,
        excludePatterns
      );
    } else if (entryType === vscode.FileType.File) {
      try {
        const fileContent = await vscode.workspace.fs.readFile(entryPath);
        const relativeToWorkspace = vscode.workspace.asRelativePath(entryPath);

        content += `${relativeToWorkspace}\n${minimizeContent(
          new TextDecoder().decode(fileContent),
          entryPath.fsPath
        )}\n\n`;
      } catch (error) {
        console.error(`Error reading file ${entryPath.fsPath}:`, error);
      }
    }
  }

  return content;
}

async function loadGitIgnore(
  respectGitIgnore: boolean,
  workspaceFolder: vscode.WorkspaceFolder
): Promise<Ignore | null> {
  if (!respectGitIgnore) {
    return null;
  }

  const gitIgnorePath = vscode.Uri.joinPath(workspaceFolder.uri, ".gitignore");
  try {
    const gitIgnoreStat = await vscode.workspace.fs.stat(gitIgnorePath);
    if (gitIgnoreStat) {
      const gitIgnoreContent = await vscode.workspace.fs.readFile(
        gitIgnorePath
      );
      const gitIgnoreContentString = new TextDecoder().decode(gitIgnoreContent);
      return ignore().add(gitIgnoreContentString);
    }
  } catch (error) {
    console.warn("Could not load .gitignore:", error);
  }

  return null;
}

function minimizeContent(content: string, filePath: string): string {
  const config = vscode.workspace.getConfiguration("gptCopyHelper");
  const excludeExtensions: string[] = config.get(
    "excludeMinimizeExtensions",
    []
  );
  const minimizeAllFiles: boolean = config.get("minimizeAllFiles", true);

  if (
    !minimizeAllFiles ||
    excludeExtensions.some((ext) => filePath.endsWith(ext))
  ) {
    return content;
  }

  const commentPatterns = [
    /^\s*\/\//, // Single-line comments
    /^\s*\/\*\*/, // Multi-line comment start
    /^\s*\*\//, // Multi-line comment end
    /^\s*\*/, // Multi-line comment continuation
    /^\s*#/, // Hash-style comments
  ];

  return content
    .split("\n")
    .map((line) =>
      commentPatterns.some((pattern) => pattern.test(line))
        ? line + "\n"
        : line.replace(/\s+/g, " ").trim() + " "
    )
    .join("")
    .trim();
}

export function deactivate() {}
