import { defineConfig } from 'vite'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { createHtmlPlugin } from 'vite-plugin-html'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression'
import eslint from 'vite-plugin-eslint'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = mode === 'development'
  const isProd = mode === 'production'
  const isAnalyze = process.env.ANALYZE === 'true'

  return {
    // Base public path
    base: '/',
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.1.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __GIT_COMMIT__: JSON.stringify(process.env.VITE_GIT_COMMIT || 'unknown'),
      __ENVIRONMENT__: JSON.stringify(mode),
      __DEV__: isDev,
      __PROD__: isProd
    },

    // Development server configuration
    server: {
      host: true, // Listen on all addresses
      port: 3000,
      open: true, // Auto-open browser
      cors: true,
      strictPort: false,
      hmr: {
        overlay: true
      },
      // Proxy API requests in development
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },

    // Preview server configuration (for production builds)
    preview: {
      host: true,
      port: 4173,
      open: true,
      cors: true
    },

    // Build configuration
    build: {
      target: 'es2015', // Support older browsers
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isDev ? true : false,
      minify: isProd ? 'terser' : false,
      
      // Terser options for production minification
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.info'] : []
        },
        format: {
          comments: false
        }
      },

      // Rollup options
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          // Add additional entry points if needed
          // admin: resolve(__dirname, 'admin.html')
        },
        
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'vendor-core': ['lodash', 'moment'],
            'vendor-ui': ['notyf'],
            'vendor-utils': ['jspdf'],
            
            // App chunks
            'ai-engine': [
              './src/ai/AIPersonalities.js',
              './src/ai/ConversationPrompts.js',
              './src/ai/PromptGenerator.js'
            ],
            'components': [
              './src/components/ConversationGenerator.js',
              './src/components/FavoritesManager.js',
              './src/components/ExportManager.js'
            ],
            'utils': [
              './src/utils/Storage.js',
              './src/utils/Validation.js',
              './src/utils/Sanitization.js'
            ]
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const ext = info[info.length - 1]
            
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            if (ext === 'css') {
              return `assets/styles/[name]-[hash][extname]`
            }
            return `assets/[ext]/[name]-[hash][extname]`
          },
          
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        },

        // External dependencies (if using CDN)
        external: isDev ? [] : [
          // 'lodash', // Uncomment if using CDN
          // 'moment'
        ]
      },

      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,

      // CSS code splitting
      cssCodeSplit: true,

      // Generate manifest for asset tracking
      manifest: true,

      // Report compressed file sizes
      reportCompressedSize: true,

      // Write bundle to disk even in dev mode
      write: true
    },

    // CSS configuration
    css: {
      // CSS modules configuration
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isDev 
          ? '[name]__[local]___[hash:base64:5]'
          : '[hash:base64:8]'
      },
      
      // PostCSS configuration
      postcss: {
        plugins: [
          // Add PostCSS plugins here if needed
          // require('autoprefixer'),
          // require('cssnano')
        ]
      },

      // Preprocessor options
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/styles/variables.scss";`
        },
        less: {
          additionalData: `@import "./src/styles/variables.less";`
        }
      },

      // Dev source map
      devSourcemap: isDev
    },

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@ai': resolve(__dirname, 'src/ai'),
        '@config': resolve(__dirname, 'src/config'),
        '@styles': resolve(__dirname, 'src/styles'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@locales': resolve(__dirname, 'src/locales'),
        '@services': resolve(__dirname, 'src/services')
      },
      
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },

    // Plugin configuration
    plugins: [
      // ESLint integration
      eslint({
        cache: false,
        include: ['src/**/*.js', 'src/**/*.ts'],
        exclude: ['node_modules', 'dist']
      }),

      // HTML plugin for template processing
      createHtmlPlugin({
        minify: isProd,
        inject: {
          data: {
            title: 'ThannxAI Enhanced Conversation Topic Selector',
            description: 'AI-powered conversation starter generator with multiple personalities and languages',
            keywords: 'conversation, AI, chat, topics, ThannxAI, communication',
            author: 'Thanattsitt Thanatt (ThannxAI)',
            version: process.env.npm_package_version || '2.1.0',
            buildDate: new Date().toISOString(),
            environment: mode,
            
            // Open Graph meta tags
            ogTitle: 'ThannxAI Conversation Topic Selector',
            ogDescription: 'Generate engaging conversation starters with AI personalities',
            ogImage: '/assets/og-image.png',
            ogUrl: 'https://conversation-topics.thannx.ai',
            
            // Twitter Card meta tags
            twitterCard: 'summary_large_image',
            twitterSite: '@ThannxAI',
            twitterCreator: '@ThannxAI',
            
            // Theme color
            themeColor: '#667eea',
            
            // Conditional scripts and styles
            isDev,
            isProd,
            
            // Analytics
            analyticsId: process.env.VITE_ANALYTICS_ID || '',
            
            // Feature flags
            enablePWA: process.env.VITE_PWA_ENABLED !== 'false',
            enableAnalytics: process.env.VITE_ANALYTICS_ENABLED === 'true'
          }
        }
      }),

      // Progressive Web App
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.thannx\.ai\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'ThannxAI Conversation Topic Selector',
          short_name: 'ThannxAI Chat',
          description: 'AI-powered conversation starter generator with multiple personalities',
          theme_color: '#667eea',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['productivity', 'social', 'communication'],
          lang: 'en',
          dir: 'ltr',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Generate Conversation',
              short_name: 'Generate',
              description: 'Quickly generate a new conversation topic',
              url: '/?action=generate',
              icons: [{ src: '/icons/shortcut-generate.png', sizes: '96x96' }]
            },
            {
              name: 'View Favorites',
              short_name: 'Favorites',
              description: 'View saved favorite conversations',
              url: '/?action=favorites',
              icons: [{ src: '/icons/shortcut-favorites.png', sizes: '96x96' }]
            }
          ],
          screenshots: [
            {
              src: '/assets/screenshots/desktop-1.png',
              sizes: '1280x720',
              type: 'image/png',
              platform: 'wide',
              label: 'Main interface on desktop'
            },
            {
              src: '/assets/screenshots/mobile-1.png',
              sizes: '375x667',
              type: 'image/png',
              platform: 'narrow',
              label: 'Mobile interface'
            }
          ]
        },
        devOptions: {
          enabled: isDev,
          type: 'module'
        }
      }),

      // Gzip compression for production
      ...(isProd ? [
        compression({
          algorithm: 'gzip',
          ext: '.gz'
        }),
        compression({
          algorithm: 'brotliCompress',
          ext: '.br'
        })
      ] : []),

      // Bundle analyzer
      ...(isAnalyze ? [
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true
        })
      ] : [])
    ],

    // Optimization configuration
    optimizeDeps: {
      include: [
        'lodash',
        'moment',
        'notyf',
        'jspdf'
      ],
      exclude: [
        // Exclude large dependencies that should be loaded dynamically
      ]
    },

    // Environment variables
    envPrefix: 'VITE_',
    envDir: './',

    // Experimental features
    experimental: {
      // Enable build optimizations
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        } else {
          return { relative: true }
        }
      }
    },

    // Worker configuration
    worker: {
      format: 'es'
    },

    // JSON configuration
    json: {
      namedExports: true,
      stringify: false
    },

    // esbuild configuration
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none'
    },

    // Log level
    logLevel: isDev ? 'info' : 'warn',

    // Clear screen
    clearScreen: true
  }
})
