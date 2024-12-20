import { insertNodeInSlot } from "../commands/findSlotInNode";
import { initializeParser } from "../tree-sitter/treeSitter";

describe("findSlotInNode", () => {
  it("should find slot in node", async () => {
    const { parser, language } = await initializeParser("tsx");

    const tree = parser.parse(`function App() {}`);
    insertNodeInSlot(tree.rootNode, "lexical_declaration");
  });
});
