/**
 * @author Kenichiro Murata
 * @copyright 2015 Kenichiro Murata
 * @license MIT
 * @fileoverview Japanese language support for retext.
 */

'use strict'

/**
 * Dependencies.
 */
var Parser = require('parse-japanese-basic')
var visit = require('unist-util-visit')
var kuromoji = require('kuromoji')

/**
 * Constants.
 */

var M_OP = '括弧開'
var M_CP = '括弧閉'
var M_P = '句点'
var WS = '空白'

function attacher (retext, options) {
  if (options && !options.position) {
    Parser.prototype.position = false
  }

  retext.Parser = Parser

  return function transformer (cst, file, next) {
    var parser = new Parser()
    var linedepth = 0

    /**
     * Create WordNode with POS.
     * @param item
     * @returns {{type: string, value: *}}
     */
    function createWordNode (item) {
      var wordNode = parser.createParentNode('Word')

      if (options && options.pos) {
        wordNode.data = item
      }

      var textNode = parser.createTextNode('Text', item.surface_form)

      parser.add(textNode, wordNode)

      return wordNode
    }

    /**
     * Create TextNode for SymbolNode, PunctuationNode, WhiteSpaceNode and SourceNode with POS.
     * @param type
     * @param item
     * @returns {{type: string, value: *}}
     */
    function createTextNode (type, item) {
      var node = parser.createTextNode(type, item.surface_form)

      if (options && options.pos) {
        node.data = item
      }

      return node
    }

    var dicDir = 'node_modules/retext-japanese/node_modules/kuromoji/dist/dict/'
    if (options && options.dicDir) {
      dicDir = options.dicDir
    }

    kuromoji
        .builder({dicPath: dicDir})
        .build(function (error, tokenizer) {
          if (error) {
            console.log(error)
            next()
          }

          var count = 0

          visit(cst, 'ParagraphNode', function (paragraphNode) {
            count++
            parser.line = count
            parser.column = 1

            /**
             * 以降の解析はparse-japanece-basicによるNLCSTを前提としている。
             * ParagraphNodeの子ノードはTextNodeとWhiteSpaceNodeとなる
             *  ParagraphNode[2]
             *  ├─ TextNode: 'あいうえお'
             *  └─ WhiteSpaceNode: '\n'
             *
             * 空行の場合は以降の処理をスキップする
             *  ParagraphNode[1]
             *  └─ WhiteSpaceNode: "\n"
             */
            if (paragraphNode.children.length !== 2) {
              return
            }

            // ParagraphNodeのchildrenを書き換えるため変更前の値を保存する
            var prevChildren = paragraphNode.children

            // ParagraphNodeのchildrenを初期化する
            paragraphNode.children = []

            // 事前準備
            var sentenceNode = parser.createParentNode('Sentence')

            // kuromoji.jsにより形態素解析を行う
            var data = tokenizer.tokenize(prevChildren[0].value)

            // 分解された文字列単位にNLCST Treeを生成する
            for (var index = 0; index < data.length; index++) {
              var item = data[index]

              // 行頭の場合
              if (index === 0) {
                // SentenceNodeをParagraphNodeに追加
                parser.add(sentenceNode, paragraphNode)
              }

              if (item.pos_detail_1 === WS) {
                // 文字が空白の場合
                parser.add(createTextNode('WhiteSpace', item), sentenceNode)
              } else if (item.pos_detail_1 === M_OP) {
                // 文字が開括弧の場合
                linedepth++
                parser.add(createTextNode('Punctuation', item), sentenceNode)
              } else if (item.pos_detail_1 === M_CP) {
                // 文字が閉括弧の場合
                linedepth--
                parser.add(createTextNode('Punctuation', item), sentenceNode)
              } else if (item.pos_detail_1 === M_P) {
                // 文字が句点の場合
                parser.add(createTextNode('Punctuation', item), sentenceNode)
                // インラインではない場合
                if (!linedepth && index !== data.length - 1) {
                  // 行末でなければ次のSentenceNodeを作る
                  sentenceNode = parser.createParentNode('Sentence')
                  parser.add(sentenceNode, paragraphNode)
                }
              } else {
                // 改行以外のその他の文字の場合

                // 記号であれば PunctuationNode を作る
                if (item.pos === '記号' && item.pos_detail_1 === '一般') {
                  parser.add(createTextNode('Punctuation', item), sentenceNode)
                } else {
                  parser.add(createWordNode(item), sentenceNode)
                }
              }
            }

            // 改行ノードをParagraphNodeに追加する
            parser.add(prevChildren[1], paragraphNode)
          })

          next()
        })
  }
}

module.exports = attacher
