import * as vscode from "vscode";
import { TreeSitter, TreeSitterLanguage, TreeSitterTree } from "./treeSitter";

export type EditorEffect =
  | {
      type: "showHints";
      locations: {
        range: vscode.Range;
        hint: string;
      }[];
    }
  | {
      type: "jumpTo";
      range: vscode.Range;
    };

export type EditorEvent = {
  type: "type";
  text: string;
};

export interface LizardContext {
  treeSitter: typeof TreeSitter;
  tree: TreeSitterTree;
  language: TreeSitterLanguage;
  getCursor(): vscode.Position | null;
  isRangeVisible(range: vscode.Range): boolean;
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
