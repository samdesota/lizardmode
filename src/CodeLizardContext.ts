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

  constructor(
    public treeSitter: typeof TreeSitter,
    public trees: Map<string, TreeSitterTree>,
    public language: TreeSitterLanguage,
    public readInput: () => Promise<string>,
    private editor: vscode.TextEditor,
  ) {}

  get tree() {
    return this.trees.get(this.editor.document.uri.toString())!;
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

  edit(
    edits: {
      start: TreeSitterPoint;
      end: TreeSitterPoint;
      text: string;
    }[],
  ): void {
    this.cursorNodeManager.handleEdits(
      edits.map((edit) => {
        return {
          start: this.editor.document.offsetAt(
            new vscode.Position(edit.start.row, edit.start.column),
          ),
          end: this.editor.document.offsetAt(
            new vscode.Position(edit.end.row, edit.end.column),
          ),
          delta: edit.text.length,
        };
      }),
    );
    this.editor.edit((editBuilder) => {
      for (const edit of edits) {
        const range = toVscodeRange(edit.start, edit.end);
        editBuilder.replace(range, edit.text);
      }
    });
  }
}
