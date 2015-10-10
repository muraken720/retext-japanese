'use strict'

var assert = require('power-assert')

var japanese = require('../')

var retext = require('retext')
var select = require('unist-util-select')

describe('RetextJapaneseTest', () => {
  it('normal', (done) => {
    var options = {
      position: true,
      pos: true,
      dicDir: 'node_modules/kuromoji/dist/dict/'
    }

    var text = 'タイトル\n' +
        '\n' +
        '1 これは前段です。これは中段（２文の場合は後段。）です。これは後段です。'

    retext().use(japanese, options).use(() => {
      return function (cst) {
        // ParagraphNodeは3つ
        assert(cst.children.length === 3)

        // 3段落目のSentenceNodeは3つ
        var sentences = select(cst.children[2], 'SentenceNode')
        assert(sentences.length === 3)

        // 3段落目の1文目にはWhiteSpaceNode、PunctuationNodeがある。
        assert(cst.children[2].children[0].children[1].type === 'WhiteSpaceNode')
        assert(cst.children[2].children[0].children[6].type === 'PunctuationNode')

        done()
      }
    }).process(text, (err, file, doc) => {
      if (err) {
        console.log(err)
      }
    })
  })
})
