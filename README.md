# retext-japanese [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

Japanese language support for [retext](https://github.com/wooorm/retext).

## Installation

[npm](https://docs.npmjs.com/cli/install):

```bash
npm install retext-japanese
```

## Usage

### exapmle/example.js
```javascript
var retext = require('retext')
var japanese = require('retext-japanese')
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

/**
* RootNode[3] (1:1-3:39, 0-44)
* ├─ ParagraphNode[2] (1:1-1:6, 0-5)
* │  ├─ SentenceNode[1] (1:1-1:5, 0-4)
* │  │  └─ WordNode[1] (1:1-1:5, 0-4)
* │  │     └─ TextNode: "タイトル" (1:1-1:5, 0-4) [data={"word_id":509010,"word_type":"KNOWN","word_position":1,"surface_form":"タイトル","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"タイトル","reading":"タイトル","pronunciation":"タイトル"}]
* │  └─ WhiteSpaceNode: "\n" (1:5-1:6, 4-5)
* ├─ ParagraphNode[1] (2:1-2:2, 5-6)
* │  └─ WhiteSpaceNode: "\n" (2:1-2:2, 5-6)
* └─ ParagraphNode[4] (3:1-3:39, 4-44)
*    ├─ SentenceNode[3] (3:1-3:11, 4-14)
*    │  ├─ WordNode[1] (3:1-3:2, 4-5)
*    │  │  └─ TextNode: "1" (3:1-3:2, 4-5) [data={"word_id":90,"word_type":"UNKNOWN","word_position":1,"surface_form":"1","pos":"名詞","pos_detail_1":"数","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"*"}]
*    │  ├─ WhiteSpaceNode: " " (3:2-3:3, 5-6) [data={"word_id":10,"word_type":"UNKNOWN","word_position":2,"surface_form":" ","pos":"記号","pos_detail_1":"空白","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"*"}]
*    │  └─ WordNode[5] (3:3-3:11, 6-14)
*    │     ├─ TextNode: "これ" (3:3-3:5, 6-8) [data={"word_id":956570,"word_type":"KNOWN","word_position":3,"surface_form":"これ","pos":"名詞","pos_detail_1":"代名詞","pos_detail_2":"一般","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"これ","reading":"コレ","pronunciation":"コレ"}]
*    │     ├─ TextNode: "は" (3:5-3:6, 8-9) [data={"word_id":2595270,"word_type":"KNOWN","word_position":5,"surface_form":"は","pos":"助詞","pos_detail_1":"係助詞","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"は","reading":"ハ","pronunciation":"ワ"}]
*    │     ├─ TextNode: "前段" (3:6-3:8, 9-11) [data={"word_id":832710,"word_type":"KNOWN","word_position":6,"surface_form":"前段","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"前段","reading":"ゼンダン","pronunciation":"ゼンダン"}]
*    │     ├─ TextNode: "です" (3:8-3:10, 11-13) [data={"word_id":305080,"word_type":"KNOWN","word_position":8,"surface_form":"です","pos":"助動詞","pos_detail_1":"*","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"特殊・デス","conjugated_form":"基本形","basic_form":"です","reading":"デス","pronunciation":"デス"}]
*    │     └─ PunctuationNode: "。" (3:10-3:11, 13-14) [data={"word_id":2612880,"word_type":"KNOWN","word_position":10,"surface_form":"。","pos":"記号","pos_detail_1":"句点","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"。","reading":"。","pronunciation":"。"}]
*    ├─ SentenceNode[1] (3:11-3:30, 14-33)
*    │  └─ WordNode[14] (3:11-3:30, 14-33)
*    │     ├─ TextNode: "これ" (3:11-3:13, 14-16) [data={"word_id":956570,"word_type":"KNOWN","word_position":1,"surface_form":"これ","pos":"名詞","pos_detail_1":"代名詞","pos_detail_2":"一般","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"これ","reading":"コレ","pronunciation":"コレ"}]
*    │     ├─ TextNode: "は" (3:13-3:14, 16-17) [data={"word_id":2595270,"word_type":"KNOWN","word_position":3,"surface_form":"は","pos":"助詞","pos_detail_1":"係助詞","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"は","reading":"ハ","pronunciation":"ワ"}]
*    │     ├─ TextNode: "中段" (3:14-3:16, 17-19) [data={"word_id":652400,"word_type":"KNOWN","word_position":4,"surface_form":"中段","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"中段","reading":"チュウダン","pronunciation":"チューダン"}]
*    │     ├─ PunctuationNode: "（" (3:16-3:17, 19-20) [data={"word_id":2612070,"word_type":"KNOWN","word_position":6,"surface_form":"（","pos":"記号","pos_detail_1":"括弧開","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"（","reading":"（","pronunciation":"（"}]
*    │     ├─ TextNode: "２" (3:17-3:18, 20-21) [data={"word_id":1300010,"word_type":"KNOWN","word_position":7,"surface_form":"２","pos":"名詞","pos_detail_1":"数","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"２","reading":"ニ","pronunciation":"ニ"}]
*    │     ├─ TextNode: "文" (3:18-3:19, 21-22) [data={"word_id":2604310,"word_type":"KNOWN","word_position":8,"surface_form":"文","pos":"名詞","pos_detail_1":"接尾","pos_detail_2":"助数詞","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"文","reading":"ブン","pronunciation":"ブン"}]
*    │     ├─ TextNode: "の" (3:19-3:20, 22-23) [data={"word_id":2595360,"word_type":"KNOWN","word_position":9,"surface_form":"の","pos":"助詞","pos_detail_1":"連体化","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"の","reading":"ノ","pronunciation":"ノ"}]
*    │     ├─ TextNode: "場合" (3:20-3:22, 23-25) [data={"word_id":344200,"word_type":"KNOWN","word_position":10,"surface_form":"場合","pos":"名詞","pos_detail_1":"副詞可能","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"場合","reading":"バアイ","pronunciation":"バアイ"}]
*    │     ├─ TextNode: "は" (3:22-3:23, 25-26) [data={"word_id":2595270,"word_type":"KNOWN","word_position":12,"surface_form":"は","pos":"助詞","pos_detail_1":"係助詞","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"は","reading":"ハ","pronunciation":"ワ"}]
*    │     ├─ TextNode: "後段" (3:23-3:25, 26-28) [data={"word_id":613140,"word_type":"KNOWN","word_position":13,"surface_form":"後段","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"後段","reading":"コウダン","pronunciation":"コーダン"}]
*    │     ├─ PunctuationNode: "。" (3:25-3:26, 28-29) [data={"word_id":2612880,"word_type":"KNOWN","word_position":15,"surface_form":"。","pos":"記号","pos_detail_1":"句点","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"。","reading":"。","pronunciation":"。"}]
*    │     ├─ PunctuationNode: "）" (3:26-3:27, 29-30) [data={"word_id":2612210,"word_type":"KNOWN","word_position":1,"surface_form":"）","pos":"記号","pos_detail_1":"括弧閉","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"）","reading":"）","pronunciation":"）"}]
*    │     ├─ TextNode: "です" (3:27-3:29, 30-32) [data={"word_id":305080,"word_type":"KNOWN","word_position":2,"surface_form":"です","pos":"助動詞","pos_detail_1":"*","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"特殊・デス","conjugated_form":"基本形","basic_form":"です","reading":"デス","pronunciation":"デス"}]
*    │     └─ PunctuationNode: "。" (3:29-3:30, 32-33) [data={"word_id":2612880,"word_type":"KNOWN","word_position":4,"surface_form":"。","pos":"記号","pos_detail_1":"句点","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"。","reading":"。","pronunciation":"。"}]
*    ├─ SentenceNode[1] (3:30-3:38, 33-41)
*    │  └─ WordNode[5] (3:30-3:38, 33-41)
*    │     ├─ TextNode: "これ" (3:30-3:32, 33-35) [data={"word_id":956570,"word_type":"KNOWN","word_position":1,"surface_form":"これ","pos":"名詞","pos_detail_1":"代名詞","pos_detail_2":"一般","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"これ","reading":"コレ","pronunciation":"コレ"}]
*    │     ├─ TextNode: "は" (3:32-3:33, 35-36) [data={"word_id":2595270,"word_type":"KNOWN","word_position":3,"surface_form":"は","pos":"助詞","pos_detail_1":"係助詞","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"は","reading":"ハ","pronunciation":"ワ"}]
*    │     ├─ TextNode: "後段" (3:33-3:35, 36-38) [data={"word_id":613140,"word_type":"KNOWN","word_position":4,"surface_form":"後段","pos":"名詞","pos_detail_1":"一般","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"後段","reading":"コウダン","pronunciation":"コーダン"}]
*    │     ├─ TextNode: "です" (3:35-3:37, 38-40) [data={"word_id":305080,"word_type":"KNOWN","word_position":6,"surface_form":"です","pos":"助動詞","pos_detail_1":"*","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"特殊・デス","conjugated_form":"基本形","basic_form":"です","reading":"デス","pronunciation":"デス"}]
*    │     └─ PunctuationNode: "。" (3:37-3:38, 40-41) [data={"word_id":2612880,"word_type":"KNOWN","word_position":8,"surface_form":"。","pos":"記号","pos_detail_1":"句点","pos_detail_2":"*","pos_detail_3":"*","conjugated_type":"*","conjugated_form":"*","basic_form":"。","reading":"。","pronunciation":"。"}]
*    └─ WhiteSpaceNode: "\n" (3:38-3:39, 43-44)
* === doc ===
* タイトル
* 
* 1 これは前段です。これは中段（２文の場合は後段。）です。これは後段です。
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
