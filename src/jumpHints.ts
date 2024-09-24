import { sortBy } from "lodash";
import { debug } from "./debug";
import { LizardContext } from "./stateContexts";
import { TreeSitterNode, TreeSitterPoint } from "./treeSitter";

const dvorakAlphabet = "aoeuidhtnsqjkxbmwvzyfpglcr".split("");

export const MAX_JUMP_HINTS = dvorakAlphabet.length ** 2;

export const getJumpHints = (length: number) => {
  const doubleLetters = length / dvorakAlphabet.length;

  if (doubleLetters > dvorakAlphabet.length) {
    throw new Error("Too many hints requested");
  }

  if (doubleLetters <= 1) {
    return dvorakAlphabet;
  }

  const singleLetters = dvorakAlphabet.length - doubleLetters;

  return [
    ...dvorakAlphabet.slice(0, singleLetters),
    ...dvorakAlphabet
      .slice(singleLetters)
      .flatMap((letter) =>
        dvorakAlphabet.map((secondLetter) => letter + secondLetter),
      ),
  ];
};

export const getNearestPositions = (
  cursor: TreeSitterPoint,
  matches: TreeSitterNode[],
) => {
  return sortBy(matches, (range) =>
    getPositionDistance(cursor, range.startPosition),
  ).slice(0, MAX_JUMP_HINTS);
};

export const getPositionDistance = (a: TreeSitterPoint, b: TreeSitterPoint) =>
  Math.abs(a.row - b.row) + Math.abs(a.column - b.column);

const jumpTypes = {
  condition: {
    query: `(if_statement) @statement`,
  },

  statement: {
    query: `(statement) @statement`,
  },
};

const jumpMap: Record<string, keyof typeof jumpTypes> = {
  "?": "condition",
  ";": "statement",
};

export async function requestStatementType(ctx: LizardContext) {
  const input = await ctx.readInput();
  return jumpMap[input];
}

export function createJumpTargets(
  ctx: LizardContext,
  type: keyof typeof jumpTypes,
) {
  debug(__filename, "creating jump hints", type);
  const query = ctx.language.query(jumpTypes[type].query);
  const matches = query.matches(ctx.tree.rootNode);
  const visibleRanges = getNearestPositions(
    ctx.getCursor() ?? { row: 0, column: 0 },
    matches
      .map((match) => match.captures[0].node)
      .filter((match) => {
        return ctx.isRangeVisible(match.startPosition, match.endPosition);
      }),
  );
  const hints = getJumpHints(visibleRanges.length);
  const jumpTargets = visibleRanges.map((node, index) => {
    return {
      node,
      hint: hints[index],
    };
  });
  return jumpTargets;
}

export async function selectNode(ctx: LizardContext) {
  const type = await requestStatementType(ctx);

  if (!type) {
    return;
  }

  const jumpTargets = createJumpTargets(ctx, type);

  if (jumpTargets.length === 0) {
    return;
  }

  ctx.showHints(jumpTargets);

  try {
    const hint = await ctx.readInput();
    const target = jumpTargets.find((target) => target.hint === hint);

    return target?.node;
  } finally {
    ctx.showHints([]);
  }
}

export async function jump(ctx: LizardContext) {
  const node = await selectNode(ctx);

  if (node) {
    ctx.jumpTo(node);
  }
}
