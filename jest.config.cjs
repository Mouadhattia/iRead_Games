/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  testMatch: ['<rootDir>/client/src/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/client/src/__tests__/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        jsx: 'react-jsx'
      }
    }]
  }
};
