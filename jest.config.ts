const { defaults: tsPreset } = require("ts-jest/presets");

module.exports = {
  clearMocks: true,
  preset: "@shelf/jest-mongodb",
  transform: tsPreset.transform,
  collectCoverage: false,
  collectCoverageFrom: ["./src/**"],
  setupFiles: ["<rootDir>/jest.setEnvVars.ts"],
};
