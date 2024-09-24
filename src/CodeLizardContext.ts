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

export class CodeLizardContext implements LizardContext {
  private currentNode: TreeSitterNode | null = null;

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
    return this.currentNode;
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
    this.currentNode = node;
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
  }

  replaceText(
    start: TreeSitterPoint,
    end: TreeSitterPoint,
    text: string,
  ): void {
    const range = toVscodeRange(start, end);
    this.editor.edit((editBuilder) => {
      editBuilder.replace(range, text);
    });
  }
}
