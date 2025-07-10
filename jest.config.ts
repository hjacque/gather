const { defaults: tsPreset } = require("ts-jest/presets");

module.exports = {
  clearMocks: true,
  transform: tsPreset.transform,
  collectCoverage: false,
  collectCoverageFrom: ["./src/**"],
};
