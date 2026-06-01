const { defaults: tsPreset } = require("ts-jest/presets");

module.exports = {
  clearMocks: true,
  transform: tsPreset.transform,
  collectCoverage: false,
  collectCoverageFrom: ["./src/**"],
  // Only run the TypeScript sources under src; never the compiled output in
  // build/, which otherwise surfaces stale duplicate suites.
  roots: ["<rootDir>/src"],
};
