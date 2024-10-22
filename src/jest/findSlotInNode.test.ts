import { insertNodeInSlot } from "../commands/findSlotInNode";
import { initializeParser } from "../treeSitter";

describe("findSlotInNode", () => {
  fit("should find slot in node", async () => {
    const { parser, language } = await initializeParser("tsx");

    const tree = parser.parse(`function App() {}`);
    insertNodeInSlot(tree.rootNode, "lexical_declaration");
  });
});
