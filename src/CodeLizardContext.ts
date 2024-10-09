import * as vscode from "vscode";
import { LizardContext } from "./stateContexts";
import {
  TreeSitter,
  TreeSitterLanguage,
  TreeSitterNode,
  TreeSitterPoint,
  TreeSitterTree,
} from "./treeSitter";
import {
  decoratorType,
  focusedDecoratorType,
  getRangesWithoutInitialWhitespace,
  toVscodeRange,
} from "./vscodeBridge";
import { CursorNodeManager } from "./CursorNodeManager";

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
  ) {}

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
      decoratorType,
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

  async edit(
    edits: {
      start: TreeSitterPoint;
      end: TreeSitterPoint;
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
        const range = toVscodeRange(edit.start, edit.end);
        editBuilder.replace(range, edit.text);
      }
    });

    await editPromise;
  }
}
