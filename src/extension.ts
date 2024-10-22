import * as vscode from "vscode";
import { CodeLizardContext } from "./CodeLizardContext";
import { debug } from "./debug";
import { createLizardModeState } from "./lizardMode";
import { initializeParser, TreeSitter } from "./treeSitter";
import { bindings } from "./scripts/keys";
import { applyEditsAndParseDocument, parseDocument } from "./parseDocument";
import { focusedDecoratorType } from "./vscodeBridge";
import { Lifecycle } from "./lifecycle";

export function activate(context: vscode.ExtensionContext) {
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

        if (lizardLifecycle) {
          lizardLifecycle.cancel();
        }
      }),
    );

    let lizardLifecycle: Lifecycle | null = null;

    class CancelToken {
      public message: string = "cancelled";
    }

    async function startLizardMode(editor: vscode.TextEditor) {
      console.log("starting lizard mode");
      const tree = parseDocument(parser, editor.document);

      if (tree) {
        const lifecycle = new Lifecycle();

        let cancelled = false;

        if (lizardLifecycle) {
          console.log("cancelling lizard mode");
          lizardLifecycle.cancel();
        }

        lizardLifecycle = lifecycle;

        const statusBarItem = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Left,
          0,
        );
        statusBarItem.text = "Lizard Mode";
        statusBarItem.tooltip = "Lizard Mode is active";
        statusBarItem.command = "extension.toggleLizardMode"; // Example command
        statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        statusBarItem.show();

        vscode.commands.executeCommand(
          "setContext",
          "lizardmode.capture",
          true,
        );
        lifecycle.addDisposable(
          new vscode.Disposable(() => {
            vscode.commands.executeCommand(
              "setContext",
              "lizardmode.capture",
              false,
            );
            editor.setDecorations(focusedDecoratorType, []);
            statusBarItem.dispose();
          }),
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

                const cancelSubscription = lifecycle.onCancel(() => {
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
            lifecycle,
          );

          lifecycle.addDisposable(
            vscode.workspace.onDidChangeTextDocument((event) => {
              console.log("content changes", event.contentChanges);
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
          lifecycle.cancel();
        }
      }
    }

    addDisposable(
      vscode.commands.registerCommand("lizardmode.enter", () => {
        if (
          vscode.window.activeTextEditor &&
          supportedLanguages.includes(
            vscode.window.activeTextEditor.document.languageId,
          )
        ) {
          startLizardMode(vscode.window.activeTextEditor);
        }
      }),
    );
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
