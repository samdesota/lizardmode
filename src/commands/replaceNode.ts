import { selectNode, selectStatementType } from "../jumpHints";
import { LizardContext } from "../stateContexts";

export async function replaceNode(ctx: LizardContext) {
  const currentNode = ctx.getCurrentNode();
  const newNode = await selectStatementType(ctx);

  if (!currentNode || !newNode) {
    return;
  }

  ctx.edit([
    {
      start: currentNode.startPosition,
      end: currentNode.endPosition,
      text: newNode.text,
    },
  ]);
}
