import * as vscode from "vscode";
import { sortBy } from "lodash";
import { LizardContext, LizardState, LizardTransaction } from "./stateContexts";
import { debug } from "./debug";
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

export const jumpCommand = (ctx: LizardContext): LizardTransaction => {
  return {
    done: false,
    preventEditorAction: true,
    states: [
      {
        __name: "jumpCommand",
        onEvent: (ctx, event) => {
          if (event.type === "type" && jumpMap[event.text]) {
            const jumpType = jumpMap[event.text];
            return createJumpingState(ctx, jumpType);
          }

          return {
            done: true,
            preventEditorAction: true,
          };
        },
      },
    ],
    effects: [],
  };
};

export const createJumpingState = (
  ctx: LizardContext,
  type: keyof typeof jumpTypes,
): LizardTransaction => {
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

  debug(__filename, "found jump targets", jumpTargets.length);

  return {
    done: true,
    preventEditorAction: true,
    states: [
      {
        __name: `jump to ${type}`,
        onDispose: () => {
          debug(__filename, "creating jump dispose effects");

          return [
            {
              type: "showHints",
              locations: [],
            },
          ];
        },
        onEvent: (ctx, event) => {
          if (event.type === "type") {
            debug(__filename, "handling jump to target", event.text);

            const target = jumpTargets.find((target) => {
              return target.hint === event.text;
            });

            if (target) {
              return {
                done: true,
                preventEditorAction: true,
                effects: [
                  {
                    type: "jumpTo",
                    node: target.node,
                  },
                ],
              };
            }
          }

          return {
            done: true,
            preventEditorAction: true,
          };
        },
      },
    ],
    effects: [
      {
        type: "showHints",
        locations: jumpTargets,
      },
    ],
  };
};
