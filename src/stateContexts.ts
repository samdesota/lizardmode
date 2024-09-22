import * as vscode from "vscode";
import {
  TreeSitter,
  TreeSitterLanguage,
  TreeSitterNode,
  TreeSitterPoint,
  TreeSitterTree,
} from "./treeSitter";

export type EditorEffect =
  | {
      type: "showHints";
      locations: {
        node: TreeSitterNode;
        hint: string;
      }[];
    }
  | {
      type: "jumpTo";
      node: TreeSitterNode;
    };

export type EditorEvent = {
  type: "type";
  text: string;
};

export interface LizardContext {
  treeSitter: typeof TreeSitter;
  tree: TreeSitterTree;
  language: TreeSitterLanguage;
  getCursor(): TreeSitterPoint | null;
  getCurrentNode(): TreeSitterNode | null;
  isRangeVisible(start: TreeSitterPoint, end: TreeSitterPoint): boolean;
}

export interface LizardTransaction {
  done: boolean;
  preventEditorAction: boolean;
  effects?: EditorEffect[];
  states?: LizardState[];
}

export interface LizardState {
  __name: string;
  onEvent(ctx: LizardContext, event: EditorEvent): LizardTransaction;
  onDispose?(ctx: LizardContext): EditorEffect[];
}
