import { LizardContext, LizardTransaction } from "../stateContexts";
import { TreeSitterNode } from "../treeSitter";

type Direction = 1 | -1;

function nextSibling(
  direction: 1 | -1,
  node: TreeSitterNode,
): TreeSitterNode | null {
  if (direction === 1) {
    return node.nextNamedSibling;
  } else {
    return node.previousNamedSibling;
  }
}

function startsAfter(
  direction: Direction,
  a: TreeSitterNode,
  b: TreeSitterNode,
): boolean {
  if (direction === 1) {
    return b.startPosition.row > a.endPosition.row;
  } else {
    return b.endPosition.row < a.startPosition.row;
  }
}

export function findNextNodeVertically(
  direction: Direction,
  node: TreeSitterNode,
): TreeSitterNode | null {
  let cursor = node;

  while (true) {
    const sibling = nextSibling(direction, cursor);

    if (!sibling) {
      const parent = cursor.parent;

      if (!parent) {
        return null;
      }

      return findNextNodeVertically(direction, parent);
    }

    if (startsAfter(direction, node, sibling)) {
      return sibling;
    }
  }
}

export function moveVertical(ctx: LizardContext, by: number) {
  const currentNode = ctx.getCurrentNode();
  const direction: Direction = by > 0 ? 1 : -1;

  if (!currentNode) {
    return {
      preventEditorAction: true,
      done: false,
    };
  }

  const nextNode = findNextNodeVertically(direction, currentNode);

  if (nextNode) {
    ctx.jumpTo(nextNode);
  }
}
