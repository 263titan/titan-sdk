import type { Config } from 'jest';
const config: Config = {
  displayName: 'sdk-js',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testMatch: ['**/+(*.)+(spec|test).+(ts|tsx|js)'],
};
export default config;
