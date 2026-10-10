const defineJestConfig = require('@tarojs/test-utils-react/dist/jest.js').default

// 用 .js 而非 .ts：本文件是纯 CommonJS，写成 .ts 会走 ts-node 编译，
// 而 tsconfig 的 types 为空数组（不引 @types/node），导致 require/module 报错、配置读不出来。
module.exports = defineJestConfig({
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/__tests__/**/*.(spec|test).[jt]s?(x)']
})
