/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src/jest"],
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
};
