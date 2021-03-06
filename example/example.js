'use strict'

var japanese = require('../')
var retext = require('retext')
var inspect = require('unist-util-inspect')

var text = 'タイトル\n' +
    '\n' +
    '1 これは前段です。これは中段（２文の場合は後段。）です。これは後段です。'

var options = {
  position: true,
  post: false,
  dicDir: '../dict/'
}

retext().use(japanese, options).use(() => {
  return function (cst) {
    console.log(inspect(cst))
  }
}).process(text, (err, file, doc) => {
  if (err) {
    console.log(err)
  }
  console.log('\n=== doc ===')
  console.log(doc)
})
