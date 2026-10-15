import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'
import path from 'node:path'
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'

const projectRoot = path.resolve(__dirname, '..')

const weappTailwindcssOptions = {
  cssOptions: {
    rem2rpx: true,
  },
  tailwindcssBasedir: projectRoot,
  cssEntries: [
    path.resolve(projectRoot, 'src/app.css'),
  ],
}

function registerWeappTailwindcss(chain: any) {
  chain.merge({
    plugin: {
      install: {
        plugin: UnifiedWebpackPluginV5,
        args: [weappTailwindcssOptions],
      },
    },
  })
}

export default defineConfig(async (merge, { mode }) => {
  // 构建期把「这次构建读的是哪个 env 文件」打出来。
  //
  // mode 决定读 .env.[mode]，而 mode 默认跟着 NODE_ENV 走（--watch → development，
  // 否则 production）。但 `--watch --mode production` 会让两者分叉：webpack 仍是开发模式
  // （不压缩，便于调试），后端地址却取自 .env.production —— 也就是本地起了一个连线上后端的构建。
  // 这是很容易踩且不容易发现的坑（现象是本地请求打到生产域名），所以显式警告一次。
  console.log(`[taro] mode=${mode} → 读取 .env.${mode}`)
  if (process.env.NODE_ENV === 'development' && mode !== 'development') {
    console.warn(
      `[taro] 注意：本次是 --watch 构建，但 mode=${mode}，前端会连线上后端（见 .env.${mode}）。` +
        ' 本地连本地请用 pnpm dev:weapp。',
    )
  }

  const baseConfig: UserConfigExport = {
    projectName: 'babyGrowFrontend',
    date: '2026-7-20',
    designWidth: 390,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      390: 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {
    },
    copy: {
      patterns: [
        {
          from: 'src/assets/icons',
          to: 'dist/assets/icons'
        },
        {
          from: 'src/assets/images',
          to: 'dist/assets/images'
        }
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        url: {
          enable: true,
          config: {
            limit: 1024
          }
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
        registerWeappTailwindcss(chain)
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
        registerWeappTailwindcss(chain)
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false,
        }
      }
    }
  }
  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
