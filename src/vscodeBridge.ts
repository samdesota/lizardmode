import * as vscode from "vscode";
import { EditorEffect } from "./stateContexts";
import { debug } from "console";
import { TreeSitterNode } from "./treeSitter";

export interface CodeContext {
  editor: vscode.TextEditor;
  setCurrentNode(node: TreeSitterNode | null): void;
}

const decoratorType = vscode.window.createTextEditorDecorationType({
  after: {},
});

const focusedDecoratorType = vscode.window.createTextEditorDecorationType({
  borderRadius: "3px",

  dark: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },

  light: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
});

export const toVscodeRange = (
  a: TreeSitterNode["startPosition"],
  b: TreeSitterNode["endPosition"],
): vscode.Range => {
  return new vscode.Range(
    new vscode.Position(a.row, a.column),
    new vscode.Position(b.row, b.column),
  );
};

export const applyEffect = (codeContext: CodeContext, effect: EditorEffect) => {
  debug(__filename, "applying effect", effect);

  if (effect.type === "showHints") {
    codeContext.editor.setDecorations(
      decoratorType,
      effect.locations.map((location) => {
        return {
          range: toVscodeRange(
            location.node.startPosition,
            location.node.endPosition,
          ),
          renderOptions: {
            before: {
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
    const range = toVscodeRange(
      effect.node.startPosition,
      effect.node.endPosition,
    );

    codeContext.editor.revealRange(range);
    codeContext.editor.selection = new vscode.Selection(
      range.start,
      range.start,
    );
    codeContext.editor.setDecorations(
      focusedDecoratorType,
      getRangesWithoutInitialWhitespace(codeContext.editor.document, range),
    );
    codeContext.setCurrentNode(effect.node);

    return;
  }
};
function getRangesWithoutInitialWhitespace(
  document: vscode.TextDocument,
  range: vscode.Range,
): vscode.Range[] {
  const firstLine = document.lineAt(range.start.line);

  const ranges: vscode.Range[] = [
    // Add the first line
    new vscode.Range(
      range.start.line,
      range.start.character,
      range.start.line,
      firstLine.range.end.character,
    ),
  ];

  for (let i = range.start.line + 1; i < range.end.line; i++) {
    const line = document.lineAt(i);
    const start = Math.min(
      line.firstNonWhitespaceCharacterIndex,
      range.start.character,
    );
    const end = line.range.end.character;
    ranges.push(new vscode.Range(i, start, i, end));
  }

  const lastLine = document.lineAt(range.end.line);

  if (range.start.line !== range.end.line) {
    const start = Math.min(
      lastLine.firstNonWhitespaceCharacterIndex,
      range.start.character,
    );
    ranges.push(
      new vscode.Range(
        range.end.line,
        start,
        range.end.line,
        range.end.character,
      ),
    );
  }

  return ranges;
}
