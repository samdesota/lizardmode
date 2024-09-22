import { ConfigurationTarget } from "vscode";
import { LizardContext, LizardTransaction } from "../stateContexts";
import { TreeSitterNode } from "../treeSitter";
import { toVscodeRange } from "../vscodeBridge";
import { debug } from "../debug";

type Direction = 1 | -1;

function nextLevel(
  direction: Direction,
  node: TreeSitterNode,
): TreeSitterNode | null {
  if (direction === 1) {
    return node.firstChild;
  } else {
    return node.parent;
  }
}

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

export function moveVertical(
  ctx: LizardContext,
  by: number,
): LizardTransaction {
  const currentNode = ctx.getCurrentNode();
  const direction: Direction = by > 0 ? 1 : -1;

  if (!currentNode) {
    return {
      preventEditorAction: true,
      done: false,
    };
  }

  const seekFromLine = currentNode.endPosition.row;
  let cursor = currentNode;
  let siblingFound = false;

  console.log("moveVertical", seekFromLine, cursor);

  do {
    while (cursor.endPosition.row <= seekFromLine) {
      console.log("parent", cursor);
      const parent = cursor.parent;

      if (!parent) {
        siblingFound = false;
        break;
      }

      cursor = parent;
    }

    while (cursor.startPosition.row <= seekFromLine) {
      const sibling = nextSibling(direction, cursor);
      console.log("sibling", sibling);

      if (!sibling) {
        siblingFound = false;
        continue; // move to parent
      }

      cursor = sibling;
    }

    siblingFound = true;
  } while (!siblingFound);

  if (siblingFound) {
    console.log("found");
    return {
      effects: [
        {
          type: "jumpTo",
          node: cursor,
        },
      ],
      preventEditorAction: true,
      done: false,
    };
  }

  console.log("not found");
  return {
    preventEditorAction: true,
    done: false,
  };
}
