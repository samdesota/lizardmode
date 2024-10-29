import { LizardContext } from "../stateContexts";
import { TreeSitterNode } from "../tree-sitter/treeSitter";

export type Direction = 1 | -1;

export function nextSibling(
  direction: 1 | -1,
  node: TreeSitterNode,
): TreeSitterNode | null {
  if (direction === 1) {
    return node.nextNamedSibling;
  } else {
    return node.previousNamedSibling;
  }
}

export function findNextNodeVertically(
  direction: Direction,
  node: TreeSitterNode,
): TreeSitterNode | null {
  let cursor = node;

  const sibling = nextSibling(direction, cursor);

  if (!sibling) {
    const parent = cursor.parent;

    if (!parent) {
      return null;
    }

    return findNextNodeVertically(direction, parent);
  }

  return sibling;
}

export async function moveVertical(ctx: LizardContext, by: number) {
  const currentNode = ctx.getCurrentNode();
  const direction: Direction = by > 0 ? 1 : -1;

  if (!currentNode) {
    return;
  }

  const nextNode = findNextNodeVertically(direction, currentNode);

  if (nextNode) {
    ctx.jumpTo(nextNode);
  }
}

export async function goToNodeAtCursor(ctx: LizardContext) {
  const cursorPosition = ctx.getCursor();

  if (!cursorPosition) {
    return;
  }

  const node = ctx.tree.rootNode.namedDescendantForPosition(cursorPosition);

  if (node) {
    ctx.jumpTo(node);
  }
}
