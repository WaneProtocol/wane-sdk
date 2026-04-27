// ESM jest config driving ts-jest. The source uses NodeNext ".js" import
// specifiers (real ESM); the mapper rewrites them to the ".ts" on disk at test
// time so we test the actual source, not the emitted dist.
/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // pin the transitive ESM-only uuid to its node CJS build so the web3.js CJS
    // entry can require() it under jest
    "^uuid$": "<rootDir>/node_modules/uuid/dist/index.js",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ES2022",
          esModuleInterop: true,
          skipLibCheck: true,
          types: ["jest", "node"],
        },
      },
    ],
  },
};
