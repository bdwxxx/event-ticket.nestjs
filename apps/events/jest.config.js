module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 10000,
  moduleNameMapper: {
    '^amqplib$': '<rootDir>/tests/__mocks__/amqplib.ts'
  },
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  setupFiles: ['<rootDir>/tests/setup.js']
}
