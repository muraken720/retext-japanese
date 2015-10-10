'use strict'

var japanese = require('../')
var retext = require('retext')
var inspect = require('unist-util-inspect')

var text = 'すもももももももものうち'

var options = {
  position: false,
  pos: true,
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

