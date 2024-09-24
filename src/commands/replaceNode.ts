import { selectNode } from "../jumpHints";
import { LizardContext } from "../stateContexts";

export async function replaceNode(ctx: LizardContext) {
  const currentNode = ctx.getCurrentNode();
  const newNode = await selectNode(ctx);

  if (!currentNode || !newNode) {
    return;
  }

  ctx.replaceText(
    currentNode.startPosition,
    currentNode.endPosition,
    newNode.text,
  );
}
