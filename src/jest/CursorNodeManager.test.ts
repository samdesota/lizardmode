import { Parser } from "@vscode/tree-sitter-wasm";
import { LizardContext } from "../stateContexts";
import {
  TreeSitter,
  TreeSitterPoint,
  TreeSitterNode,
  initializeParser,
} from "../treeSitter";
import { CursorNodeManager } from "../CursorNodeManager";
import * as assert from "assert";

class TestContext implements LizardContext {
  constructor(
    public treeSitter: typeof TreeSitter,
    public tree: Parser.Tree,
    public language: Parser.Language,
    public parser: Parser,
  ) {}
  getLine(n: number): string {
    throw new Error("Method not implemented.");
  }
  getIndentation(): string {
    throw new Error("Method not implemented.");
  }
  insertSnippet(
    start: TreeSitterPoint,
    end: TreeSitterPoint,
    text: string,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  exitLizardMode(mode?: "insert" | "normal"): void {
    throw new Error("Method not implemented.");
  }

  getCursor(): TreeSitterPoint | null {
    throw new Error("Method not implemented.");
  }
  getCurrentNode(): TreeSitterNode | null {
    throw new Error("Method not implemented.");
  }
  isRangeVisible(start: TreeSitterPoint, end: TreeSitterPoint): boolean {
    throw new Error("Method not implemented.");
  }
  readInput(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  jumpTo(node: TreeSitterNode): void {
    throw new Error("Method not implemented.");
  }
  showHints(hints: { node: TreeSitterNode; hint: string }[]): void {
    throw new Error("Method not implemented.");
  }
  edit(
    edits: {
      start: TreeSitterPoint;
      removeWhenEmpty: boolean;
      end: TreeSitterPoint;
      text: string;
    }[],
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

const treeSitterInit = initializeParser();
const getContext = async (doc: string) => {
  const { language, parser } = await treeSitterInit;

  const tree = parser.parse(doc);

  return new TestContext(TreeSitter, tree, language, parser);
};

describe("CursorNodeManager", () => {
  describe("getCurrentNode", () => {
    test("returns the current node", async () => {
      const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
      const context = await getContext(lines.join("\n"));
      const manager = new CursorNodeManager(context);
      const statements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const secondLine = statements[1].node;
      manager.setCurrentNode(secondLine);

      assert.equal(manager.getCurrentNode(), secondLine);
    });

    test("when tree is updated, finds the new node at the same location", async () => {
      const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
      const context = await getContext(lines.join("\n"));
      const manager = new CursorNodeManager(context);
      const statements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const secondLine = statements[1].node;
      manager.setCurrentNode(secondLine);

      assert.equal(manager.getCurrentNode(), secondLine);

      context.tree = context.parser.parse(lines.join("\n"));

      const newStatements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const newSecondLine = newStatements[1].node;

      assert.notEqual(newSecondLine.id, secondLine.id);
      assert.equal(manager.getCurrentNode()?.id, newSecondLine.id);
    });
  });

  describe("handleEdits", () => {
    test("when edit is before the node, adjust the start position", async () => {
      const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
      const context = await getContext(lines.join("\n"));
      const manager = new CursorNodeManager(context);
      const statements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const secondLine = statements[1].node;
      manager.setCurrentNode(secondLine);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.endIndex);

      manager.handleEdits([
        {
          start: 0,
          end: lines[0].length,
          text: "bars",
        },
      ]);

      context.tree = context.parser.parse(
        ["fooo;", ...lines.slice(1)].join("\n"),
      );

      const change = 5 - lines[0].length;

      assert.equal(manager.cursorStart, secondLine.startIndex + change);
      assert.equal(manager.cursorEnd, secondLine.endIndex + change);
    });

    test("when edit is after the node, do nothing", async () => {
      const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
      const context = await getContext(lines.join("\n"));
      const manager = new CursorNodeManager(context);
      const statements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const secondLine = statements[1].node;
      const lastLine = statements[2].node;
      manager.setCurrentNode(secondLine);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.endIndex);

      manager.handleEdits([
        {
          start: lastLine.startIndex,
          end: lastLine.endIndex,
          text: "foods",
        },
      ]);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.endIndex);
    });

    test("when edit is inside the node, update the end position", async () => {
      const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
      const context = await getContext(lines.join("\n"));
      const manager = new CursorNodeManager(context);
      const statements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const secondLine = statements[1].node;
      manager.setCurrentNode(secondLine);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.endIndex);

      manager.handleEdits([
        {
          start: secondLine.startIndex + 1,
          end: secondLine.endIndex - 1,
          text: "t",
        },
      ]);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.startIndex + 3);
    });

    test("when edit replaces the node, update the end position", async () => {
      const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
      const context = await getContext(lines.join("\n"));
      const manager = new CursorNodeManager(context);
      const statements = context.language
        .query("(statement) @statement")
        .captures(context.tree.rootNode);

      const secondLine = statements[1].node;
      manager.setCurrentNode(secondLine);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.endIndex);

      manager.handleEdits([
        {
          start: secondLine.startIndex,
          end: secondLine.endIndex,
          text: "bars;",
        },
      ]);

      assert.equal(manager.cursorStart, secondLine.startIndex);
      assert.equal(manager.cursorEnd, secondLine.startIndex + 5);
    });
  });
});
