import path from "path";
import fs from "fs";
import * as TreeSitterWasm from "@vscode/tree-sitter-wasm";

const treeSitterWasmsPath = path.resolve(
  __dirname,
  "../node_modules/@vscode/tree-sitter-wasm/wasm",
);
const treeSitterWasm = path.join(treeSitterWasmsPath, "tree-sitter.wasm");
const typescriptWasm = path.join(
  treeSitterWasmsPath,
  "tree-sitter-typescript.wasm",
);

export const TreeSitter: typeof TreeSitterWasm.Parser = (TreeSitterWasm as any)
  .default;

export type TreeSitterLanguage = TreeSitterWasm.Parser.Language;

export type TreeSitterTree = ReturnType<TreeSitterWasm.Parser["parse"]>;

export const initializeParser = async () => {
  await TreeSitter.init({
    locateFile: () => {
      return `file://${treeSitterWasm}`;
    },
  });
  const lang = await TreeSitter.Language.load(
    await fs.promises.readFile(typescriptWasm),
  );

  const parser = new TreeSitter();
  parser.setLanguage(lang);

  return {
    parser,
    language: lang,
  };
};
