import * as vscode from "vscode";
import { CodeLizardContext } from "./vscode/CodeLizardContext";
import { debug } from "./utils/debug";
import { createLizardModeState } from "./commands/lizardMode";
import { initializeParser, TreeSitter } from "./tree-sitter/treeSitter";
import { bindings } from "./scripts/keys";
import {
  applyEditsAndParseDocument,
  parseDocument,
} from "./tree-sitter/parseDocument";
import { focusedDecoratorType } from "./vscode/decoratorTypes";
import { Lifecycle } from "./utils/lifecycle";
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
    const { parser, language } = await initializeParser(
      editor.document.languageId.endsWith("react") ? "tsx" : "typescript",
    );
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

      vscode.commands.executeCommand("setContext", "lizardmode.capture", true);
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
          language,
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

        // Enter normal mode before starting lizard mode
        await vscode.commands.executeCommand("extension.vim_escape");
        await goToNodeAtCursor(lizardContext);
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
