import * as vscode from "vscode";
import { TreeSitterNode } from "../tree-sitter/treeSitter";

export interface CodeContext {
  editor: vscode.TextEditor;
  setCurrentNode(node: TreeSitterNode | null): void;
}

export const toVscodeRange = (
  a: TreeSitterNode["startPosition"],
  b: TreeSitterNode["endPosition"],
): vscode.Range => {
  return new vscode.Range(
    new vscode.Position(a.row, a.column),
    new vscode.Position(b.row, b.column),
  );
};

export function getRangesWithoutInitialWhitespace(
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
      range.end.line === range.start.line
        ? range.end.character
        : firstLine.range.end.character,
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
