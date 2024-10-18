import path from "path";
import fs from "fs";
import * as TreeSitterWasm from "@vscode/tree-sitter-wasm";

const localWasms = path.resolve(__dirname, "../wasms");
const treeSitterWasm = path.join(localWasms, "tree-sitter.wasm");
const typescriptWasm = path.join(localWasms, "tree-sitter-typescript.wasm");
const tsxWasm = path.join(localWasms, "tree-sitter-tsx.wasm");

export const TreeSitter: typeof TreeSitterWasm.Parser = (TreeSitterWasm as any)
  .default;

export type TreeSitterParser = TreeSitterWasm.Parser;

export type TreeSitterLanguage = TreeSitterWasm.Parser.Language;

export type TreeSitterTree = ReturnType<TreeSitterWasm.Parser["parse"]>;

export type TreeSitterNode = TreeSitterTree["rootNode"];

export type TreeSitterPoint = TreeSitterNode["startPosition"];

const languages = {
  typescript: typescriptWasm,
  tsx: tsxWasm,
};

export const initializeParser = async (langId: keyof typeof languages) => {
  await TreeSitter.init({
    locateFile: () => {
      return `file://${treeSitterWasm}`;
    },
  });
  const lang = await TreeSitter.Language.load(
    await fs.promises.readFile(languages[langId]),
  );

  const parser = new TreeSitter();
  parser.setLanguage(lang);

  return {
    parser,
    language: lang,
  };
};
