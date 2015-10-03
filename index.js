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
     * Create TextNode for SymbolNode, PunctuationNode, WhiteSpaceNode, SourceNode, and TextNode with POS.
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
             * 以降の解析はParagraphNodeの子ノードはTextNodeとWhiteSpaceNodeとなることを前提としている。
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
            var wordNode = parser.createParentNode('Word')

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

              // 文字が空白の場合
              if (item.pos_detail_1 === WS) {
                // インラインの場合
                if (linedepth) {
                  parser.add(createTextNode('WhiteSpace', item), wordNode)
                } else {
                  // アウトラインの場合
                  // WordNodeに子ノードが存在する場合、WordNodeを終了する
                  if (wordNode.children.length) {
                    parser.add(wordNode, sentenceNode)
                    wordNode = parser.createParentNode('Word')
                  }
                  parser.add(createTextNode('WhiteSpace', item), sentenceNode)
                }
              } else if (item.pos_detail_1 === M_OP) {
                // 文字が開括弧の場合
                linedepth++
                parser.add(createTextNode('Punctuation', item), wordNode)
              } else if (item.pos_detail_1 === M_CP) {
                // 文字が閉括弧の場合
                linedepth--
                parser.add(createTextNode('Punctuation', item), wordNode)
              } else if (item.pos_detail_1 === M_P) {
                // 文字が句点の場合
                parser.add(createTextNode('Punctuation', item), wordNode)
                // アウトラインの場合、WordNodeを終了し、次のWordNodeを作る
                if (!linedepth) {
                  parser.add(wordNode, sentenceNode)
                  wordNode = parser.createParentNode('Word')

                  // 行末でなければ次のSentenceNodeを作る
                  if (index !== data.length - 1) {
                    sentenceNode = parser.createParentNode('Sentence')
                    parser.add(sentenceNode, paragraphNode)
                  }
                }
              } else {
                // 改行以外のその他の文字の場合
                parser.add(createTextNode('Text', item), wordNode)
              }

              // 行末の場合
              if (index === data.length - 1) {
                // WordNodeに子ノードが存在する場合、WordNodeを終了する（句点で終わらない文章の場合）
                if (wordNode.children.length) {
                  parser.add(wordNode, sentenceNode)
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
