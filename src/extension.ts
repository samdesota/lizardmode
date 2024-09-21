// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as TreeSitterWasm from "@vscode/tree-sitter-wasm";
import * as vscode from "vscode";
import { createLizardModeState } from "./lizardMode";
import { LizardContext, LizardState, LizardTransaction } from "./stateContexts";
import { initializeParser, TreeSitter } from "./treeSitter";
import { applyEffect, CodeContext } from "./vscodeBridge";
import { debug } from "./debug";

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

  addDisposable(
    vscode.commands.registerCommand("type", async (args) => {
      if (handleType) {
        const result = handleType(args);

        if (result?.preventDefault) {
          return;
        }
      }

      await vscode.commands.executeCommand("default:type", args);
    }),
  );

  initializeParser().then(async ({ parser, language: jsLanguage }) => {
    debug(__filename, "initialized parser");

    const supportedLanguages = [
      "typescript",
      "javascript",
      "typescriptreact",
      "javascriptreact",
    ];

    const initializeDocumentTree = async (document: vscode.TextDocument) => {
      if (!supportedLanguages.includes(document.languageId)) {
        return;
      }

      if (parsers.has(document.uri.toString())) {
        return;
      }

      parsers.set(document.uri.toString(), parser.parse(document.getText()));
    };

    addDisposable(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();

        if (parsers.has(uri)) {
          const parser = parsers.get(uri);

          if (parser) {
            event.contentChanges.forEach((change) => {
              const oldStartPos = change.range.start;
              const oldEndPos = change.range.end;
              const newText = change.text;

              // Calculate the byte offsets
              const startIndex = event.document.offsetAt(oldStartPos);
              const oldEndIndex = event.document.offsetAt(oldEndPos);
              const newEndIndex =
                startIndex + Buffer.byteLength(newText, "utf-16le");

              parser.edit({
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
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          initializeDocumentTree(editor.document);
        } else {
          console.log("No active editor");
        }
      }),
    );

    addDisposable(
      vscode.commands.registerCommand("lizardmode.enter", () => {
        if (stateStack.length === 0) {
          debug(__filename, "entering lizard mode");
          stateStack.push(createLizardModeState());
          return;
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      initializeDocumentTree(vscode.window.activeTextEditor.document);
    }

    const stateStack: LizardState[] = [createLizardModeState()];

    const transact = (
      ctx: LizardContext,
      codeContext: CodeContext,
      transaction: LizardTransaction,
    ) => {
      debug(__filename, "transacting", transaction);

      if (transaction.done) {
        const popped = stateStack.pop();

        if (popped?.onDispose) {
          const disposeEffects = popped.onDispose(ctx);

          disposeEffects.map((effect) => {
            applyEffect(codeContext, effect);
          });
        }
      }

      transaction.effects?.map((effect) => {
        applyEffect(codeContext, effect);
      });

      if (transaction.states) {
        stateStack.push(...transaction.states);
      }

      return {
        preventDefault: transaction.preventEditorAction,
      };
    };

    handleType = (args: { text: string }) => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const tree = parsers.get(editor.document.uri.toString());

      if (!tree) {
        return;
      }

      const lizardCtx: LizardContext = {
        language: jsLanguage,
        treeSitter: TreeSitter,
        tree,
        getCursor: () => {
          const cursor = editor.selection.active;

          return cursor ? cursor : null;
        },
        isRangeVisible: (range: vscode.Range) => {
          return editor.visibleRanges.some((visibleRange) => {
            return visibleRange.intersection(range);
          });
        },
      };

      const codeContext: CodeContext = {
        editor,
      };

      if (stateStack.length === 0) {
        return {
          preventDefault: false,
        };
      }

      return transact(
        lizardCtx,
        codeContext,
        stateStack[stateStack.length - 1].onEvent(lizardCtx, {
          type: "type",
          text: args.text,
        }),
      );
    };
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
