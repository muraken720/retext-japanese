'use strict'

var retext = require('retext')
var japanese = require('../')
// var emoji = require('retext-emoji')
var inspect = require('unist-util-inspect')

var options = {
  position: true,
  pos: true,
  dicDir: '../dict/' // copy kuromoji.js's dictionary from node_modules/kuromoji/dist/dict.
}

var text = 'タイトル\n' +
    '\n' +
    '1 これは前段です。これは中段（２文の場合は後段。）です。これは後段です。'

retext().use(japanese, options).use(() => {
  return function (cst) {
    console.log(inspect(cst))
  }
}).process(text, (err, file, doc) => {
  if (err) {
    console.lgo(err)
  }
  console.log('=== doc ===')
  console.log(doc)
})
