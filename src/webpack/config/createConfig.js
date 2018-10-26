const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
// const PreloadWebpackPlugin = require('preload-webpack-plugin');
// const CircularDependencyPlugin = require('circular-dependency-plugin');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
// const Visualizer = require('webpack-visualizer-plugin');

const MonetJSONPlugin = require('../plugin/MonetJSONPlugin');
const ZipPlugin = require('zip-webpack-plugin');

const nodeModules = `${path.resolve(__dirname, '../../../node_modules')}/`;

// console.log(nodeModules);
/**
 *
 * @param {object} options
 * @param {string} options.filepathJs
 * @param {string} options.filepathHtml
 * @param {string} options.filepathRichmediaRC
 * @param {string} options.outputPath
 * @param {string} options.mode
 * @return {{mode: string, entry: *[], output: {path: *, filename: string}, externals: {TweenLite: string, TweenMax: string, TimelineLite: string, TimelineMax: string, Enabler: string, Monet: string}, resolve: {modules: string[], alias: {vendor: string}}, resolveLoader: {modules: string[], symlinks: boolean}, module: {rules: *[]}, plugins: *[], stats: {colors: boolean}, devtool: string}}
 */
module.exports = function createConfig({
  filepathJs,
  filepathHtml,
  filepathRichmediaRC,
  outputPath,
  mode = 'production',
  platform = 'unknown',
}) {
  let devtool = 'inline-source-map';
  const entry = ['@babel/polyfill']; //[`whatwg-fetch`, `promise-polyfill`];

  if (mode === 'production') {
    devtool = false;
  }

  if (mode === 'development') {
    entry.push(`webpack-hot-middleware/client`);
  }

  entry.push(filepathJs);

  const config = {
    mode,
    entry,

    output: {
      path: outputPath,
      filename: './main.js',
    },
    externals: {
      // gsap external
      TweenLite: 'TweenLite',
      TweenMax: 'TweenMax',
      TimelineLite: 'TimelineLite',
      TimelineMax: 'TimelineMax',

      // doubleclick and monet external
      Enabler: 'Enabler',
      Monet: 'Monet',
    },
    resolve: {
      modules: ['node_modules', nodeModules],
      alias: {
        vendor: path.resolve(__dirname, '../../../vendor'),
      },
    },

    resolveLoader: {
      modules: ['node_modules', nodeModules],
      symlinks: true,
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name]-[sha512:hash:base64:7].css',
              },
            },
            {
              loader: 'extract-loader',
            },
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: loader => [
                  require('postcss-import')({ root: loader.resourcePath }),
                  require('postcss-preset-env')({
                    stage: 2,
                    features: {
                      'nesting-rules': true,
                    },
                    browsers: ['defaults', 'ie 11'],
                  }),
                  require('postcss-nested')(),
                  require('cssnano')(),
                ],
              },
            },
          ],
        },
        {
          test: /\.sketch$/,
          use: [
            {
              loader: 'sketch-loader',
            },
          ],
        },
        {
          test: /\.(mp4|svg)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name]-[sha512:hash:base64:7].[ext]',
              },
            },
          ],
        },
        {
          test: /\.(gif|png|jpe?g|svg)$/i,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name]-[sha512:hash:base64:7].[ext]',
              },
            },
            {
              loader: 'image-webpack-loader',
              options: {
                optipng: {
                  enabled: true,
                },
                mozjpeg: {
                  progressive: true,
                  quality: 65,
                },
                pngquant: {
                  quality: '65-90',
                  speed: 4,
                },
                gifsicle: {
                  interlaced: false,
                },
              },
            },
          ],
        },

        {
          test: /\.js$/,
          // adding exception to libraries comming from @mediamonks namespace.
          exclude: /(?!(node_modules\/@mediamonks)|(node_modules\\@mediamonks))node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    useBuiltIns: 'entry',
                    targets: {
                      browsers: ['ie 11', 'last 2 versions', 'safari >= 7'],
                    },
                  },
                ],
              ],
              plugins: [
                `@babel/plugin-proposal-class-properties`,
                `@babel/plugin-transform-async-to-generator`,
              ],
            },
          },
        },
        {
          test: /.richmediarc$/,
          exclude: /node_modules/,
          type: 'javascript/dynamic',
          use: {
            loader: path.resolve(path.join(__dirname, '../loader/RichmediaRCLoader.js')),
          },
        },

        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'html-loader',
              options: {
                minimize: false,

                attrs: ['img:src', 'video:src', 'link:href'],
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: filepathHtml,
      }),

      //
      // new PreloadWebpackPlugin(),
      new webpack.DefinePlugin({
        PRODUCTION: JSON.stringify(false),
      }),

      //
      // new CircularDependencyPlugin({
      //   // exclude detection of files based on a RegExp
      //   exclude: /node_modules/,
      //   // add errors to webpack instead of warnings
      //   failOnError: true,
      //   // set the current working directory for displaying module paths
      //   cwd: process.cwd(),
      // }),
      //
      // new Visualizer({
      //   filename: './statistics.html',
      // }),
    ],
    stats: {
      colors: true,
    },
    devtool,
  };

  if (platform === 'monet') {
    config.plugins.push(
      new MonetJSONPlugin({
        config: filepathRichmediaRC,
        filePattern: '[hash].[ext]',
      }),
    );
  }

  if (mode === 'development') {
    config.plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  if (mode === 'production') {
    config.plugins.push(
      new ZipPlugin({
        filename: 'bundle.zip',

        fileOptions: {
          mtime: new Date(),
          mode: 0o100664,
          compress: true,
          forceZip64Format: false,
        },

        zipOptions: {
          forceZip64Format: false,
        },
      }),
    );
  }

  return config;
};
