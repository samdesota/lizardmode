import * as vscode from "vscode";
import { TreeSitterParser, TreeSitterTree } from "./treeSitter";

function byteLength(str: string): number {
  return Buffer.byteLength(str, "utf-16le");
}

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

export function parseDocument(
  parser: TreeSitterParser,
  document: vscode.TextDocument,
): TreeSitterTree {
  return parser.parse(getChunkFromIndex.bind(null, document));
}

export function applyEditsAndParseDocument(
  parser: TreeSitterParser,
  document: vscode.TextDocument,
  edits: readonly vscode.TextDocumentContentChangeEvent[],
  tree: TreeSitterTree,
): TreeSitterTree {
  edits.forEach((change) => {
    const oldStartPos = change.range.start;
    const oldEndPos = change.range.end;
    const newText = change.text;

    // Calculate the byte offsets
    const startIndex = document.offsetAt(oldStartPos);
    const oldEndIndex = document.offsetAt(oldEndPos);
    const newEndIndex = startIndex + byteLength(newText);
    const insertedLines = newText.split(/\r?\n/);
    const lastLine = insertedLines.at(-1) || "";

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
        row: oldStartPos.line + (insertedLines.length - 1),
        column:
          insertedLines.length === 1
            ? oldStartPos.character + byteLength(lastLine)
            : byteLength(lastLine),
      },
    });
  });

  return parser.parse(getChunkFromIndex.bind(null, document), tree);
}
