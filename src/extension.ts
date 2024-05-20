import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
    let copyFolderDisposable = vscode.commands.registerCommand(
        "gptCopyHelper.copyFolderContent",
        async (uri: vscode.Uri) => {
            if (uri) {
                const folderPath = uri.fsPath;
                const minimizedContent = await readFolderContent(folderPath, folderPath);
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
                const minimizedContent = minimizeContent(fileContent, filePath);
                const relativePath = path.relative(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', filePath);
                await vscode.env.clipboard.writeText(`${relativePath}\n${minimizedContent}`);
                vscode.window.showInformationMessage(
                    "File content copied to clipboard!"
                );
            } else {
                vscode.window.showErrorMessage("No file selected.");
            }
        }
    );

    let copyMultipleFilesDisposable = vscode.commands.registerCommand(
        "gptCopyHelper.copyMultipleFilesContent",
        async (uris: vscode.Uri[]) => {
            if (uris && uris.length > 0) {
                let combinedContent = "";
                for (const uri of uris) {
                    const filePath = uri.fsPath;
                    const fileContent = await fs.promises.readFile(filePath, "utf-8");
                    const minimizedContent = minimizeContent(fileContent, filePath);
                    const relativePath = path.relative(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', filePath);
                    combinedContent += `${relativePath}\n${minimizedContent}\n\n`;
                }
                await vscode.env.clipboard.writeText(combinedContent.trim());
                vscode.window.showInformationMessage(
                    "Multiple files content copied to clipboard!"
                );
            } else {
                vscode.window.showErrorMessage("No files selected.");
            }
        }
    );

    context.subscriptions.push(copyFolderDisposable);
    context.subscriptions.push(copyFileDisposable);
    context.subscriptions.push(copyMultipleFilesDisposable);
}

async function readFolderContent(folderPath: string, baseFolderPath: string): Promise<string> {
    const excludePatterns = vscode.workspace.getConfiguration('gptCopyHelper').get('excludeFiles', []);
    let content = "";
    const files = await fs.promises.readdir(folderPath);

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = await fs.promises.stat(filePath);

        if (excludePatterns.some((pattern: string) => filePath.includes(pattern))) {
            continue;
        }

        if (stat.isDirectory()) {
            content += await readFolderContent(filePath, baseFolderPath);
        } else {
            const fileContent = await fs.promises.readFile(filePath, "utf-8");
            const relativePath = path.relative(baseFolderPath, filePath);
            content += `${relativePath}\n${minimizeContent(fileContent, filePath)}\n\n`;
        }
    }

    return content;
}

function minimizeContent(content: string, filePath: string): string {
    const excludeExtensions = vscode.workspace.getConfiguration('gptCopyHelper').get('excludeMinimizeExtensions', []);
    const minimizeAllFiles = vscode.workspace.getConfiguration('gptCopyHelper').get('minimizeAllFiles', true);
    
    if (!minimizeAllFiles || excludeExtensions.some((ext: string) => filePath.endsWith(ext))) {
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

export function deactivate() { }
