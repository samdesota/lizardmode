import { LizardContext } from "./stateContexts";
import { TreeSitterNode, TreeSitterTree } from "./treeSitter";

export function findNodeByPosition(
  tree: TreeSitterTree,
  startIndex: number,
  endIndex: number,
): TreeSitterNode | null {
  let currentNode = tree.rootNode;

  console.log("findNodeByPosition", startIndex, endIndex);

  while (true) {
    const child = currentNode.namedChildren.find((child) => {
      return child.startIndex <= startIndex && child.endIndex >= endIndex;
    });

    if (!child) {
      return null;
    }

    if (child.startIndex === startIndex && child.endIndex === endIndex) {
      console.log("findNodeByPosition: child found", child.startIndex);
      return child;
    }

    currentNode = child;
  }
}

export class CursorNodeManager {
  private cursorNode: TreeSitterNode | null = null;
  cursorTree: TreeSitterTree | null = null;
  cursorStart: number | null = null;
  cursorEnd: number | null = null;

  constructor(private context: LizardContext) {}

  setCurrentNode(node: TreeSitterNode | null) {
    this.cursorNode = node;
    this.cursorTree = this.context.tree;
    this.cursorStart = node?.startIndex ?? null;
    this.cursorEnd = node?.endIndex ?? null;
  }

  handleEdits(
    edits: {
      start: number;
      end: number;
      delta: number;
    }[],
  ) {
    if (!this.cursorNode || !this.cursorStart || !this.cursorEnd) {
      return;
    }
    let startDelta = 0;
    let endDelta = 0;
    for (const edit of edits) {
      console.log(
        "handleEdits",
        edit.start,
        edit.end,
        edit.delta,
        this.cursorStart,
        this.cursorEnd,
      );

      // if edit is outside of the node
      if (edit.end < this.cursorStart || edit.start > this.cursorEnd) {
        if (edit.start < this.cursorStart) {
          startDelta += edit.delta - (edit.end - edit.start);
          endDelta += edit.delta - (edit.end - edit.start);
        }
        // if edit is after the node, do nothing
        continue;
      } else if (edit.start >= this.cursorStart && edit.end <= this.cursorEnd) {
        // if edit is inside the node, update the end position
        endDelta += edit.delta - (edit.end - edit.start);
        continue;
      } else {
        // if edit is partially inside the node, invalidate the node
        console.log("invalidate node");
        this.setCurrentNode(null);
        break;
      }
    }

    this.cursorStart += startDelta;
    this.cursorEnd += endDelta;
  }

  getCurrentNode() {
    if (this.context.tree !== this.cursorTree) {
      const newTreeNode = findNodeByPosition(
        this.context.tree,
        this.cursorStart!,
        this.cursorEnd!,
      );

      this.setCurrentNode(newTreeNode);

      return newTreeNode;
    }

    return this.cursorNode;
  }
}
