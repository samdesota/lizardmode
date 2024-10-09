// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as TreeSitterWasm from "@vscode/tree-sitter-wasm";
import * as vscode from "vscode";
import { CodeLizardContext } from "./CodeLizardContext";
import { debug } from "./debug";
import { createLizardModeState } from "./lizardMode";
import { initializeParser, TreeSitter } from "./treeSitter";
import { bindings } from "./scripts/keys";
import { applyEditsAndParseDocument, parseDocument } from "./parseDocument";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  debug(__filename, "initializing lizard mode extension");

  let extensionDisposed = false;

  context.subscriptions.push({
    dispose() {
      extensionDisposed = true;
    },
  });

  const addDisposable = (disposable: vscode.Disposable) => {
    if (extensionDisposed) {
      disposable.dispose();
    } else {
      context.subscriptions.push(disposable);
    }
  };

  initializeParser().then(async ({ parser, language: jsLanguage }) => {
    debug(__filename, "initialized parser");

    const supportedLanguages = [
      "typescript",
      "javascript",
      "typescriptreact",
      "javascriptreact",
    ];

    function getChunkFromIndex(
      document: vscode.TextDocument,
      offset: number,
    ): string {
      const position = document.positionAt(offset);
      const line = document.lineAt(position.line);

      if (position.character === line.text.length) {
        // if at end of document
        if (position.line === document.lineCount - 1) {
          return "";
        }

        const nextLine = document.lineAt(position.line + 1);

        return "\n" + nextLine.text;
      }

      return line.text.slice(position.character);
    }

    let handleType:
      | null
      | ((args: { text: string }) => void | { preventDefault: boolean }) = null;

    addDisposable(
      vscode.Disposable.from(
        ...bindings.map((binding) =>
          vscode.commands.registerCommand(binding.command, () => {
            if (handleType) {
              handleType({ text: binding.typedKey });
            }
          }),
        ),
      ),
    );

    addDisposable(
      vscode.commands.registerCommand("lizardmode.leave", () => {
        console.log("leaving lizard mode");
        cancelEmitter.fire();
      }),
    );

    let cancelEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter();

    class CancelToken {
      public message: string = "cancelled";
    }

    async function startLizardMode(editor: vscode.TextEditor) {
      console.log("starting lizard mode");
      const tree = parseDocument(parser, editor.document);

      if (tree) {
        let cancelled = false;

        const subscriptions: vscode.Disposable[] = [];

        if (cancelEmitter) {
          console.log("cancelling lizard mode");
          cancelEmitter.fire();
        }

        cancelEmitter = new vscode.EventEmitter();

        function cleanup() {
          subscriptions.forEach((sub) => sub.dispose());
        }

        cancelEmitter.event(() => {
          cancelled = true;
          cleanup();
        });

        vscode.commands.executeCommand(
          "setContext",
          "lizardmode.capture",
          true,
        );
        try {
          const lizardContext = new CodeLizardContext(
            TreeSitter,
            tree,
            jsLanguage,
            async () => {
              return new Promise<string>((resolve, reject) => {
                if (cancelled) {
                  reject(new CancelToken());
                  return;
                }

                const cancelSubscription = cancelEmitter.event(() => {
                  cancelSubscription.dispose();
                  console.log("cancelled lizard mode");
                  reject(new CancelToken());
                });

                handleType = (args) => {
                  cancelSubscription.dispose();
                  resolve(args.text);
                  handleType = null;

                  return { preventDefault: true };
                };
              });
            },
            editor,
          );

          subscriptions.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
              if (event.document === editor.document) {
                const newTree = applyEditsAndParseDocument(
                  parser,
                  editor.document,
                  event.contentChanges,
                  lizardContext.tree,
                );

                lizardContext.handleEdits(
                  newTree,
                  event.contentChanges.map((change) => ({
                    start: change.rangeOffset,
                    end: change.rangeOffset + change.rangeLength,
                    text: change.text,
                  })),
                );
              }
            }),
          );

          await createLizardModeState(lizardContext);
        } catch (e) {
          if (e instanceof CancelToken) {
            console.log("cancelled lizard mode");
          } else {
            console.error(e);
          }
        } finally {
          if (!cancelled) {
            cleanup();
          }
        }
      }
    }

    addDisposable(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          startLizardMode(editor);
        } else {
          console.log("No active editor");
        }
      }),
    );

    addDisposable(
      vscode.commands.registerCommand("lizardmode.enter", () => {
        if (vscode.window.activeTextEditor) {
          startLizardMode(vscode.window.activeTextEditor);
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      startLizardMode(vscode.window.activeTextEditor);
    }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
