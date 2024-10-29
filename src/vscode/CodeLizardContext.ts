import * as vscode from "vscode";
import { LizardContext } from "../types/lizardContext";
import {
  TreeSitter,
  TreeSitterLanguage,
  TreeSitterNode,
  TreeSitterPoint,
  TreeSitterTree,
} from "../tree-sitter/treeSitter";
import { getRangesWithoutInitialWhitespace, toVscodeRange } from "./ranges";
import { CursorNodeManager } from "./CursorNodeManager";
import { Lifecycle } from "../utils/lifecycle";
import { hintDecoratorType, focusedDecoratorType } from "./decoratorTypes";

export class CodeLizardContext implements LizardContext {
  private cursorNodeManager = new CursorNodeManager(this);
  private onEdit = new vscode.EventEmitter<{
    newTree: TreeSitterTree;
    edits: {
      start: number;
      end: number;
      text: string;
    }[];
  }>();

  constructor(
    public treeSitter: typeof TreeSitter,
    public tree: TreeSitterTree,
    public language: TreeSitterLanguage,
    public readInput: () => Promise<string>,
    private editor: vscode.TextEditor,
    private lifecycle: Lifecycle,
  ) {}

  exitLizardMode(mode?: "insert" | "normal"): void {
    this.lifecycle.cancel();

    if (mode === "insert") {
      // trigger vim mode insert
      vscode.commands.executeCommand("extension.vim_insert");
    } else if (mode === "normal") {
      // trigger vim mode normal
      vscode.commands.executeCommand("extension.vim_escape");
    }
  }

  getIndentation() {
    const tabSize = this.editor.options.tabSize;

    if (typeof tabSize === "number") {
      return " ".repeat(tabSize);
    }

    return tabSize ?? "  ";
  }

  getLine(n: number): string {
    return this.editor.document.lineAt(n).text;
  }

  getCursor(): TreeSitterPoint | null {
    const cursor = this.editor.selection.active;

    return cursor
      ? {
          row: cursor.line,
          column: cursor.character,
        }
      : null;
  }

  getCurrentNode(): TreeSitterNode | null {
    return this.cursorNodeManager.getCurrentNode();
  }

  isRangeVisible(a: TreeSitterPoint, b: TreeSitterPoint): boolean {
    return this.editor.visibleRanges.some((visibleRange) => {
      return visibleRange.intersection(
        new vscode.Range(
          new vscode.Position(a.row, a.column),
          new vscode.Position(b.row, b.column),
        ),
      );
    });
  }

  jumpTo(node: TreeSitterNode): void {
    this.cursorNodeManager.setCurrentNode(node);
    const range = toVscodeRange(node.startPosition, node.endPosition);

    this.editor.revealRange(range);
    this.editor.selection = new vscode.Selection(range.start, range.start);
    this.editor.setDecorations(
      focusedDecoratorType,
      getRangesWithoutInitialWhitespace(this.editor.document, range),
    );
  }

  showHints(hints: { node: TreeSitterNode; hint: string }[]): void {
    this.editor.setDecorations(
      hintDecoratorType,
      hints.map((location) => {
        return {
          range: toVscodeRange(location.node.startPosition, {
            row: location.node.startPosition.row,
            column: location.node.startPosition.column + 2,
          }),
          renderOptions: {
            after: {
              contentText: ` ${location.hint} `,
            },
          },
        };
      }),
    );
  }

  handleEdits(
    newTree: TreeSitterTree,
    edits: {
      start: number;
      end: number;
      text: string;
    }[],
  ): void {
    this.tree = newTree;

    this.cursorNodeManager.handleEdits(edits);

    this.onEdit.fire({
      newTree,
      edits,
    });
  }

  async insertSnippet(
    start: TreeSitterPoint,
    end: TreeSitterPoint,
    snippet: string,
  ): Promise<void> {
    const newCursorStartOffsetStart = snippet.match(/^[\s]+/)?.[0].length ?? 0;
    const newCursorStartOffsetEnd = snippet.match(/[\s]+$/)?.[0].length ?? 0;

    await this.edit([
      {
        start,
        end,
        text: snippet,
      },
    ]);

    const startOffset = this.editor.document.offsetAt(
      new vscode.Position(start.row, start.column),
    );
    this.cursorNodeManager.cursorStart =
      startOffset + newCursorStartOffsetStart;
    this.cursorNodeManager.cursorEnd =
      startOffset + snippet.length - newCursorStartOffsetEnd;

    const currentNode = this.cursorNodeManager.getCurrentNode();

    if (currentNode) {
      this.jumpTo(currentNode);
    }
  }

  async edit(
    edits: {
      start: TreeSitterPoint;
      end: TreeSitterPoint;
      removeWhenEmpty?: boolean;
      text: string;
    }[],
  ): Promise<void> {
    const editPromise = new Promise<void>((resolve) => {
      this.onEdit.event(() => {
        resolve();
      });
    });

    await this.editor.edit((editBuilder) => {
      for (const edit of edits) {
        if (edit.removeWhenEmpty && edit.text === "") {
          const lastLine = this.editor.document.lineAt(edit.end.row);
          const lastLineRemaining = lastLine.text.slice(edit.end.column);

          const firstLine = this.editor.document.lineAt(edit.start.row);
          const firstLineRemaining = firstLine.text.slice(0, edit.start.column);

          const range = toVscodeRange(
            firstLineRemaining.trim() === ""
              ? {
                  row: edit.start.row,
                  column: 0,
                }
              : edit.start,
            lastLineRemaining.trim() === ""
              ? {
                  row: edit.end.row + 1,
                  column: 0,
                }
              : edit.end,
          );

          editBuilder.delete(range);
        } else {
          const range = toVscodeRange(edit.start, edit.end);
          editBuilder.replace(range, edit.text);
        }
      }
    });

    await vscode.commands.executeCommand("editor.action.formatDocument");

    await editPromise;
  }
}
