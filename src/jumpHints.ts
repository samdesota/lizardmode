import { assign, sortBy } from "lodash";
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
    query: `(if_statement) @target`,
  },

  statement: {
    query: `(statement) @target`,
  },

  expresion: {
    query: `(expression) @target`,
  },

  function: {
    query: `(function_declaration) @target`,
  },

  identifier: {
    query: `(identifier) @target`,
  },

  assignment: {
    query: `(assignment) @target`,
  },

  type: {
    query: `(primary_type) @target`,
  },
};

const jumpMap: Record<string, keyof typeof jumpTypes> = {
  "?": "condition",
  ";": "statement",
  f: "function",
  i: "identifier",
  a: "assignment",
  e: "expresion",
  t: "type",
};

export async function requestStatementType(ctx: LizardContext) {
  const input = await ctx.readInput();
  return jumpMap[input];
}

export function createJumpTargets(
  ctx: LizardContext,
  type: keyof typeof jumpTypes,
  rootNode: TreeSitterNode | null,
) {
  debug(__filename, "creating jump hints", type);

  if (!rootNode) {
    return [];
  }

  const query = ctx.language.query(jumpTypes[type].query);
  const matches = query.captures(rootNode);
  return createTargetsFromNodes(
    ctx,
    matches.map((match) => match.node),
  );
}

function createTargetsFromNodes(ctx: LizardContext, nodes: TreeSitterNode[]) {
  const visibleRanges = getNearestPositions(
    ctx.getCursor() ?? { row: 0, column: 0 },
    nodes.filter((match) => {
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

export async function selectStatementType(
  ctx: LizardContext,
  options: { insideCurrentNode?: boolean } = {},
) {
  const type = await requestStatementType(ctx);

  if (!type) {
    return;
  }

  const jumpTargets = createJumpTargets(
    ctx,
    type,
    options.insideCurrentNode ? ctx.getCurrentNode() : ctx.tree.rootNode,
  );

  if (jumpTargets.length === 0) {
    return;
  }

  ctx.showHints(jumpTargets);

  try {
    let typed = "";

    do {
      typed = typed + (await ctx.readInput());

      const matches = jumpTargets.filter((target) =>
        target.hint.startsWith(typed),
      );

      ctx.showHints(matches);

      if (matches.length === 0) {
        return;
      }

      const firstMatch = matches[0];

      if (firstMatch.hint === typed) {
        return firstMatch.node;
      }
    } while (true);
  } finally {
    ctx.showHints([]);
  }
}

export async function selectNode(ctx: LizardContext, nodes: TreeSitterNode[]) {
  const jumpTargets = createTargetsFromNodes(ctx, nodes);

  if (jumpTargets.length === 0) {
    return;
  }

  ctx.showHints(jumpTargets);

  try {
    let typed = "";

    do {
      typed = typed + (await ctx.readInput());

      const matches = jumpTargets.filter((target) =>
        target.hint.startsWith(typed),
      );

      ctx.showHints(matches);

      if (matches.length === 0) {
        return;
      }

      const firstMatch = matches[0];

      if (firstMatch.hint === typed) {
        return firstMatch.node;
      }
    } while (true);
  } finally {
    ctx.showHints([]);
  }
}

export async function jump(
  ctx: LizardContext,
  options: { insideCurrentNode?: boolean } = {},
) {
  const node = await selectStatementType(ctx, options);

  if (node) {
    ctx.jumpTo(node);
  }
}

export async function jumpToParent(ctx: LizardContext) {
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  const allParents = [];

  let current = currentNode.parent;

  while (current) {
    allParents.push(current);
    current = current.parent;
  }

  if (allParents.length === 0) {
    return;
  }

  const selected = await selectNode(ctx, allParents);

  if (selected) {
    ctx.jumpTo(selected);
  }
}
