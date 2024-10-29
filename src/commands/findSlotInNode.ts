import { TreeSitterNode } from "../tree-sitter/treeSitter";
import tsxGrammar from "tree-sitter-typescript/tsx/src/grammar.json";

export function insertNodeInSlot(node: TreeSitterNode, nodeType: string) {
  const grammar = node.grammarType;
  // @ts-ignore - TS doesn't know that the grammar is a valid key
  const rules = tsxGrammar.rules[nodeType];

  console.log(rules);
}
