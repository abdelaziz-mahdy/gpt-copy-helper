# GPT Copy Helper

GPT Copy Helper is a Visual Studio Code extension that allows you to copy the content of a selected file or each subfolder and file within a selected folder to the clipboard, with minimized content size. This helps reduce the amount of text and tokens needed, making it easier to manage large amounts of text data.

## Features

- Right-click on a file in the Explorer to copy its content.
- Right-click on a folder in the Explorer to copy the content of all files and subfolders.
- Right-click and select multiple files in the Explorer to copy their content.
- Minimize content size by removing unnecessary whitespace.
- Supports all file extensions.
- Context menu items are grouped under a labeled section with a `gptch:` prefix to indicate they come from the GPT Copy Helper extension.
- Configurable settings to exclude specific files from being copied.
- Configurable settings to exclude specific file extensions from being minimized.
- Option to disable minimizing for all files.

## How to Use

1. Install the extension from the VSCode marketplace.
2. Right-click on any file or folder in the Explorer pane.
3. Select "gptch: Copy File Content" for files, "gptch: Copy All Files Content" for folders, or "gptch: Copy Multiple Files Content" for multiple files from the context menu.
4. The content of the file or each subfolder and file will be copied to the clipboard.

## Settings

- `gptCopyHelper.excludeFiles`: List of file patterns to exclude from being copied (default: [".lock"]).
- `gptCopyHelper.excludeMinimizeExtensions`: List of file extensions to exclude from being minimized (default: [".py"]).
- `gptCopyHelper.minimizeAllFiles`: Option to enable or disable minimizing for all files (default: true).

## Development

### Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Open the project in VSCode.

### Build

Run `npm run compile` to compile the TypeScript files.

### Run

Press `F5` to open a new VSCode window with the extension loaded. Use the command palette (`Ctrl+Shift+P`) to run the commands or right-click on a file or folder and select the appropriate command.

## License

MIT
