import * as vscode from "vscode";

export const hintDecoratorType = vscode.window.createTextEditorDecorationType({
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  after: {
    backgroundColor: "white",
    color: "black",
    margin: `0 0 0 -1.2em`,
  },
});

export const focusedDecoratorType =
  vscode.window.createTextEditorDecorationType({
    borderRadius: "3px",

    dark: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },

    light: {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
    },
  });
