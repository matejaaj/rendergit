# rendergit

This is a personal fork of [Andrej Karpathy's rendergit](https://github.com/karpathy/rendergit), with additions for working with local projects and copying selected files into LLM chats.

## Why this fork?

Before AI coding agents became part of my workflow, I used rendergit every day to prepare code for LLM chat interfaces. I wanted to make it easier to choose the context to paste into a conversation, especially when working on local projects. These additions grew out of that workflow.

## What's added

- **Local directory support:** run `rendergit .` or pass a local project path to render the files on disk, including uncommitted changes, without cloning from GitHub.
- **CLI exclusions:** use the repeatable `--exclude` option to skip directory names, relative paths, or glob patterns. Common dependency and build directories such as `node_modules`, `.venv`, and `dist` are skipped by default, and excluded directories are pruned during scanning.
- **[VS Code extension](rendergit-vscode-extension/):** select files or folders in the Explorer, right-click, and choose **Copy content for LLM** to copy their contents as CXML directly to the clipboard. It also supports an optional tree of the selection and converts Jupyter notebooks into readable cell-based text, leaving out notebook outputs.

## CLI

Requires [uv](https://docs.astral.sh/uv/) and Git.

```bash
uv tool install git+https://github.com/matejaaj/rendergit
rendergit .                             # local project
rendergit https://github.com/karpathy/nanoGPT
rendergit . --exclude 'src/generated/**' # optional exclusions
```

Opens a single HTML page in your browser: **Human View** for browsing, **LLM View** for copying code into a chat. Run `rendergit --help` for more options.

## VS Code extension

Requires VS Code, Git, and Node.js 22+ (with npm).

```bash
git clone https://github.com/matejaaj/rendergit
cd rendergit/rendergit-vscode-extension
npm ci
npx vsce package --no-dependencies
```

In VS Code, open the Command Palette → **Extensions: Install from VSIX…** → select the generated `.vsix` file in `rendergit-vscode-extension`.

Select files or folders in the Explorer → right-click → **Copy content for LLM** → paste into your chat.

![VS Code Explorer context menu showing Copy content for LLM](docs/images/vscode-copy-for-llm.png)

## Contributing

For issues or suggestions about the additions in this fork, use [this repository's issue tracker](https://github.com/matejaaj/rendergit/issues). For the original project and its contribution policy, see [upstream rendergit](https://github.com/karpathy/rendergit#contributing).

## License

BSD0 go nuts
