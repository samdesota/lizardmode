import * as vscode from "vscode";
import { CodeLizardContext } from "./CodeLizardContext";
import { debug } from "./debug";
import { createLizardModeState } from "./lizardMode";
import { initializeParser, TreeSitter } from "./treeSitter";
import { bindings } from "./scripts/keys";
import { applyEditsAndParseDocument, parseDocument } from "./parseDocument";
import { focusedDecoratorType } from "./vscodeBridge";
import { goToNodeAtCursor } from "./commands/navigation";

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
      cancelEmitter.fire();
    }),
  );

  let cancelEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter();

  class CancelToken {
    public message: string = "cancelled";
  }

  async function startLizardMode(editor: vscode.TextEditor) {
    console.log("starting lizard mode");
    const lang = editor.document.languageId;
    const { parser, language } = await initializeParser(
      lang === "typescript" ? "typescript" : "tsx",
    );
    const tree = parseDocument(parser, editor.document);

    if (tree) {
      let cancelled = false;

      const subscriptions: vscode.Disposable[] = [];

      if (cancelEmitter) {
        console.log("canceling previous izard mode");
        cancelEmitter.fire();
      }

      cancelEmitter = new vscode.EventEmitter();

      function cleanup() {
        subscriptions.forEach((sub) => sub.dispose());
      }

      cancelEmitter.event(() => {
        console.log("cancel lizard mode fired");
        cancelled = true;
        cleanup();
      });

      vscode.commands.executeCommand("setContext", "lizardmode.capture", true);
      subscriptions.push(
        new vscode.Disposable(() => {
          vscode.commands.executeCommand(
            "setContext",
            "lizardmode.capture",
            false,
          );

          editor.setDecorations(focusedDecoratorType, []);
        }),
      );

      try {
        const lizardContext = new CodeLizardContext(
          TreeSitter,
          tree,
          language,
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
          cancelEmitter,
        );

        subscriptions.push(
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

        // Enter vim normal mode before starting lizard mode
        vscode.commands.executeCommand("extension.vim_escape");
        await goToNodeAtCursor(lizardContext);
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
