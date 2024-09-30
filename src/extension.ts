// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as TreeSitterWasm from "@vscode/tree-sitter-wasm";
import * as vscode from "vscode";
import { CodeLizardContext } from "./CodeLizardContext";
import { debug } from "./debug";
import { createLizardModeState } from "./lizardMode";
import { initializeParser, TreeSitter } from "./treeSitter";
import { bindings } from "./scripts/keys";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  debug(__filename, "initializing lizard mode extension");

  const parsers = new Map<string, ReturnType<TreeSitterWasm.Parser["parse"]>>();

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

  let handleType:
    | null
    | ((args: { text: string }) => void | { preventDefault: boolean }) = null;

  initializeParser().then(async ({ parser, language: jsLanguage }) => {
    debug(__filename, "initialized parser");

    const supportedLanguages = [
      "typescript",
      "javascript",
      "typescriptreact",
      "javascriptreact",
    ];

    const initializeDocumentTree = (document: vscode.TextDocument) => {
      if (!supportedLanguages.includes(document.languageId)) {
        return;
      }

      if (parsers.has(document.uri.toString())) {
        return parsers.get(document.uri.toString());
      }
      const tree = parser.parse(document.getText());
      parsers.set(document.uri.toString(), tree);
      return tree;
    };

    addDisposable(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();

        if (parsers.has(uri)) {
          const tree = parsers.get(uri);

          if (tree) {
            event.contentChanges.forEach((change) => {
              const oldStartPos = change.range.start;
              const oldEndPos = change.range.end;
              const newText = change.text;

              // Calculate the byte offsets
              const startIndex = event.document.offsetAt(oldStartPos);
              const oldEndIndex = event.document.offsetAt(oldEndPos);
              const newEndIndex =
                startIndex + Buffer.byteLength(newText, "utf-16le");

              tree.edit({
                startIndex,
                oldEndIndex,
                newEndIndex,
                startPosition: {
                  row: oldStartPos.line,
                  column: oldStartPos.character,
                },
                oldEndPosition: {
                  row: oldEndPos.line,
                  column: oldEndPos.character,
                },
                newEndPosition: {
                  row: oldStartPos.line + (newText.split(/\r?\n/).length - 1),
                  column: newText.endsWith("\n") ? 0 : newText.length, // Column at the end of the inserted text
                },
              });
            });

            const newTree = parser.parse(event.document.getText());

            parsers.set(uri, newTree);
          }
        }
      }),
    );

    addDisposable(
      vscode.workspace.onDidCloseTextDocument((document) => {
        const uri = document.uri.toString();

        if (parsers.has(uri)) {
          parsers.get(uri)?.delete();
          parsers.delete(uri);
        }
      }),
    );

    addDisposable(
      vscode.Disposable.from(
        ...bindings.map((binding) =>
          vscode.commands.registerCommand(binding.command, () => {
            if (handleType) {
              handleType({ text: binding.key });
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
      const tree = initializeDocumentTree(editor.document);
      if (tree) {
        let cancelled = false;

        if (cancelEmitter) {
          console.log("cancelling lizard mode");
          cancelEmitter.fire();
        }

        cancelEmitter = new vscode.EventEmitter();

        cancelEmitter.event(() => {
          cancelled = true;
          vscode.commands.executeCommand(
            "setContext",
            "lizardmode.capture",
            false,
          );
        });

        vscode.commands.executeCommand(
          "setContext",
          "lizardmode.capture",
          true,
        );
        try {
          const lizardContext = new CodeLizardContext(
            TreeSitter,
            parsers,
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

          await createLizardModeState(lizardContext);
        } catch (e) {
          if (e instanceof CancelToken) {
            console.log("cancelled lizard mode");
          } else {
            console.error(e);
          }
        } finally {
          if (!cancelled) {
            vscode.commands.executeCommand(
              "setContext",
              "lizardmode.capture",
              false,
            );
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
