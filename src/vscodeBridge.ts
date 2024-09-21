import * as vscode from "vscode";
import { EditorEffect } from "./stateContexts";
import { debug } from "console";

export interface CodeContext {
  editor: vscode.TextEditor;
}

const decoratorType = vscode.window.createTextEditorDecorationType({
  after: {},
});

export const applyEffect = (codeContext: CodeContext, effect: EditorEffect) => {
  debug(__filename, "applying effect", effect);

  if (effect.type === "showHints") {
    codeContext.editor.setDecorations(
      decoratorType,
      effect.locations.map((location) => {
        return {
          range: location.range,
          renderOptions: {
            after: {
              contentText: ` ${location.hint} `,
              border: "1px solid white",
              fontSize: "0.8rem",
              color: "white",
            },
          },
        };
      }),
    );
  } else if (effect.type === "jumpTo") {
    codeContext.editor.revealRange(effect.range);
    codeContext.editor.selection = new vscode.Selection(
      effect.range.start,
      effect.range.start,
    );

    return;
  }
};
