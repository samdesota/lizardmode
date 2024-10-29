import { LizardContext } from "../types/lizardContext";
import { TreeSitterNode } from "../tree-sitter/treeSitter";
import {
  findIndentationAtNode,
  getIndentedNode,
  wrapOptions,
} from "./wrapNode";

const findBlockNode = (currentNode: TreeSitterNode): TreeSitterNode | null => {
  if (currentNode.type === "statement_block") {
    return currentNode;
  }

  for (const child of currentNode.children) {
    const blockNode = findBlockNode(child);

    if (blockNode) {
      return blockNode;
    }
  }

  return null;
};

export async function createNode(
  ctx: LizardContext,
  options: { position: "before" | "after" },
) {
  const key = (await ctx.readInput()) as keyof typeof wrapOptions;
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  // insert inside current node
  if (key === "i") {
    const key = (await ctx.readInput()) as keyof typeof wrapOptions;
    const blockNode = findBlockNode(currentNode);

    const wrap = wrapOptions[key];

    if (!wrap || !blockNode) {
      return;
    }

    const indentedCode = getIndentedNode(
      ctx,
      wrap,
      currentNode.startPosition,
      "",
    );

    return ctx.insertSnippet(
      {
        row: blockNode.startPosition.row,
        column: blockNode.startPosition.column + 1,
      },
      {
        row: blockNode.startPosition.row,
        column: blockNode.startPosition.column + 1,
      },
      `\n${indentedCode}`,
    );
  }

  const wrap = wrapOptions[key];

  if (!wrap) {
    return;
  }

  const indentation = findIndentationAtNode(ctx, currentNode);
  const node = wrap.before + wrap.after;

  if (options.position === "before") {
    return ctx.insertSnippet(
      currentNode.startPosition,
      currentNode.startPosition,
      node + "\n" + indentation,
    );
  } else {
    return ctx.insertSnippet(
      currentNode.endPosition,
      currentNode.endPosition,
      "\n" + indentation + node,
    );
  }
}
