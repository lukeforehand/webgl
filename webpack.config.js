const HtmlWebpackPlugin = require('html-webpack-plugin')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
module.exports = {
  plugins: [
    new HtmlWebpackPlugin({ title: require('./package.json').description}),
    new FaviconsWebpackPlugin({
      logo: './src/luke_pixels.jpg',
      icons: {
        android: false,
        appleIcon: false,
        appleStartup: false,
        coast: false,
        favicons: true,
        firefox: false,
        opengraph: false,
        twitter: false,
        yandex: false,
        windows: false
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|gif|m4a)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.(vert|frag)$/,
        use: [
          'raw-loader'
        ]
      }
    ]
  }
}
