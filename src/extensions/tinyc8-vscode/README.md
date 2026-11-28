# TinyC8 Language Support for VS Code

This extension adds syntax highlighting and basic editor bracket/comment support
for TinyC8 `.tc8` files. It does not provide compilation, diagnostics, or
language-server features.

## Install locally

From this directory, package the extension with `vsce` and install the generated
VSIX in VS Code:

```sh
npx @vscode/vsce package
code --install-extension tinyc8-language-0.1.0.vsix
```

Once installed, `.tc8` files are recognized as TinyC8 automatically.
