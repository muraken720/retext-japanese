# retext-japanese [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

Japanese language support for [retext](https://github.com/wooorm/retext).

## Installation

[npm](https://docs.npmjs.com/cli/install):

```bash
npm install retext-japanese
```

## Usage

*   exapmle/example.js

```javascript
var retext = require('retext')
var japanese = require('../')
var inspect = require('unist-util-inspect')

var options = {
  position: true,
  pos: false,
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
  console.log('\n=== doc ===')
  console.log(doc)
})

/**
* RootNode[3] (1:1-3:39, 0-44)
* ├─ ParagraphNode[2] (1:1-1:6, 0-5)
* │  ├─ SentenceNode[1] (1:1-1:5, 0-4)
* │  │  └─ WordNode[1] (1:1-1:5, 0-4)
* │  │     └─ TextNode: "タイトル" (1:1-1:5, 0-4)
* │  └─ WhiteSpaceNode: "\n" (1:5-1:6, 4-5)
* ├─ ParagraphNode[1] (2:1-2:2, 5-6)
* │  └─ WhiteSpaceNode: "\n" (2:1-2:2, 5-6)
* └─ ParagraphNode[4] (3:1-3:39, 4-44)
*    ├─ SentenceNode[3] (3:1-3:11, 4-14)
*    │  ├─ WordNode[1] (3:1-3:2, 4-5)
*    │  │  └─ TextNode: "1" (3:1-3:2, 4-5)
*    │  ├─ WhiteSpaceNode: " " (3:2-3:3, 5-6)
*    │  └─ WordNode[5] (3:3-3:11, 6-14)
*    │     ├─ TextNode: "これ" (3:3-3:5, 6-8)
*    │     ├─ TextNode: "は" (3:5-3:6, 8-9)
*    │     ├─ TextNode: "前段" (3:6-3:8, 9-11)
*    │     ├─ TextNode: "です" (3:8-3:10, 11-13)
*    │     └─ PunctuationNode: "。" (3:10-3:11, 13-14)
*    ├─ SentenceNode[1] (3:11-3:30, 14-33)
*    │  └─ WordNode[14] (3:11-3:30, 14-33)
*    │     ├─ TextNode: "これ" (3:11-3:13, 14-16)
*    │     ├─ TextNode: "は" (3:13-3:14, 16-17)
*    │     ├─ TextNode: "中段" (3:14-3:16, 17-19)
*    │     ├─ PunctuationNode: "（" (3:16-3:17, 19-20)
*    │     ├─ TextNode: "２" (3:17-3:18, 20-21)
*    │     ├─ TextNode: "文" (3:18-3:19, 21-22)
*    │     ├─ TextNode: "の" (3:19-3:20, 22-23)
*    │     ├─ TextNode: "場合" (3:20-3:22, 23-25)
*    │     ├─ TextNode: "は" (3:22-3:23, 25-26)
*    │     ├─ TextNode: "後段" (3:23-3:25, 26-28)
*    │     ├─ PunctuationNode: "。" (3:25-3:26, 28-29)
*    │     ├─ PunctuationNode: "）" (3:26-3:27, 29-30)
*    │     ├─ TextNode: "です" (3:27-3:29, 30-32)
*    │     └─ PunctuationNode: "。" (3:29-3:30, 32-33)
*    ├─ SentenceNode[1] (3:30-3:38, 33-41)
*    │  └─ WordNode[5] (3:30-3:38, 33-41)
*    │     ├─ TextNode: "これ" (3:30-3:32, 33-35)
*    │     ├─ TextNode: "は" (3:32-3:33, 35-36)
*    │     ├─ TextNode: "後段" (3:33-3:35, 36-38)
*    │     ├─ TextNode: "です" (3:35-3:37, 38-40)
*    │     └─ PunctuationNode: "。" (3:37-3:38, 40-41)
*    └─ WhiteSpaceNode: "\n" (3:38-3:39, 43-44)
* 
* === doc ===
* タイトル
* 
* 1 これは前段です。これは中段（２文の場合は後段。）です。これは後段です。
*/


// Add POS
options = {
  position: true,
  pos: true,
  dicDir: '../dict/' // copy kuromoji.js's dictionary from node_modules/kuromoji/dist/dict.
}

text = 'すもももももももものうち'

retext().use(japanese, options).use(() => {
  return function (cst) {
    console.log(inspect(cst))
  }
}).process(text, (err, file, doc) => {
  console.log('\n=== doc ===')
  console.log(doc)
})

/**
* RootNode[1] (1:1-1:14, 0-13)
* └─ ParagraphNode[2] (1:1-1:14, 0-13)
*    ├─ SentenceNode[1] (1:1-1:13, 0-12)
*    │  └─ WordNode[7] (1:1-1:13, 0-12)
*    │     ├─ TextNode: "すもも" (1:1-1:4, 0-3) [data={"word_id":404420,"word_type":"KNOWN","word_position":1,"surface_form":"すもも","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"すもも","reading":"スモモ","pronunciation":"スモモ"}]
*    │     ├─ TextNode: "も" (1:4-1:5, 3-4) [data={"word_id":2595480,"word_type":"KNOWN","word_position":4,"surface_form":"も","pos":"助詞","pos_detail_1":"係助詞","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"も","reading":"モ","pronunciation":"モ"}]
*    │     ├─ TextNode: "もも" (1:5-1:7, 4-6) [data={"word_id":604730,"word_type":"KNOWN","word_position":5,"surface_form":"もも","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"もも","reading":"モモ","pronunciation":"モモ"}]
*    │     ├─ TextNode: "も" (1:7-1:8, 6-7) [data={"word_id":2595480,"word_type":"KNOWN","word_position":7,"surface_form":"も","pos":"助詞","pos_detail_1":"係助詞","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"も","reading":"モ","pronunciation":"モ"}]
*    │     ├─ TextNode: "もも" (1:8-1:10, 7-9) [data={"word_id":604730,"word_type":"KNOWN","word_position":8,"surface_form":"もも","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"もも","reading":"モモ","pronunciation":"モモ"}]
*    │     ├─ TextNode: "の" (1:10-1:11, 9-10) [data={"word_id":2595360,"word_type":"KNOWN","word_position":10,"surface_form":"の","pos":"助詞","pos_detail_1":"連体化","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"の","reading":"ノ","pronunciation":"ノ"}]
*    │     └─ TextNode: "うち" (1:11-1:13, 10-12) [data={"word_id":1467000,"word_type":"KNOWN","word_position":11,"surface_form":"うち","pos":"名詞","pos_detail_1":"非自立","pos_detail_2":"副詞可能","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"うち","reading":"ウチ","pronunciation":"ウチ"}]
*    └─ WhiteSpaceNode: "\n" (1:13-1:14, 12-13)
* 
* === doc ===
* すもももももももものうち
*/
```

## API

### [retext](https://github.com/wooorm/retext).[use](https://github.com/wooorm/retext#retextuseplugin-options)\(japanese, options\)

Nothing else is needed. This will add better support for the Japanese language to retext.

**Parameters**

*   `japanese` — This plugin.
*   `options` (`Object`, optional)

    *   `position` (`boolean`, default: `true`) - Whether to add positional information to nodes.
    *   `pos` (`boolean`, default: `false`) - Whether to add part-of-speech information(by using [kuromoji.js](https://github.com/takuyaa/kuromoji.js)) to nodes.
    *   `dicDir` (`string`, default: `node_modules/parse-japanese/node_modules/kuromoji/dist/dict/`) - Whether to set Dictionaries directory for kuromoji.js. 

## Related

*   [parse-japanese-basic](https://github.com/muraken720/parse-japanese-basic)
*   [nlcst](https://github.com/wooorm/nlcst)
*   [retext](https://github.com/wooorm/retext)

## License

[MIT](LICENSE)
