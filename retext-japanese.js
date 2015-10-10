(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.retextJapanese = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"kuromoji":11,"parse-japanese-basic":24,"unist-util-visit":27}],2:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ViterbiBuilder = require("./viterbi/ViterbiBuilder.js");
var ViterbiSearcher = require("./viterbi/ViterbiSearcher.js");
var IpadicFormatter = require("./util/IpadicFormatter.js");

var PUNCTUATION = /、|。/;


/**
 * Tokenizer
 * @param {DynamicDictionaries} dic Dictionaries used by this tokenizer
 * @constructor
 */
function Tokenizer(dic) {
    this.token_info_dictionary = dic.token_info_dictionary;
    this.unknown_dictionary = dic.unknown_dictionary;
    this.viterbi_builder = new ViterbiBuilder(dic);
    this.viterbi_searcher = new ViterbiSearcher(dic.connection_costs);
    this.formatter = new IpadicFormatter();  // TODO Other dictionaries
}

/**
 * Split into sentence by punctuation
 * @param {string} input Input text
 * @returns {Array.<string>} Sentences end with punctuation
 */
Tokenizer.splitByPunctuation = function (input) {
    var sentences = [];
    var tail = input;
    while (true) {
        if (tail === "") {
            break;
        }
        var index = tail.search(PUNCTUATION);
        if (index < 0) {
            sentences.push(tail);
            break;
        }
        sentences.push(tail.substring(0, index + 1));
        tail = tail.substring(index + 1);
    }
    return sentences;
};

/**
 * Tokenize text
 * @param {string} text Input text to analyze
 * @returns {Array} Tokens
 */
Tokenizer.prototype.tokenize = function (text) {
    var sentences = Tokenizer.splitByPunctuation(text);
    var tokens = [];
    for (var i = 0; i < sentences.length; i++) {
        var sentence = sentences[i];
        this.tokenizeForSentence(sentence, tokens);
    }
    return tokens;
};

Tokenizer.prototype.tokenizeForSentence = function (sentence, tokens) {
    if (tokens == null) {
        tokens = [];
    }
    var lattice = this.getLattice(sentence);
    var best_path = this.viterbi_searcher.search(lattice);

    for (var j = 0; j < best_path.length; j++) {
        var node = best_path[j];

        var token, features, features_line;
        if (node.type === "KNOWN") {
            features_line = this.token_info_dictionary.getFeatures(node.name);
            if (features_line == null) {
                features = [];
            } else {
                features = features_line.split(",");
            }
            token = this.formatter.formatEntry(node.name, node.start_pos, node.type, features);
        } else if (node.type === "UNKNOWN") {
            // Unknown word
            features_line = this.unknown_dictionary.getFeatures(node.name);
            if (features_line == null) {
                features = [];
            } else {
                features = features_line.split(",");
            }
            token = this.formatter.formatUnknownEntry(node.name, node.start_pos, node.type, features, node.surface_form);
        } else {
            // TODO User dictionary
            token = this.formatter.formatEntry(node.name, node.start_pos, node.type, []);
        }

        tokens.push(token);
    }

    return tokens;
};

/**
 * Build word lattice
 * @param {string} text Input text to analyze
 * @returns {ViterbiLattice} Word lattice
 */
Tokenizer.prototype.getLattice = function (text) {
    return this.viterbi_builder.build(text);
};


module.exports = Tokenizer;

},{"./util/IpadicFormatter.js":15,"./viterbi/ViterbiBuilder.js":17,"./viterbi/ViterbiSearcher.js":20}],3:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var Tokenizer = require("./Tokenizer.js");
var DictionaryLoader = require("./loader/DictionaryLoader.js");


/**
 * TokenizerBuilder create Tokenizer instance.
 * @param {Object} option JSON object which have key-value pairs settings
 * @param {string} option.dicPath Dictionary directory path (or URL using in browser)
 * @constructor
 */
function TokenizerBuilder(option) {
    if (option.dicPath != null) {
        this.dic_path = option.dicPath;
    } else {
        this.dic_path = "dict/";
    }
}

/**
 * Build Tokenizer instance by asynchronous manner
 * @param {TokenizerBuilder~onLoad} callback Callback function
 */
TokenizerBuilder.prototype.build = function (callback) {
    var loader = DictionaryLoader.getLoader(this.dic_path);
    loader.load(function (err, dic) {
        callback(err, new Tokenizer(dic));
    });
};

/**
 * Callback used by build
 * @callback TokenizerBuilder~onLoad
 * @param {Object} err Error object
 * @param {Tokenizer} tokenizer Prepared Tokenizer
 */



module.exports = TokenizerBuilder;

},{"./Tokenizer.js":2,"./loader/DictionaryLoader.js":12}],4:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * CharacterClass
 * @param {number} class_id
 * @param {string} class_name
 * @param {boolean} is_always_invoke
 * @param {boolean} is_grouping
 * @param {number} max_length
 * @constructor
 */
function CharacterClass(class_id, class_name, is_always_invoke, is_grouping, max_length) {
    this.class_id = class_id;
    this.class_name = class_name;
    this.is_always_invoke = is_always_invoke;
    this.is_grouping = is_grouping;
    this.max_length = max_length;
}


module.exports = CharacterClass;

},{}],5:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var InvokeDefinitionMap = require("./InvokeDefinitionMap.js");
var CharacterClass = require("./CharacterClass.js");
var SurrogateAwareString = require("../util/SurrogateAwareString.js");

var DEFAULT_CATEGORY = "DEFAULT";
var RETURN_PATTERN = /\r|\n|\r\n/;
var CATEGORY_DEF_PATTERN = /^(\w+)\s+(\d)\s+(\d)\s+(\d)/;
var CATEGORY_MAPPING_PATTERN = /^(0x[0-9A-F]{4})(?:\s+([^#\s]+))(?:\s+([^#\s]+))*/;
var RANGE_CATEGORY_MAPPING_PATTERN = /^(0x[0-9A-F]{4})\.\.(0x[0-9A-F]{4})(?:\s+([^#\s]+))(?:\s+([^#\s]+))*/;


/**
 * CharacterDefinition represents char.def file and
 * defines behavior of unknown word processing
 * @constructor
 */
function CharacterDefinition() {
    this.character_category_map = new Uint8Array(65536);  // for all UCS2 code points
    this.compatible_category_map = new Uint32Array(65536);  // for all UCS2 code points
    this.invoke_definition_map = null;

}

/**
 * Load CharacterDefinition
 * @param {Uint8Array} cat_map_buffer
 * @param {Uint32Array} compat_cat_map_buffer
 * @param {InvokeDefinitionMap} invoke_def_buffer
 * @returns {CharacterDefinition}
 */
CharacterDefinition.load = function (cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer) {
    var char_def = new CharacterDefinition();
    char_def.character_category_map = cat_map_buffer;
    char_def.compatible_category_map = compat_cat_map_buffer;
    char_def.invoke_definition_map = InvokeDefinitionMap.load(invoke_def_buffer);
    return char_def;
};

/**
 * Factory method of CharacterDefinition
 * @param {string} text Contents of char.def
 */
CharacterDefinition.readCharacterDefinition = function (text) {
    var lines = text.split(RETURN_PATTERN);
    var line;
    var character_category_definition = [];
    var category_mapping = [];


    for (var i = 0; i < lines.length; i++) {
        line = lines[i];
        if (line == null) {
            continue;
        }
        var parsed_category_def = CATEGORY_DEF_PATTERN.exec(line);
        if (parsed_category_def != null) {
            var class_id = character_category_definition.length;
            var char_class = CharacterDefinition.parseCharCategory(class_id, parsed_category_def);
            if (char_class == null) {
                continue;
            }
            character_category_definition.push(char_class);
            continue;
        }
        var parsed_category_mapping = CATEGORY_MAPPING_PATTERN.exec(line);
        if (parsed_category_mapping != null) {
            var mapping = CharacterDefinition.parseCategoryMapping(parsed_category_mapping);
            category_mapping.push(mapping);
        }
        var parsed_range_category_mapping = RANGE_CATEGORY_MAPPING_PATTERN.exec(line);
        if (parsed_range_category_mapping != null) {
            var range_mapping = CharacterDefinition.parseRangeCategoryMapping(parsed_range_category_mapping);
            category_mapping.push(range_mapping);
        }
    }

    // TODO If DEFAULT category does not exist, throw error

    var char_def = new CharacterDefinition();
    char_def.invoke_definition_map = new InvokeDefinitionMap();
    char_def.invoke_definition_map.init(character_category_definition);
    char_def.initCategoryMappings(category_mapping);

    return char_def;
};

CharacterDefinition.parseCharCategory = function (class_id, parsed_category_def) {
    var category = parsed_category_def[1];
    var invoke = parseInt(parsed_category_def[2]);
    var grouping = parseInt(parsed_category_def[3]);
    var max_length = parseInt(parsed_category_def[4]);
    if (!isFinite(invoke) || (invoke !== 0 && invoke !== 1)) {
        console.log("char.def parse error. INVOKE is 0 or 1 in:" + invoke);
        return null;
    }
    if (!isFinite(grouping) || (grouping !== 0 && grouping !== 1)) {
        console.log("char.def parse error. GROUP is 0 or 1 in:" + grouping);
        return null;
    }
    if (!isFinite(max_length) || max_length < 0) {
        console.log("char.def parse error. LENGTH is 1 to n:" + max_length);
        return null;
    }
    var is_invoke = (invoke === 1);
    var is_grouping = (grouping === 1);

    return new CharacterClass(class_id, category, is_invoke, is_grouping, max_length);
};

CharacterDefinition.parseCategoryMapping = function (parsed_category_mapping) {
    var start = parseInt(parsed_category_mapping[1]);
    var default_category = parsed_category_mapping[2];
    var compatible_category = (3 < parsed_category_mapping.length) ? parsed_category_mapping.slice(3) : [];
    if (!isFinite(start) || start < 0 || start > 0xFFFF) {
        console.log("char.def parse error. CODE is invalid:" + start);
    }
    return { start: start, default: default_category, compatible: compatible_category};
};

CharacterDefinition.parseRangeCategoryMapping = function (parsed_category_mapping) {
    var start = parseInt(parsed_category_mapping[1]);
    var end = parseInt(parsed_category_mapping[2]);
    var default_category = parsed_category_mapping[3];
    var compatible_category = (4 < parsed_category_mapping.length) ? parsed_category_mapping.slice(4) : [];
    if (!isFinite(start) || start < 0 || start > 0xFFFF) {
        console.log("char.def parse error. CODE is invalid:" + start);
    }
    if (!isFinite(end) || end < 0 || end > 0xFFFF) {
        console.log("char.def parse error. CODE is invalid:" + end);
    }
    return { start: start, end: end, default: default_category, compatible: compatible_category};
};

/**
 * Initializing method
 * @param {Array} category_mapping Array of category mapping
 */
CharacterDefinition.prototype.initCategoryMappings = function (category_mapping) {
    // Initialize map by DEFAULT class
    var code_point;
    if (category_mapping != null) {
        for (var i = 0; i < category_mapping.length; i++) {
            var mapping = category_mapping[i];
            var end = mapping.end || mapping.start;
            for (code_point = mapping.start; code_point <= end; code_point++) {

                // Default Category class ID
                this.character_category_map[code_point] = this.invoke_definition_map.lookup(mapping.default);

                for (var j = 0; j < mapping.compatible.length; j++) {
                    var bitset = this.compatible_category_map[code_point];
                    var compatible_category = mapping.compatible[j];
                    if (compatible_category == null) {
                        continue;
                    }
                    var class_id = this.invoke_definition_map.lookup(compatible_category);  // Default Category
                    if (class_id == null) {
                        continue;
                    }
                    var class_id_bit = 1 << class_id;
                    bitset = bitset | class_id_bit;  // Set a bit of class ID 例えば、class_idが3のとき、3ビット目に1を立てる
                    this.compatible_category_map[code_point] = bitset;
                }
            }
        }
    }
    var default_id = this.invoke_definition_map.lookup(DEFAULT_CATEGORY);
    if (default_id == null) {
        return;
    }
    for (code_point = 0; code_point < this.character_category_map.length; code_point++) {
        // 他に何のクラスも定義されていなかったときだけ DEFAULT
        if (this.character_category_map[code_point] === 0) {
            // DEFAULT class ID に対応するビットだけ1を立てる
            this.character_category_map[code_point] = 1 << default_id;
        }
    }
};

/**
 * Lookup compatible categories for a character (not included 1st category)
 * @param {string} ch UCS2 character (just 1st character is effective)
 * @returns {Array.<CharacterClass>} character classes
 */
CharacterDefinition.prototype.lookupCompatibleCategory = function (ch) {
    var classes = [];

    /*
     if (SurrogateAwareString.isSurrogatePair(ch)) {
     // Surrogate pair character codes can not be defined by char.def
     return classes;
     }*/
    var code = ch.charCodeAt(0);
    var integer;
    if (code < this.compatible_category_map.length) {
        integer = this.compatible_category_map[code];  // Bitset
    }

    if (integer == null || integer === 0) {
        return classes;
    }

    for (var bit = 0; bit < 32; bit++) {  // Treat "bit" as a class ID
        if (((integer << (31 - bit)) >>> 31) === 1) {
            var character_class = this.invoke_definition_map.getCharacterClass(bit);
            if (character_class == null) {
                continue;
            }
            classes.push(character_class);
        }
    }
    return classes;
};


/**
 * Lookup category for a character
 * @param {string} ch UCS2 character (just 1st character is effective)
 * @returns {CharacterClass} character class
 */
CharacterDefinition.prototype.lookup = function (ch) {

    var class_id;

    var code = ch.charCodeAt(0);
    if (SurrogateAwareString.isSurrogatePair(ch)) {
        // Surrogate pair character codes can not be defined by char.def, so set DEFAULT category
        class_id = this.invoke_definition_map.lookup(DEFAULT_CATEGORY);
    } else if (code < this.character_category_map.length) {
        class_id = this.character_category_map[code];  // Read as integer value
    }

    if (class_id == null) {
        class_id = this.invoke_definition_map.lookup(DEFAULT_CATEGORY);
    }

    return this.invoke_definition_map.getCharacterClass(class_id);
};


module.exports = CharacterDefinition;

},{"../util/SurrogateAwareString.js":16,"./CharacterClass.js":4,"./InvokeDefinitionMap.js":8}],6:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * Connection costs matrix from cc.dat file.
 * 2 dimension matrix [forward_id][backward_id] -> cost
 * @param {number} initial_size Initial size of buffer
 * @constructor
 */
function ConnectionCosts(initial_size) {
    this.dimension = 0;
    this.buffer = new Int16Array(initial_size);

    // 1 dimensional array in original implementation
    // this.costs = [];
}

ConnectionCosts.prototype.put = function (forward_id, backward_id, cost) {
    if (!isFinite(forward_id)) {
        console.log(forward_id + " " + backward_id + " " + cost);
    }
    var index = forward_id * this.dimension + backward_id;
    if (this.buffer.length < index + 1) {
        throw "ConnectionCosts buffer overflow";
    }
    this.buffer[index] = cost;

    // if (this.costs[forward_id] == null) {
    //     this.costs[forward_id] = [];
    // }
    // this.costs[forward_id][backward_id] = cost;
};

ConnectionCosts.prototype.get = function (forward_id, backward_id) {
    var index = forward_id * this.dimension + backward_id;
    if (this.buffer.length < index + 1) {
        throw "ConnectionCosts buffer overflow";
    }
    return this.buffer[index];

    // if (this.costs[forward_id] == null) {
    //     return null;
    // }
    // return this.costs[forward_id][backward_id];
};

ConnectionCosts.prototype.loadConnectionCosts = function (connection_costs_buffer) {
    // TODO Read dimension from connection_costs_buffer
    this.dimension = 1316;
    this.buffer = connection_costs_buffer;
};

/**
 * Parse and build ConnectionCosts from contents of "matrix.def"
 * @param {string} matrix_text Text contents of "matrix.def"
 * @returns {ConnectionCosts}
 */
ConnectionCosts.build = function (matrix_text) {
    var rows = matrix_text.split(/\n/).map(function (row) {
        return row.split(" ");
    });

    // Row 1
    // var forward_size = rows[0][0];
    var backward_size = rows[0][1];

    // id and cost must be a short value
    var costs = new ConnectionCosts(backward_size * backward_size);
    costs.dimension = backward_size;

    for (var i = 1; i < rows.length; i++) {
        if (rows[i].length < 3) {
            continue;
        }

        var forward_id = parseInt(rows[i][0]);
        var backward_id = parseInt(rows[i][1]);
        var cost = parseInt(rows[i][2]);

        // Assertion
        if (forward_id < 0 || backward_id < 0) {
            console.log("Error in:" + rows[i]);
        }

        costs.put(forward_id, backward_id, cost);
    }

    return costs;
};


module.exports = ConnectionCosts;

},{}],7:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var doublearray = require("doublearray");

var TokenInfoDictionary = require("./TokenInfoDictionary.js");
var ConnectionCosts = require("./ConnectionCosts.js");
var UnknownDictionary = require("./UnknownDictionary.js");


/**
 * Dictionaries container for Tokenizer
 * @param {DoubleArray} trie
 * @param {TokenInfoDictionary} token_info_dictionary
 * @param {ConnectionCosts} connection_costs
 * @param {UnknownDictionary} unknown_dictionary
 * @constructor
 */
function DynamicDictionaries(trie, token_info_dictionary, connection_costs, unknown_dictionary) {
    if (trie != null) {
        this.trie = trie;
    } else {
        this.trie = doublearray.builder(0).build([
            {k: "", v: 1}
        ]);
    }
    if (token_info_dictionary != null) {
        this.token_info_dictionary = token_info_dictionary;
    } else {
        this.token_info_dictionary = new TokenInfoDictionary();
    }
    if (connection_costs != null) {
        this.connection_costs = connection_costs;
    } else {
        // backward_size * backward_size
        this.connection_costs = new ConnectionCosts(0);
    }
    if (unknown_dictionary != null) {
        this.unknown_dictionary = unknown_dictionary;
    } else {
        this.unknown_dictionary = new UnknownDictionary();
    }
}

// from base.dat & check.dat
DynamicDictionaries.prototype.loadTrie = function (base_buffer, check_buffer) {
    this.trie = doublearray.load(base_buffer, check_buffer);
    return this;
};

DynamicDictionaries.prototype.loadTokenInfoDictionaries = function (token_info_buffer, pos_buffer, target_map_buffer) {
    this.token_info_dictionary.loadDictionary(token_info_buffer);
    this.token_info_dictionary.loadPosVector(pos_buffer);
    this.token_info_dictionary.loadTargetMap(target_map_buffer);
    return this;
};

DynamicDictionaries.prototype.loadConnectionCosts = function (cc_buffer) {
    this.connection_costs.loadConnectionCosts(cc_buffer);
    return this;
};

DynamicDictionaries.prototype.loadUnknownDictionaries = function (unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer) {
    this.unknown_dictionary.loadUnknownDictionaries(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
    return this;
};


module.exports = DynamicDictionaries;

},{"./ConnectionCosts.js":6,"./TokenInfoDictionary.js":9,"./UnknownDictionary.js":10,"doublearray":22}],8:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ByteBuffer = require("../util/ByteBuffer.js");
var CharacterClass = require("./CharacterClass.js");


/**
 * InvokeDefinitionMap represents invoke definition a part of char.def
 * @constructor
 */
function InvokeDefinitionMap() {
    this.map = [];
    this.lookup_table = {};  // Just for building dictionary
}

/**
 * Load InvokeDefinitionMap from buffer
 * @param {Uint8Array} invoke_def_buffer
 * @returns {InvokeDefinitionMap}
 */
InvokeDefinitionMap.load = function (invoke_def_buffer) {
    var invoke_def = new InvokeDefinitionMap();
    var character_category_definition = [];

    var buffer = new ByteBuffer(invoke_def_buffer);
    while (buffer.position + 1 < buffer.size()) {
        var class_id = character_category_definition.length;
        var is_always_invoke = buffer.get();
        var is_grouping = buffer.get();
        var max_length = buffer.getInt();
        var class_name = buffer.getString();
        character_category_definition.push(new CharacterClass(class_id, class_name, is_always_invoke, is_grouping, max_length));
    }

    invoke_def.init(character_category_definition);

    return invoke_def;
};

/**
 * Initializing method
 * @param {Array.<CharacterClass>} character_category_definition Array of CharacterClass
 */
InvokeDefinitionMap.prototype.init = function (character_category_definition) {
    if (character_category_definition == null) {
        return;
    }
    for (var i = 0; i < character_category_definition.length; i++) {
        var character_class = character_category_definition[i];
        this.map[i] = character_class;
        this.lookup_table[character_class.class_name] = i;
    }
};

/**
 * Get class information by class ID
 * @param {number} class_id
 * @returns {CharacterClass}
 */
InvokeDefinitionMap.prototype.getCharacterClass = function (class_id) {
    return this.map[class_id];
};

/**
 * For building character definition dictionary
 * @param {string} class_name character
 * @returns {number} class_id
 */
InvokeDefinitionMap.prototype.lookup = function (class_name) {
    var class_id = this.lookup_table[class_name];
    if (class_id == null) {
        return null;
    }
    return class_id;
};

/**
 * Transform from map to binary buffer
 * @returns {Uint8Array}
 */
InvokeDefinitionMap.prototype.toBuffer = function () {
    var buffer = new ByteBuffer();
    for (var i = 0; i < this.map.length; i++) {
        var char_class = this.map[i];
        buffer.put(char_class.is_always_invoke);
        buffer.put(char_class.is_grouping);
        buffer.putInt(char_class.max_length);
        buffer.putString(char_class.class_name);
    }
    buffer.shrink();
    return buffer.buffer;
};


module.exports = InvokeDefinitionMap;

},{"../util/ByteBuffer.js":13,"./CharacterClass.js":4}],9:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ByteBuffer = require("../util/ByteBuffer.js");


/**
 * TokenInfoDictionary
 * @constructor
 */
function TokenInfoDictionary() {
    this.dictionary = new ByteBuffer(10 * 1024 * 1024);
    this.target_map = {};  // trie_id (of surface form) -> token_info_id (of token)
    this.pos_buffer = new ByteBuffer(10 * 1024 * 1024);
}

// left_id right_id word_cost ...
// ^ this position is token_info_id
TokenInfoDictionary.prototype.buildDictionary = function (entries) {
    var dictionary_entries = {};  // using as hashmap, string -> string (word_id -> surface_form) to build dictionary

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        if (entry.length < 4) {
            continue;
        }

        var surface_form = entry[0];
        var left_id = entry[1];
        var right_id = entry[2];
        var word_cost = entry[3];
        var feature = entry.slice(4).join(",");  // TODO Optimize

        // Assertion
        if (!isFinite(left_id) || !isFinite(right_id) || !isFinite(word_cost)) {
            console.log(entry);
        }

        var token_info_id = this.put(left_id, right_id, word_cost, surface_form, feature);
        dictionary_entries[token_info_id] = surface_form;
    }

    // Remove last unused area
    this.dictionary.shrink();
    this.pos_buffer.shrink();

    return dictionary_entries;
};

TokenInfoDictionary.prototype.put = function (left_id, right_id, word_cost, surface_form, feature) {
    var token_info_id = this.dictionary.position;
    var pos_id = this.pos_buffer.position;

    this.dictionary.putShort(left_id);
    this.dictionary.putShort(right_id);
    this.dictionary.putShort(word_cost);
    this.dictionary.putInt(pos_id);
    this.pos_buffer.putString(surface_form + "," + feature);

    return token_info_id;
};

TokenInfoDictionary.prototype.addMapping = function (source, target) {
    var mapping = this.target_map[source];
    if (mapping == null) {
        mapping = [];
    }
    mapping.push(target);

    this.target_map[source] = mapping;
};

TokenInfoDictionary.prototype.targetMapToBuffer = function () {
    var buffer = new ByteBuffer();
    var map_keys_size = Object.keys(this.target_map).length;
    buffer.putInt(map_keys_size);
    for (var key in this.target_map) {
        var values = this.target_map[key];  // Array
        var map_values_size = values.length;
        buffer.putInt(parseInt(key));
        buffer.putInt(map_values_size);
        for (var i = 0; i < values.length; i++) {
            buffer.putInt(values[i]);
        }
    }
    return buffer.shrink();  // Shrink-ed Typed Array
};

// from tid.dat
TokenInfoDictionary.prototype.loadDictionary = function (array_buffer) {
    this.dictionary = new ByteBuffer(array_buffer);
    return this;
};

// from tid_pos.dat
TokenInfoDictionary.prototype.loadPosVector = function (array_buffer) {
    this.pos_buffer = new ByteBuffer(array_buffer);
    return this;
};

// from tid_map.dat
TokenInfoDictionary.prototype.loadTargetMap = function (array_buffer) {
    var buffer = new ByteBuffer(array_buffer);
    buffer.position = 0;
    this.target_map = {};
    buffer.readInt();  // map_keys_size
    while (true) {
        if (buffer.buffer.length < buffer.position + 1) {
            break;
        }
        var key = buffer.readInt();
        var map_values_size = buffer.readInt();
        for (var i = 0; i < map_values_size; i++) {
            var value = buffer.readInt();
            this.addMapping(key, value);
        }
    }
    return this;
};

/**
 * Look up features in the dictionary
 * @param {string} token_info_id_str Word ID to look up
 * @returns {string} Features string concatenated by ","
 */
TokenInfoDictionary.prototype.getFeatures = function (token_info_id_str) {
    var token_info_id = parseInt(token_info_id_str);
    if (isNaN(token_info_id)) {
        // TODO throw error
        return "";
    }
    var pos_id = this.dictionary.getInt(token_info_id + 6);
    return this.pos_buffer.getString(pos_id);
};


module.exports = TokenInfoDictionary;

},{"../util/ByteBuffer.js":13}],10:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var TokenInfoDictionary = require("./TokenInfoDictionary.js");
var CharacterDefinition = require("./CharacterDefinition.js");
var ByteBuffer = require("../util/ByteBuffer.js");


/**
 * UnknownDictionary
 * @constructor
 */
function UnknownDictionary() {
    // TokenInfoDictionary.apply(this);  // execute super class constructor
    this.dictionary = new ByteBuffer(10 * 1024 * 1024);
    this.target_map = {};  // class_id (of CharacterClass) -> token_info_id (of unknown class)
    this.pos_buffer = new ByteBuffer(10 * 1024 * 1024);
    this.character_definition = null;
}

// Inherit from TokenInfoDictionary as a super class
UnknownDictionary.prototype = Object.create(TokenInfoDictionary.prototype);
// UnknownDictionary.prototype.constructor = UnknownDictionary;

UnknownDictionary.prototype.characterDefinition = function (character_definition) {
    this.character_definition = character_definition;
    return this;
};

UnknownDictionary.prototype.lookup = function (ch) {
    return this.character_definition.lookup(ch);
};

UnknownDictionary.prototype.lookupCompatibleCategory = function (ch) {
    return this.character_definition.lookupCompatibleCategory(ch);
};

UnknownDictionary.prototype.loadUnknownDictionaries = function (unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer) {
    this.loadDictionary(unk_buffer);
    this.loadPosVector(unk_pos_buffer);
    this.loadTargetMap(unk_map_buffer);
    this.character_definition = CharacterDefinition.load(cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
};


module.exports = UnknownDictionary;

},{"../util/ByteBuffer.js":13,"./CharacterDefinition.js":5,"./TokenInfoDictionary.js":9}],11:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var TokenizerBuilder = require("./TokenizerBuilder.js");
var DictionaryBuilder = require("./util/DictionaryBuilder.js");


// Public methods
var kuromoji = {
    builder: function (option) {
        return new TokenizerBuilder(option);
    },
    dictionaryBuilder: function () {
        return new DictionaryBuilder();
    }
};

if (typeof window === "undefined") {
    // In node
    module.exports = kuromoji;
} else {
    // In browser
    window.kuromoji = kuromoji;
}

},{"./TokenizerBuilder.js":3,"./util/DictionaryBuilder.js":14}],12:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var async = require("async");
var zlib = require("zlibjs/bin/gunzip.min.js");

var DynamicDictionaries = require("../dict/DynamicDictionaries.js");


var fs;
var node_zlib;
var is_browser;

if (typeof window === "undefined") {
    // In node
    fs = require("fs");
    node_zlib = require("zlib");
    is_browser = false;
} else {
    is_browser = true;
}


/**
 * DictionaryLoader base constructor
 * @param {string} dic_path Dictionary path
 * @constructor
 */
function DictionaryLoader(dic_path) {
    this.dic = new DynamicDictionaries();
    this.dic_path = dic_path;
}

/**
 * Factory method for DictionaryLoader
 * @param {string} dic_path Dictionary path
 */
DictionaryLoader.getLoader = function (dic_path) {
    if (is_browser) {
        // In browser
        return new BrowserDictionaryLoader(dic_path);
    } else {
        // In node
        return new NodeDictionaryLoader(dic_path);
    }
};

/**
 * Load dictionary files
 * @param {DictionaryLoader~onLoad} load_callback Callback function called after loaded
 */
DictionaryLoader.prototype.load = function (load_callback) {
    var dic = this.dic;
    var dic_path = this.dic_path;
    var loadArrayBuffer = this.loadArrayBuffer;

    async.parallel([
        // Trie
        function (callback) {
            async.map([ "base.dat.gz", "check.dat.gz" ], function (filename, _callback) {
                loadArrayBuffer(dic_path + filename, function (err, buffer) {
                    _callback(null, buffer);
                });
            }, function (err, buffers) {
                var base_buffer = new Int32Array(buffers[0]);
                var check_buffer = new Int32Array(buffers[1]);

                dic.loadTrie(base_buffer, check_buffer);
                callback(null);
            });
        },
        // Token info dictionaries
        function (callback) {
            async.map([ "tid.dat.gz", "tid_pos.dat.gz", "tid_map.dat.gz" ], function (filename, _callback) {
                loadArrayBuffer(dic_path + filename, function (err, buffer) {
                    _callback(null, buffer);
                });
            }, function (err, buffers) {
                var token_info_buffer = new Uint8Array(buffers[0]);
                var pos_buffer = new Uint8Array(buffers[1]);
                var target_map_buffer = new Uint8Array(buffers[2]);

                dic.loadTokenInfoDictionaries(token_info_buffer, pos_buffer, target_map_buffer);
                callback(null);
            });
        },
        // Connection cost matrix
        function (callback) {
            loadArrayBuffer(dic_path + "cc.dat.gz", function (err, buffer) {
                var cc_buffer = new Int16Array(buffer);
                dic.loadConnectionCosts(cc_buffer);
                callback(null);
            });
        },
        // Unknown dictionaries
        function (callback) {
            async.map([ "unk.dat.gz", "unk_pos.dat.gz", "unk_map.dat.gz", "unk_char.dat.gz", "unk_compat.dat.gz", "unk_invoke.dat.gz" ], function (filename, _callback) {
                loadArrayBuffer(dic_path + filename, function (err, buffer) {
                    _callback(null, buffer);
                });
            }, function (err, buffers) {
                var unk_buffer = new Uint8Array(buffers[0]);
                var unk_pos_buffer = new Uint8Array(buffers[1]);
                var unk_map_buffer = new Uint8Array(buffers[2]);
                var cat_map_buffer = new Uint8Array(buffers[3]);
                var compat_cat_map_buffer = new Uint32Array(buffers[4]);
                var invoke_def_buffer = new Uint8Array(buffers[5]);

                dic.loadUnknownDictionaries(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
                // dic.loadUnknownDictionaries(char_buffer, unk_buffer);
                callback(null);
            });
        }
    ], function (err) {
        load_callback(err, dic);
    });
};


/**
 * Callback
 * @callback DictionaryLoader~onLoad
 * @param {Object} err Error object
 * @param {DynamicDictionaries} dic Loaded dictionary
 */


/**
 * BrowserDictionaryLoader inherits DictionaryLoader, using jQuery XHR for download
 * @param {string} dic_path Dictionary path
 * @constructor
 */
function BrowserDictionaryLoader(dic_path) {
    DictionaryLoader.apply(this, [ dic_path ]);
}
BrowserDictionaryLoader.prototype = Object.create(DictionaryLoader.prototype);
// BrowserDictionaryLoader.prototype.constructor = BrowserDictionaryLoader;

/**
 * Utility function to load gzipped dictionary
 * @param {string} url Dictionary URL
 * @param {BrowserDictionaryLoader~onLoad} callback Callback function
 */
BrowserDictionaryLoader.prototype.loadArrayBuffer = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function () {
        if (this.status !== 200) {
            callback(xhr.statusText, null);
        }
        var arraybuffer = this.response;

        var gz = new zlib.Zlib.Gunzip(new Uint8Array(arraybuffer));
        var typed_array = gz.decompress();
        callback(null, typed_array.buffer);
    };
    xhr.onerror = function (err) {
        callback(err, null);
    };
    xhr.send();
};

/**
 * Callback
 * @callback BrowserDictionaryLoader~onLoad
 * @param {Object} err Error object
 * @param {Uint8Array} buffer Loaded buffer
 */


/**
 * NodeDictionaryLoader inherits DictionaryLoader
 * @param {string} dic_path Dictionary path
 * @constructor
 */
function NodeDictionaryLoader(dic_path) {
    DictionaryLoader.apply(this, [ dic_path ]);
}
NodeDictionaryLoader.prototype = Object.create(DictionaryLoader.prototype);
// NodeDictionaryLoader.prototype.constructor = NodeDictionaryLoader;

/**
 * Utility function
 * @param {string} file Dictionary file path
 * @param {NodeDictionaryLoader~onLoad} callback Callback function
 */
NodeDictionaryLoader.prototype.loadArrayBuffer = function (file, callback) {
    fs.readFile(file, function (err, buffer) {
        node_zlib.gunzip(buffer, function (err2, decompressed) {
            var typed_array = new Uint8Array(decompressed);
            callback(null, typed_array.buffer);
        });
    });
};

/**
 * @callback NodeDictionaryLoader~onLoad
 * @param {Object} err Error object
 * @param {Uint8Array} buffer Loaded buffer
 */



module.exports = DictionaryLoader;

},{"../dict/DynamicDictionaries.js":7,"async":21,"fs":undefined,"zlib":undefined,"zlibjs/bin/gunzip.min.js":23}],13:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * Convert String (UTF-16) to UTF-8 ArrayBuffer
 *
 * @param {String} str UTF-16 string to convert
 * @return {Uint8Array} Byte sequence encoded by UTF-8
 */
var stringToUtf8Bytes = function (str) {

    // Max size of 1 character is 4 bytes
    var bytes = new Uint8Array(str.length * 4);

    var i = 0, j = 0;

    while (i < str.length) {
        var unicode_code;

        var utf16_code = str.charCodeAt(i++);
        if (utf16_code >= 0xD800 && utf16_code <= 0xDBFF) {
            // surrogate pair
            var upper = utf16_code;           // high surrogate
            var lower = str.charCodeAt(i++);  // low surrogate

            if (lower >= 0xDC00 && lower <= 0xDFFF) {
                unicode_code =
                    (upper - 0xD800) * (1 << 10) + (1 << 16) +
                    (lower - 0xDC00);
            } else {
                // malformed surrogate pair
                return null;
            }
        } else {
            // not surrogate code
            unicode_code = utf16_code;
        }

        if (unicode_code < 0x80) {
            // 1-byte
            bytes[j++] = unicode_code;

        } else if (unicode_code < (1 << 11)) {
            // 2-byte
            bytes[j++] = (unicode_code >>> 6) | 0xC0;
            bytes[j++] = (unicode_code & 0x3F) | 0x80;

        } else if (unicode_code < (1 << 16)) {
            // 3-byte
            bytes[j++] = (unicode_code >>> 12) | 0xE0;
            bytes[j++] = ((unicode_code >> 6) & 0x3f) | 0x80;
            bytes[j++] = (unicode_code & 0x3F) | 0x80;

        } else if (unicode_code < (1 << 21)) {
            // 4-byte
            bytes[j++] = (unicode_code >>> 18) | 0xF0;
            bytes[j++] = ((unicode_code >> 12) & 0x3F) | 0x80;
            bytes[j++] = ((unicode_code >> 6) & 0x3F) | 0x80;
            bytes[j++] = (unicode_code & 0x3F) | 0x80;

        } else {
            // malformed UCS4 code
        }
    }

    return bytes.subarray(0, j);
};


/**
 * Convert UTF-8 ArrayBuffer to String (UTF-16)
 *
 * @param {Array} bytes UTF-8 byte sequence to convert
 * @return {String} String encoded by UTF-16
 */
var utf8BytesToString = function (bytes) {

    var str = "";
    var code, b1, b2, b3, b4, upper, lower;
    var i = 0;

    while (i < bytes.length) {

        b1 = bytes[i++];

        if (b1 < 0x80) {
            // 1 byte
            code = b1;
        } else if ((b1 >> 5) === 0x06) {
            // 2 bytes
            b2 = bytes[i++];
            code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
        } else if ((b1 >> 4) === 0x0e) {
            // 3 bytes
            b2 = bytes[i++];
            b3 = bytes[i++];
            code = ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
        } else {
            // 4 bytes
            b2 = bytes[i++];
            b3 = bytes[i++];
            b4 = bytes[i++];
            code = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
        }

        if (code < 0x10000) {
            str += String.fromCharCode(code);
        } else {
            // surrogate pair
            code -= 0x10000;
            upper = (0xD800 | (code >> 10));
            lower = (0xDC00 | (code & 0x3FF));
            str += String.fromCharCode(upper, lower);
        }
    }

    return str;
};


/**
 * Utilities to manipulate byte sequence
 * @param {(number|Uint8Array)} arg Initial size of this buffer (number), or buffer to set (Uint8Array)
 * @constructor
 */
function ByteBuffer(arg) {
    var initial_size;
    if (arg == null) {
        initial_size = 1024 * 1024;
    } else if (typeof arg === "number") {
        initial_size = arg;
    } else if (arg instanceof Uint8Array) {
        this.buffer = arg;
        this.position = 0;  // Overwrite
        return;
    } else {
        // typeof arg -> String
        throw typeof arg + " is invalid parameter type for ByteBuffer constructor";
    }
    // arg is null or number
    this.buffer = new Uint8Array(initial_size);
    this.position = 0;
}

ByteBuffer.prototype.size = function () {
    return this.buffer.length;
};

ByteBuffer.prototype.reallocate = function () {
    var new_array = new Uint8Array(this.buffer.length * 2);
    new_array.set(this.buffer);
    this.buffer = new_array;
};

ByteBuffer.prototype.shrink = function () {
    this.buffer = this.buffer.subarray(0, this.position);
    return this.buffer;
};

ByteBuffer.prototype.put = function (b) {
    if (this.buffer.length < this.position + 1) {
        this.reallocate();
    }
    this.buffer[this.position++] = b;
};

ByteBuffer.prototype.get = function (index) {
    if (index == null) {
        index = this.position;
        this.position += 1;
    }
    if (this.buffer.length < index + 1) {
        return 0;
    }
    return this.buffer[index];
};

// Write short to buffer by little endian
ByteBuffer.prototype.putShort = function (num) {
    if (0xFFFF < num) {
        throw num + " is over short value";
    }
    var lower = (0x00FF & num);
    var upper = (0xFF00 & num) >> 8;
    this.put(lower);
    this.put(upper);
};

// Read short from buffer by little endian
ByteBuffer.prototype.getShort = function (index) {
    if (index == null) {
        index = this.position;
        this.position += 2;
    }
    if (this.buffer.length < index + 2) {
        return 0;
    }
    var lower = this.buffer[index];
    var upper = this.buffer[index + 1];
    return (upper << 8) + lower;
};

// Write integer to buffer by little endian
ByteBuffer.prototype.putInt = function (num) {
    if (0xFFFFFFFF < num) {
        throw num + " is over integer value";
    }
    var b0 = (0x000000FF & num);
    var b1 = (0x0000FF00 & num) >> 8;
    var b2 = (0x00FF0000 & num) >> 16;
    var b3 = (0xFF000000 & num) >> 24;
    this.put(b0);
    this.put(b1);
    this.put(b2);
    this.put(b3);
};

// Read integer from buffer by little endian
ByteBuffer.prototype.getInt = function (index) {
    if (index == null) {
        index = this.position;
        this.position += 4;
    }
    if (this.buffer.length < index + 4) {
        return 0;
    }
    var b0 = this.buffer[index];
    var b1 = this.buffer[index + 1];
    var b2 = this.buffer[index + 2];
    var b3 = this.buffer[index + 3];

    return (b3 << 24) + (b2 << 16) + (b1 << 8) + b0;
};

ByteBuffer.prototype.readInt = function () {
    var pos = this.position;
    this.position += 4;
    return this.getInt(pos);
};

ByteBuffer.prototype.putString = function (str) {
    var bytes = stringToUtf8Bytes(str);
    for (var i = 0; i < bytes.length; i++) {
        this.put(bytes[i]);
    }
    // put null character as terminal character
    this.put(0);
};

ByteBuffer.prototype.getString = function (index) {
    var buf = [],
        ch;
    if (index == null) {
        index = this.position;
    }
    while (true) {
        if (this.buffer.length < index + 1) {
            break;
        }
        ch = this.get(index++);
        if (ch === 0) {
            break;
        } else {
            buf.push(ch);
        }
    }
    this.position = index;
    return utf8BytesToString(buf);
};


module.exports = ByteBuffer;

},{}],14:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var doublearray = require("doublearray");

var DynamicDictionaries = require("../dict/DynamicDictionaries.js");
var TokenInfoDictionary = require("../dict/TokenInfoDictionary.js");
var ConnectionCosts = require("../dict/ConnectionCosts.js");
var UnknownDictionary = require("../dict/UnknownDictionary.js");
var CharacterDefinition = require("../dict/CharacterDefinition.js");  // TODO Remove this dependency


/**
 * Build dictionaries (token info, connection costs)
 *
 * Generates from matrix.def
 * cc.dat: Connection costs
 *
 * Generates from *.csv
 * dat.dat: Double array
 * tid.dat: Token info dictionary
 * tid_map.dat: targetMap
 * tid_pos.dat: posList (part of speech)
 */
function DictionaryBuilder() {
    // Array of entries, each entry in Mecab form
    // (0: surface form, 1: left id, 2: right id, 3: word cost, 4: part of speech id, 5-: other features)
    this.tid_entries = [];
    this.unk_entries = [];

    this.matrix_text = "0 0";
    this.char_text = "";
}

DictionaryBuilder.prototype.addTokenInfoDictionary = function (text) {
    var new_entries = text.split(/\n/).map(function (row) {
        return row.split(",");
    });
    this.tid_entries = this.tid_entries.concat(new_entries);
    return this;
};

/**
 *
 * @param {string} matrix_text Contents of file "matrix.def"
 * @returns {DictionaryBuilder}
 */
DictionaryBuilder.prototype.costMatrix = function (matrix_text) {
    this.matrix_text = matrix_text;
    return this;
};

DictionaryBuilder.prototype.charDef = function (char_text) {
    this.char_text = char_text;
    return this;
};

DictionaryBuilder.prototype.unkDef = function (text) {
    this.unk_entries = text.split(/\n/).map(function (row) {
        return row.split(",");
    });
    return this;
};

DictionaryBuilder.prototype.build = function () {
    var dictionaries = this.buildTokenInfoDictionary();
    var connection_costs = this.buildConnectionCosts();
    var unknown_dictionary = this.buildUnknownDictionary();

    return new DynamicDictionaries(dictionaries.trie, dictionaries.token_info_dictionary, connection_costs, unknown_dictionary);
};

/**
 * Build TokenInfoDictionary
 *
 * @returns {{trie: *, token_info_dictionary: *}}
 */
DictionaryBuilder.prototype.buildTokenInfoDictionary = function () {

    var token_info_dictionary = new TokenInfoDictionary();

    // using as hashmap, string -> string (word_id -> surface_form) to build dictionary
    var dictionary_entries = token_info_dictionary.buildDictionary(this.tid_entries);

    var trie = this.buildDoubleArray();

    for (var token_info_id in dictionary_entries) {
        var surface_form = dictionary_entries[token_info_id];
        var trie_id = trie.lookup(surface_form);

        // Assertion
        // if (trie_id < 0) {
        //     console.log("Not Found:" + surface_form);
        // }

        token_info_dictionary.addMapping(trie_id, token_info_id);
    }

    return {
        trie: trie,
        token_info_dictionary: token_info_dictionary
    };
};

DictionaryBuilder.prototype.buildUnknownDictionary = function () {

    var unk_dictionary = new UnknownDictionary();

    // using as hashmap, string -> string (word_id -> surface_form) to build dictionary
    var dictionary_entries = unk_dictionary.buildDictionary(this.unk_entries);

    var char_def = CharacterDefinition.readCharacterDefinition(this.char_text); // Create CharacterDefinition (factory method)

    unk_dictionary.characterDefinition(char_def);

    for (var token_info_id in dictionary_entries) {
        var class_name = dictionary_entries[token_info_id];
        var class_id = char_def.invoke_definition_map.lookup(class_name);

        // Assertion
        // if (trie_id < 0) {
        //     console.log("Not Found:" + surface_form);
        // }

        unk_dictionary.addMapping(class_id, token_info_id);
    }

    return unk_dictionary;
};

/**
 * Build connection costs dictionary
 */
DictionaryBuilder.prototype.buildConnectionCosts = function () {
    return ConnectionCosts.build(this.matrix_text);
};

/**
 * Build double array trie
 *
 * @returns {DoubleArray} Double-Array trie
 */
DictionaryBuilder.prototype.buildDoubleArray = function () {
    var trie_id = 0;
    var words = this.tid_entries.map(function (entry) {
        var surface_form = entry[0];
        return { k: surface_form, v: trie_id++ };
    });

    var builder = doublearray.builder(1024 * 1024);
    return builder.build(words);
};


module.exports = DictionaryBuilder;

},{"../dict/CharacterDefinition.js":5,"../dict/ConnectionCosts.js":6,"../dict/DynamicDictionaries.js":7,"../dict/TokenInfoDictionary.js":9,"../dict/UnknownDictionary.js":10,"doublearray":22}],15:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * Mappings between IPADIC dictionary features and tokenized results
 * @constructor
 */
function IpadicFormatter() {
}

IpadicFormatter.prototype.formatEntry = function (word_id, position, type, features) {
    var token = {};
    token.word_id = word_id;
    token.word_type = type;
    token.word_position = position;

    token.surface_form = features[0];
    token.pos = features[1];
    token.pos_detail_1 = features[2];
    token.pos_detail_2 = features[3];
    token.pos_detail_3 = features[4];
    token.conjugated_type = features[5];
    token.conjugated_form = features[6];
    token.basic_form = features[7];
    token.reading = features[8];
    token.pronunciation = features[9];

    return token;
};

IpadicFormatter.prototype.formatUnknownEntry = function (word_id, position, type, features, surface_form) {
    var token = {};
    token.word_id = word_id;
    token.word_type = type;
    token.word_position = position;

    token.surface_form = surface_form;
    token.pos = features[1];
    token.pos_detail_1 = features[2];
    token.pos_detail_2 = features[3];
    token.pos_detail_3 = features[4];
    token.conjugated_type = features[5];
    token.conjugated_form = features[6];
    token.basic_form = features[7];
    // token.reading = features[8];
    // token.pronunciation = features[9];

    return token;
};


module.exports = IpadicFormatter;

},{}],16:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * String wrapper for UTF-16 surrogate pair (4 bytes)
 * @param {string} str String to wrap
 * @constructor
 */
function SurrogateAwareString(str) {
    this.str = str;
    this.index_mapping = [];

    for (var pos = 0; pos < str.length; pos++) {
        var ch = str.charAt(pos);
        this.index_mapping.push(pos);
        if (SurrogateAwareString.isSurrogatePair(ch)) {
            pos++;
        }
    }
    // Surrogate aware length
    this.length = this.index_mapping.length;
}


SurrogateAwareString.prototype.slice = function (index) {
    if (this.index_mapping.length <= index) {
        return "";
    }
    var surrogate_aware_index = this.index_mapping[index];
    return this.str.slice(surrogate_aware_index);
};


SurrogateAwareString.prototype.charAt = function (index) {
    if (this.str.length <= index) {
        return "";
    }
    var surrogate_aware_start_index = this.index_mapping[index];
    var surrogate_aware_end_index = this.index_mapping[index + 1];

    if (surrogate_aware_end_index == null) {
        return this.str.slice(surrogate_aware_start_index);
    }
    return this.str.slice(surrogate_aware_start_index, surrogate_aware_end_index);
};


SurrogateAwareString.prototype.charCodeAt = function (index) {
    if (this.index_mapping.length <= index) {
        return NaN;
    }
    var surrogate_aware_index = this.index_mapping[index];
    var upper = this.str.charCodeAt(surrogate_aware_index);
    var lower;
    if (upper >= 0xD800 && upper <= 0xDBFF && surrogate_aware_index < this.str.length) {
        lower = this.str.charCodeAt(surrogate_aware_index + 1);
        if (lower >= 0xDC00 && lower <= 0xDFFF) {
            return (upper - 0xD800) * 0x400 + lower - 0xDC00 + 0x10000;
        }
    }
    return upper;
};


SurrogateAwareString.prototype.toString = function () {
    return this.str;
};


SurrogateAwareString.isSurrogatePair = function (ch) {
    var utf16_code = ch.charCodeAt(0);
    if (utf16_code >= 0xD800 && utf16_code <= 0xDBFF) {
        // surrogate pair
        return true;
    } else {
        return false;
    }
};


module.exports = SurrogateAwareString;

},{}],17:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ViterbiNode = require("./ViterbiNode.js");
var ViterbiLattice = require("./ViterbiLattice.js");
var SurrogateAwareString = require("../util/SurrogateAwareString.js");


/**
 * ViterbiBuilder builds word lattice (ViterbiLattice)
 * @param {DynamicDictionaries} dic dictionary
 * @constructor
 */
function ViterbiBuilder(dic) {
    this.trie = dic.trie;
    this.token_info_dictionary = dic.token_info_dictionary;
    this.unknown_dictionary = dic.unknown_dictionary;
}

/**
 * Build word lattice
 * @param {string} sentence_str Input text
 * @returns {ViterbiLattice} Word lattice
 */
ViterbiBuilder.prototype.build = function (sentence_str) {
    var lattice = new ViterbiLattice();
    var sentence = new SurrogateAwareString(sentence_str);

    var key, trie_id, left_id, right_id, word_cost;
    for (var pos = 0; pos < sentence.length; pos++) {
        var tail = sentence.slice(pos);
        var vocabulary = this.trie.commonPrefixSearch(tail);
        for (var n = 0; n < vocabulary.length; n++) {  // Words in dictionary do not have surrogate pair (only UCS2 set)
            trie_id = vocabulary[n].v;
            key = vocabulary[n].k;

            var token_info_ids = this.token_info_dictionary.target_map[trie_id];
            for (var i = 0; i < token_info_ids.length; i++) {
                var token_info_id = parseInt(token_info_ids[i]);

                left_id = this.token_info_dictionary.dictionary.getShort(token_info_id);
                right_id = this.token_info_dictionary.dictionary.getShort(token_info_id + 2);
                word_cost = this.token_info_dictionary.dictionary.getShort(token_info_id + 4);

                // node_name, cost, start_index, length, type, left_id, right_id, surface_form
                lattice.append(new ViterbiNode(token_info_id, word_cost, pos + 1, key.length, "KNOWN", left_id, right_id, key));
            }
        }

        // Unknown word processing
        var surrogate_aware_tail = new SurrogateAwareString(tail);
        var head_char = new SurrogateAwareString(surrogate_aware_tail.charAt(0));
        var head_char_class = this.unknown_dictionary.lookup(head_char.toString());
        if (vocabulary == null || vocabulary.length === 0 || head_char_class.is_always_invoke === 1) {
            // Process unknown word
            key = head_char;
            if (head_char_class.is_grouping === 1 && 1 < surrogate_aware_tail.length) {
                for (var k = 1; k < surrogate_aware_tail.length; k++) {
                    var next_char = surrogate_aware_tail.charAt(k);
                    var next_char_class = this.unknown_dictionary.lookup(next_char);
                    if (head_char_class.class_name !== next_char_class.class_name) {
                        break;
                    }
                    key += next_char;
                }
            }

            var unk_ids = this.unknown_dictionary.target_map[head_char_class.class_id];
            for (var j = 0; j < unk_ids.length; j++) {
                var unk_id = parseInt(unk_ids[j]);

                left_id = this.unknown_dictionary.dictionary.getShort(unk_id);
                right_id = this.unknown_dictionary.dictionary.getShort(unk_id + 2);
                word_cost = this.unknown_dictionary.dictionary.getShort(unk_id + 4);

                // node_name, cost, start_index, length, type, left_id, right_id, surface_form
                lattice.append(new ViterbiNode(unk_id, word_cost, pos + 1, key.length, "UNKNOWN", left_id, right_id, key.toString()));
            }
        }
    }
    lattice.appendEos();

    return lattice;
};


module.exports = ViterbiBuilder;

},{"../util/SurrogateAwareString.js":16,"./ViterbiLattice.js":18,"./ViterbiNode.js":19}],18:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ViterbiNode = require("./ViterbiNode.js");


/**
 * ViterbiLattice is a lattice in Viterbi algorithm
 * @constructor
 */
function ViterbiLattice() {
    this.nodes_end_at = [];
    this.nodes_end_at[0] = [ new ViterbiNode("BOS", 0, 0, 0, "BOS", 0, 0) ];
    this.eos_pos = 1;
}

/**
 * Append node to ViterbiLattice
 * @param {ViterbiNode} node
 */
ViterbiLattice.prototype.append = function (node) {
    var last_pos = node.start_pos + node.length - 1;
    if (this.eos_pos < last_pos) {
        this.eos_pos = last_pos;
    }

    var prev_nodes = this.nodes_end_at[last_pos];
    if (prev_nodes == null) {
        prev_nodes = [];
    }
    prev_nodes.push(node);

    this.nodes_end_at[last_pos] = prev_nodes;
};

/**
 * Set ends with EOS (End of Statement)
 */
ViterbiLattice.prototype.appendEos = function () {
    var last_index = this.nodes_end_at.length;
    this.eos_pos++;
    this.nodes_end_at[last_index] = [ new ViterbiNode("EOS", 0, this.eos_pos, 0, "EOS", 0, 0) ];
};


module.exports = ViterbiLattice;

},{"./ViterbiNode.js":19}],19:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * ViterbiNode is a node of ViterbiLattice
 * @param {string} node_name
 * @param {number} node_cost Word cost to generate
 * @param {number} start_pos Start position from 1
 * @param {number} length Word length
 * @param {string} type Node type (KNOWN, UNKNOWN, BOS, EOS, ...)
 * @param {number} left_id Left context ID
 * @param {number} right_id Right context ID
 * @param {string} surface_form Surface form of this word
 * @constructor
 */
function ViterbiNode(node_name, node_cost, start_pos, length, type, left_id, right_id, surface_form) {
    this.name = node_name;
    this.cost = node_cost;
    this.start_pos = start_pos;
    this.length = length;
    this.left_id = left_id;
    this.right_id = right_id;
    this.prev = null;
    this.surface_form = surface_form;
    if (type === "BOS") {
        this.shortest_cost = 0;
    } else {
        this.shortest_cost = Number.MAX_VALUE;
    }
    this.type = type;
}


module.exports = ViterbiNode;

},{}],20:[function(require,module,exports){
/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * ViterbiSearcher is for searching best Viterbi path
 * @param {ConnectionCosts} connection_costs Connection costs matrix
 * @constructor
 */
function ViterbiSearcher(connection_costs) {
    this.connection_costs = connection_costs;
}

/**
 * Search best path by forward-backward algorithm
 * @param {ViterbiLattice} lattice Viterbi lattice to search
 * @returns {Array} Shortest path
 */
ViterbiSearcher.prototype.search = function (lattice) {
    lattice = this.forward(lattice);
    return this.backward(lattice);
};

ViterbiSearcher.prototype.forward = function (lattice) {
    var i, j, k;
    for (i = 1; i <= lattice.eos_pos; i++) {
        var nodes = lattice.nodes_end_at[i];
        if (nodes == null) {
            continue;
        }
        for (j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            var cost = Number.MAX_VALUE;
            var shortest_prev_node;

            var prev_nodes = lattice.nodes_end_at[node.start_pos - 1];
            if (prev_nodes == null) {
                // TODO process unknown words (repair word lattice)
                continue;
            }
            for (k = 0; k < prev_nodes.length; k++) {
                var prev_node = prev_nodes[k];

                var edge_cost;
                if (node.left_id == null || prev_node.right_id == null) {
                    // TODO assert
                    console.log("Left or right is null");
                    edge_cost = 0;
                } else {
                    edge_cost = this.connection_costs.get(prev_node.right_id, node.left_id);
                }

                var _cost = prev_node.shortest_cost + edge_cost + node.cost;
                if (_cost < cost) {
                    shortest_prev_node = prev_node;
                    cost = _cost;
                }
            }

            node.prev = shortest_prev_node;
            node.shortest_cost = cost;
        }
    }
    return lattice;
};

ViterbiSearcher.prototype.backward = function (lattice) {
    var shortest_path = [];
    var eos = lattice.nodes_end_at[lattice.nodes_end_at.length - 1][0];

    var node_back = eos.prev;
    if (node_back == null) {
        return [];
    }
    while (node_back.type !== "BOS") {
        shortest_path.push(node_back);
        if (node_back.prev == null) {
            // TODO Failed to back. Process unknown words?
            return [];
        }
        node_back = node_back.prev;
    }

    return shortest_path.reverse();
};


module.exports = ViterbiSearcher;

},{}],21:[function(require,module,exports){
(function (process,global){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    function noop() {}
    function identity(v) {
        return v;
    }
    function toBool(v) {
        return !!v;
    }
    function notId(v) {
        return !v;
    }

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        return function() {
            if (fn === null) throw new Error("Callback was already called.");
            fn.apply(this, arguments);
            fn = null;
        };
    }

    function _once(fn) {
        return function() {
            if (fn === null) return;
            fn.apply(this, arguments);
            fn = null;
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    // Ported from underscore.js isObject
    var _isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _each(coll, iterator) {
        return _isArrayLike(coll) ?
            _arrayEach(coll, iterator) :
            _forEachOf(coll, iterator);
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    function _indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    // From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
    function _restParam(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
            }
            // Currently unused but handle cases outside of the switch statement:
            // var args = Array(startIndex + 1);
            // for (index = 0; index < startIndex; index++) {
            //     args[index] = arguments[index];
            // }
            // args[startIndex] = rest;
            // return func.apply(this, args);
        };
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

    var _delay = _setImmediate ? function(fn) {
        // not a direct alias for IE10 compatibility
        _setImmediate(fn);
    } : function(fn) {
        setTimeout(fn, 0);
    };

    if (typeof process === 'object' && typeof process.nextTick === 'function') {
        async.nextTick = process.nextTick;
    } else {
        async.nextTick = _delay;
    }
    async.setImmediate = _setImmediate ? _delay : async.nextTick;


    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];
        var size = _isArrayLike(object) ? object.length : _keys(object).length;
        var completed = 0;
        if (!size) {
            return callback(null);
        }
        _each(object, function (value, key) {
            iterator(object[key], key, only_once(done));
        });
        function done(err) {
            if (err) {
                callback(err);
            }
            else {
                completed += 1;
                if (completed >= size) {
                    callback(null);
                }
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.nextTick(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(fn) {
        return function (obj, limit, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        var results = [];
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = doParallelLimit(_asyncMap);

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err || null, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, identity).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (v) {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectLimit =
    async.filterLimit = doParallelLimit(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectLimit = doParallelLimit(_reject);
    async.rejectSeries = doSeries(_reject);

    function _createTester(eachfn, check, getResult) {
        return function(arr, limit, iterator, cb) {
            function done() {
                if (cb) cb(getResult(false, void 0));
            }
            function iteratee(x, _, callback) {
                if (!cb) return callback();
                iterator(x, function (v) {
                    if (cb && check(v)) {
                        cb(getResult(true, x));
                        cb = iterator = false;
                    }
                    callback();
                });
            }
            if (arguments.length > 3) {
                eachfn(arr, limit, iteratee, done);
            } else {
                cb = iterator;
                iterator = limit;
                eachfn(arr, iteratee, done);
            }
        };
    }

    async.any =
    async.some = _createTester(async.eachOf, toBool, identity);

    async.someLimit = _createTester(async.eachOfLimit, toBool, identity);

    async.all =
    async.every = _createTester(async.eachOf, notId, notId);

    async.everyLimit = _createTester(async.eachOfLimit, notId, notId);

    function _findGetResult(v, x) {
        return x;
    }
    async.detect = _createTester(async.eachOf, identity, _findGetResult);
    async.detectSeries = _createTester(async.eachOfSeries, identity, _findGetResult);
    async.detectLimit = _createTester(async.eachOfLimit, identity, _findGetResult);

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, callback) {
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            var idx = _indexOf(listeners, fn);
            if (idx >= 0) listeners.splice(idx, 1);
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = _restParam(function(err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _forEachOf(results, function(val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            });
            var requires = task.slice(0, task.length - 1);
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has inexistant dependency');
                }
                if (_isArray(dep) && _indexOf(dep, k) >= 0) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
            times: DEFAULT_TIMES,
            interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
            if(typeof t === 'number'){
                acc.times = parseInt(t, 10) || DEFAULT_TIMES;
            } else if(typeof t === 'object'){
                acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
                acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
            } else {
                throw new Error('Unsupported argument type for \'times\': ' + typeof t);
            }
        }

        var length = arguments.length;
        if (length < 1 || length > 3) {
            throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
        } else if (length <= 2 && typeof times === 'function') {
            callback = task;
            task = times;
        }
        if (typeof times !== 'function') {
            parseTimes(opts, times);
        }
        opts.callback = callback;
        opts.task = task;

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
                return function(seriesCallback){
                    setTimeout(function(){
                        seriesCallback(null);
                    }, interval);
                };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                    attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return _restParam(function (err, args) {
                if (err) {
                    callback.apply(null, [err].concat(args));
                }
                else {
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            });
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(_restParam(function (err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            }));
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function(tasks, callback) {
        _parallel(async.eachOfSeries, tasks, callback);
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = _restParam(function (fn, args) {
        return _restParam(function (callArgs) {
            return fn.apply(
                null, args.concat(callArgs)
            );
        });
    });

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            var next = _restParam(function(err, args) {
                if (err) {
                    callback(err);
                } else if (test.apply(this, args)) {
                    iterator(next);
                } else {
                    callback(null);
                }
            });
            iterator(next);
        } else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        var calls = 0;
        return async.whilst(function() {
            return ++calls <= 1 || test.apply(this, arguments);
        }, iterator, callback);
    };

    async.until = function (test, iterator, callback) {
        return async.whilst(function() {
            return !test.apply(this, arguments);
        }, iterator, callback);
    };

    async.doUntil = function (iterator, test, callback) {
        return async.doWhilst(iterator, function() {
            return !test.apply(this, arguments);
        }, callback);
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;

        var next = _restParam(function(err, args) {
            if (err) {
                callback(err);
            } else {
                args.push(check);
                test.apply(this, args);
            }
        });

        var check = function(err, truth) {
            if (err) {
                callback(err);
            } else if (truth) {
                iterator(next);
            } else {
                callback(null);
            }
        };

        test(check);
    };

    async.doDuring = function (iterator, test, callback) {
        var calls = 0;
        async.during(function(next) {
            if (calls++ < 1) {
                next(null, true);
            } else {
                test.apply(this, arguments);
            }
        }, iterator, callback);
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    while(workers < q.concurrency && q.tasks.length){
                        var tasks = q.payload ?
                            q.tasks.splice(0, q.payload) :
                            q.tasks.splice(0, q.tasks.length);

                        var data = _map(tasks, function (task) {
                            return task.data;
                        });

                        if (q.tasks.length === 0) {
                            q.empty();
                        }
                        workers += 1;
                        var cb = only_once(_next(q, tasks));
                        worker(data, cb);
                    }
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return _restParam(function (fn, args) {
            fn.apply(null, args.concat([_restParam(function (err, args) {
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            })]));
        });
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || identity;
        var memoized = _restParam(function memoized(args) {
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([_restParam(function (args) {
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                })]));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return _restParam(function (args) {
            var that = this;

            var callback = args[args.length - 1];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([_restParam(function (err, nextargs) {
                    cb(err, nextargs);
                })]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        });
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn) {
        return _restParam(function(fns, args) {
            var go = _restParam(function(args) {
                var that = this;
                var callback = args.pop();
                return eachfn(fns, function (fn, _, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        });
    }

    async.applyEach = _applyEach(async.eachOf);
    async.applyEachSeries = _applyEach(async.eachOfSeries);


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return _restParam(function (args) {
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        });
    }

    async.ensureAsync = ensureAsync;

    async.constant = _restParam(function(values) {
        var args = [null].concat(values);
        return function (callback) {
            return callback.apply(this, args);
        };
    });

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return _restParam(function (args) {
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (_isObject(result) && typeof result.then === "function") {
                result.then(function(value) {
                    callback(null, value);
                })["catch"](function(err) {
                    callback(err.message ? err : new Error(err));
                });
            } else {
                callback(null, result);
            }
        });
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":undefined}],22:[function(require,module,exports){
// Copyright (c) 2014 Takuya Asano All Rights Reserved.

(function () {

    "use strict";

    var TERM_CHAR = "\u0000", // terminal character
        TERM_CODE = 0,        // terminal character code
        ROOT_ID = 0,          // index of root node
        NOT_FOUND = -1,       // traverse() returns if no nodes found
        BASE_SIGNED = true,
        CHECK_SIGNED = true,
        BASE_BYTES = 4,
        CHECK_BYTES = 4,
        MEMORY_EXPAND_RATIO = 2;


    var newBC = function (initial_size) {

        if (initial_size == null) {
            initial_size = 1024;
        }

        var initBase = function (_base, start, end) {  // 'end' index does not include
            for (var i = start; i < end; i++) {
                _base[i] = - i + 1;  // inversed previous empty node index
            }
            if (0 < check.array[check.array.length - 1]) {
                var last_used_id = check.array.length - 2;
                while (0 < check.array[last_used_id]) {
                    last_used_id--;
                }
                _base[start] = - last_used_id;
            }
        };

        var initCheck = function (_check, start, end) {
            for (var i = start; i < end; i++) {
                _check[i] = - i - 1;  // inversed next empty node index
            }
        };

        var realloc = function (min_size) {
            // expand arrays size by given ratio
            var new_size = min_size * MEMORY_EXPAND_RATIO;
            // console.log('re-allocate memory to ' + new_size);

            var base_new_array = newArrayBuffer(base.signed, base.bytes, new_size);
            initBase(base_new_array, base.array.length, new_size);  // init BASE in new range
            base_new_array.set(base.array);
            base.array = null;  // explicit GC
            base.array = base_new_array;

            var check_new_array = newArrayBuffer(check.signed, check.bytes, new_size);
            initCheck(check_new_array, check.array.length, new_size);  // init CHECK in new range
            check_new_array.set(check.array);
            check.array = null;  // explicit GC
            check.array = check_new_array;
        };

        var first_unused_node = ROOT_ID + 1;

        var base = {
            signed: BASE_SIGNED,
            bytes: BASE_BYTES,
            array: newArrayBuffer(BASE_SIGNED, BASE_BYTES, initial_size)
        };

        var check = {
            signed: CHECK_SIGNED,
            bytes: CHECK_BYTES,
            array: newArrayBuffer(CHECK_SIGNED, CHECK_BYTES, initial_size)
        };

        // init root node
        base.array[ROOT_ID] = 1;
        check.array[ROOT_ID] = ROOT_ID;

        // init BASE
        initBase(base.array, ROOT_ID + 1, base.array.length);

        // init CHECK
        initCheck(check.array, ROOT_ID + 1, check.array.length);

        return {
            getBaseBuffer: function () {
                return base.array;
            },
            getCheckBuffer: function () {
                return check.array;
            },
            loadBaseBuffer: function (base_buffer) {
                base.array = base_buffer;
                return this;
            },
            loadCheckBuffer: function (check_buffer) {
                check.array = check_buffer;
                return this;
            },
            size: function () {
                return Math.max(base.array.length, check.array.length);
            },
            getBase: function (index) {
                if (base.array.length - 1 < index) {
                    return - index + 1;
                    // realloc(index);
                }
                // if (!Number.isFinite(base.array[index])) {
                //     console.log('getBase:' + index);
                //     throw 'getBase' + index;
                // }
                return base.array[index];
            },
            getCheck: function (index) {
                if (check.array.length - 1 < index) {
                    return - index - 1;
                    // realloc(index);
                }
                // if (!Number.isFinite(check.array[index])) {
                //     console.log('getCheck:' + index);
                //     throw 'getCheck' + index;
                // }
                return check.array[index];
            },
            setBase: function (index, base_value) {
                if (base.array.length - 1 < index) {
                    realloc(index);
                }
                base.array[index] = base_value;
            },
            setCheck: function (index, check_value) {
                if (check.array.length - 1 < index) {
                    realloc(index);
                }
                check.array[index] = check_value;
            },
            setFirstUnusedNode: function (index) {
                // if (!Number.isFinite(index)) {
                //     throw 'assertion error: setFirstUnusedNode ' + index + ' is not finite number';
                // }
                first_unused_node = index;
            },
            getFirstUnusedNode: function () {
                // if (!Number.isFinite(first_unused_node)) {
                //     throw 'assertion error: getFirstUnusedNode ' + first_unused_node + ' is not finite number';
                // }
                return first_unused_node;
            },
            shrink: function () {
                var last_index = this.size() - 1;
                while (true) {
                    if (0 <= check.array[last_index]) {
                        break;
                    }
                    last_index--;
                }
                base.array = base.array.subarray(0, last_index + 2);   // keep last unused node
                check.array = check.array.subarray(0, last_index + 2); // keep last unused node
            },
            calc: function () {
                var unused_count = 0;
                var size = check.array.length;
                for (var i = 0; i < size; i++) {
                    if (check.array[i] < 0) {
                        unused_count++;
                    }
                }
                return {
                    all: size,
                    unused: unused_count,
                    efficiency: (size - unused_count) / size
                };
            },
            dump: function () {
                // for debug
                var dump_base = "";
                var dump_check = "";

                var i;
                for (i = 0; i < base.array.length; i++) {
                    dump_base = dump_base + " " + this.getBase(i);
                }
                for (i = 0; i < check.array.length; i++) {
                    dump_check = dump_check + " " + this.getCheck(i);
                }

                console.log("base:" + dump_base);
                console.log("chck:" + dump_check);

                return "base:" + dump_base + " chck:" + dump_check;
            }
        };
    };


    /**
     * Factory method of double array
     */
    function DoubleArrayBuilder(initial_size) {
        this.bc = newBC(initial_size);  // BASE and CHECK
        this.keys = [];
    }


    /**
     * Append a key to initialize set
     * (This method should be called by dictionary ordered key)
     *
     * @param {String} key
     * @param {Number} value Integer value from 0 to max signed integer number - 1
     */
    DoubleArrayBuilder.prototype.append = function (key, record) {
        this.keys.push({ k: key, v: record });
        return this;
    };

    /**
     * Build double array for given keys
     *
     * @param {Array} keys Array of keys. A key is a Object which has properties 'k', 'v'.
     * 'k' is a key string, 'v' is a record assigned to that key.
     * @return {DoubleArray} Compiled double array
     */
    DoubleArrayBuilder.prototype.build = function (keys, sorted) {

        if (keys == null) {
            keys = this.keys;
        }

        if (keys == null) {
            return new DoubleArray(this.bc);
        }

        if (sorted == null) {
            sorted = false;
        }

        // Convert key string to ArrayBuffer
        var buff_keys =
            keys.map(function (k) {
                return {
                    k: stringToUtf8Bytes(k.k + TERM_CHAR),
                    v: k.v
                };
            });

        // Sort keys by byte order
        if (sorted) {
            this.keys = buff_keys;
        } else {
            this.keys =
                buff_keys.sort(function (k1, k2) {
                    var b1 = k1.k;
                    var b2 = k2.k;
                    var min_length = Math.min(b1.length, b2.length);
                    for (var pos = 0; pos < min_length; pos++) {
                        if (b1[pos] === b2[pos]) {
                            continue;
                        }
                        return b1[pos] - b2[pos];
                    }
                    return b1.length - b2.length;
                });
        }

        buff_keys = null;  // explicit GC

        this._build(ROOT_ID, 0, 0, this.keys.length);
        return new DoubleArray(this.bc);
    };

    /**
     * Append nodes to BASE and CHECK array recursively
     */
    DoubleArrayBuilder.prototype._build = function (parent_index, position, start, length) {

        var children_info = this.getChildrenInfo(position, start, length);
        var _base = this.findAllocatableBase(children_info);

        this.setBC(parent_index, children_info, _base);

        for (var i = 0; i < children_info.length; i = i + 3) {
            var child_code = children_info[i];
            if (child_code === TERM_CODE) {
                continue;
            }
            var child_start = children_info[i + 1];
            var child_len = children_info[i + 2];
            var child_index = _base + child_code;
            this._build(child_index, position + 1, child_start, child_len);
        }
    };

    DoubleArrayBuilder.prototype.getChildrenInfo = function (position, start, length) {
        var current_char = this.keys[start].k[position];
        var i = 0;
        var children_info = new Int32Array(length * 3);

        children_info[i++] = current_char;  // char (current)
        children_info[i++] = start;         // start index (current)

        var next_pos = start;
        var start_pos = start;
        for (; next_pos < start + length; next_pos++) {
            var next_char = this.keys[next_pos].k[position];
            if (current_char !== next_char) {
                children_info[i++] = next_pos - start_pos;  // length (current)

                children_info[i++] = next_char;             // char (next)
                children_info[i++] = next_pos;              // start index (next)
                current_char = next_char;
                start_pos = next_pos;
            }
        }
        children_info[i++] = next_pos - start_pos;
        children_info = children_info.subarray(0, i);

        return children_info;
    };

    DoubleArrayBuilder.prototype.setBC = function (parent_id, children_info, _base) {

        var bc = this.bc;

        bc.setBase(parent_id, _base);  // Update BASE of parent node

        var i;
        for (i = 0; i < children_info.length; i = i + 3) {
            var code = children_info[i];
            var child_id = _base + code;

            // Update linked list of unused nodes

            // Assertion
            // if (child_id < 0) {
            //     throw 'assertion error: child_id is negative'
            // }

            var prev_unused_id = - bc.getBase(child_id);
            var next_unused_id = - bc.getCheck(child_id);
            // if (prev_unused_id < 0) {
            //     throw 'assertion error: setBC'
            // }
            // if (next_unused_id < 0) {
            //     throw 'assertion error: setBC'
            // }
            if (child_id !== bc.getFirstUnusedNode()) {
                bc.setCheck(prev_unused_id, - next_unused_id);
            } else {
                // Update first_unused_node
                bc.setFirstUnusedNode(next_unused_id);
            }
            bc.setBase(next_unused_id, - prev_unused_id);

            var check = parent_id;         // CHECK is parent node index
            bc.setCheck(child_id, check);  // Update CHECK of child node

            // Update record
            if (code === TERM_CODE) {
                var start_pos = children_info[i + 1];
                // var len = children_info[i + 2];
                // if (len != 1) {
                //     throw 'assertion error: there are multiple terminal nodes. len:' + len;
                // }
                var value = this.keys[start_pos].v;

                if (value == null) {
                    value = 0;
                }

                var base = - value - 1;       // BASE is inverted record value
                bc.setBase(child_id, base);  // Update BASE of child(leaf) node
            }
        }
    };


    /**
     * Find BASE value that all children are allocatable in double array's region
     */
    DoubleArrayBuilder.prototype.findAllocatableBase = function (children_info) {

        var bc = this.bc;

        // Assertion: keys are sorted by byte order
        // var c = -1;
        // for (var i = 0; i < children_info.length; i = i + 3) {
        //     if (children_info[i] < c) {
        //         throw 'assertion error: not sort key'
        //     }
        //     c = children_info[i];
        // }

        // iterate linked list of unused nodes
        var _base;
        var curr = bc.getFirstUnusedNode();  // current index
        // if (curr < 0) {
        //     throw 'assertion error: getFirstUnusedNode returns negative value'
        // }

        while (true) {
            _base = curr - children_info[0];

            if (_base < 0) {
                curr = - bc.getCheck(curr);  // next

                // if (curr < 0) {
                //     throw 'assertion error: getCheck returns negative value'
                // }

                continue;
            }

            var empty_area_found = true;
            for (var i = 0; i < children_info.length; i = i + 3) {
                var code = children_info[i];
                var candidate_id = _base + code;

                if (!this.isUnusedNode(candidate_id)) {
                    // candidate_id is used node
                    // next
                    curr = - bc.getCheck(curr);
                    // if (curr < 0) {
                    //     throw 'assertion error: getCheck returns negative value'
                    // }

                    empty_area_found = false;
                    break;
                }
            }
            if (empty_area_found) {
                // Area is free
                return _base;
            }
        }
    };

    /**
     * Check this double array index is unused or not
     */
    DoubleArrayBuilder.prototype.isUnusedNode = function (index) {
        var bc = this.bc;
        var check = bc.getCheck(index);

        // if (index < 0) {
        //     throw 'assertion error: isUnusedNode index:' + index;
        // }

        if (index === ROOT_ID) {
            // root node
            return false;
        }
        if (check < 0) {
            // unused
            return true;
        }

        // used node (incl. leaf)
        return false;
    };


    /**
     * Factory method of double array
     */
    function DoubleArray(bc) {
        this.bc = bc;       // BASE and CHECK
        this.bc.shrink();
    }


    /**
     * Look up a given key in this trie
     *
     * @param {String} key
     * @return {Boolean} True if this trie contains a given key
     */
    DoubleArray.prototype.contain = function (key) {

        var bc = this.bc;

        key += TERM_CHAR;
        var buffer = stringToUtf8Bytes(key);

        var parent = ROOT_ID;
        var child = NOT_FOUND;

        for (var i = 0; i < buffer.length; i++) {
            var code = buffer[i];

            child = this.traverse(parent, code);
            if (child === NOT_FOUND) {
                return false;
            }

            if (bc.getBase(child) <= 0) {
                // leaf node
                return true;
            } else {
                // not leaf
                parent = child;
                continue;
            }
        }
        return false;
    };


    /**
     * Look up a given key in this trie
     *
     * @param {String} key
     * @return {Number} Record value assgned to this key, -1 if this key does not contain
     */
    DoubleArray.prototype.lookup = function (key) {

        key += TERM_CHAR;
        var buffer = stringToUtf8Bytes(key);

        var parent = ROOT_ID;
        var child = NOT_FOUND;

        for (var i = 0; i < buffer.length; i++) {
            var code = buffer[i];
            child = this.traverse(parent, code);
            if (child === NOT_FOUND) {
                return NOT_FOUND;
            }
            parent = child;
        }

        var base = this.bc.getBase(child);
        if (base <= 0) {
            // leaf node
            return - base - 1;
        } else {
            // not leaf
            return NOT_FOUND;
        }
    };


    /**
     * Common prefix search
     *
     * @param {String} key
     * @return {Array} Each result object has 'k' and 'v' (key and record,
     * respectively) properties assigned to matched string
     */
    DoubleArray.prototype.commonPrefixSearch = function (key) {

        var buffer = stringToUtf8Bytes(key);

        var parent = ROOT_ID;
        var child = NOT_FOUND;

        var result = [];

        for (var i = 0; i < buffer.length; i++) {
            var code = buffer[i];

            child = this.traverse(parent, code);

            if (child !== NOT_FOUND) {
                parent = child;

                // look forward by terminal character code to check this node is a leaf or not
                var grand_child = this.traverse(child, TERM_CODE);

                if (grand_child !== NOT_FOUND) {
                    var base = this.bc.getBase(grand_child);

                    var r = {};

                    if (base <= 0) {
                        // If child is a leaf node, add record to result
                        r.v = - base - 1;
                    }

                    // If child is a leaf node, add word to result
                    r.k = utf8BytesToString(arrayCopy(buffer, 0, i + 1));

                    result.push(r);
                }
                continue;
            } else {
                break;
            }
        }

        return result;
    };

    DoubleArray.prototype.traverse = function (parent, code) {
        var child = this.bc.getBase(parent) + code;
        if (this.bc.getCheck(child) === parent) {
            return child;
        } else {
            return NOT_FOUND;
        }
    };

    DoubleArray.prototype.size = function () {
        return this.bc.size();
    };

    DoubleArray.prototype.calc = function () {
        return this.bc.calc();
    };

    DoubleArray.prototype.dump = function () {
        return this.bc.dump();
    };


    // Array utility functions

    var newArrayBuffer = function (signed, bytes, size) {
        if (signed) {
            switch(bytes) {
                case 1:
                return new Int8Array(size);
                case 2:
                return new Int16Array(size);
                case 4:
                return new Int32Array(size);
                default:
                throw new RangeError("Invalid newArray parameter element_bytes:" + bytes);
            }
        } else {
            switch(bytes) {
                case 1:
                return new Uint8Array(size);
                case 2:
                return new Uint16Array(size);
                case 4:
                return new Uint32Array(size);
                default:
                throw new RangeError("Invalid newArray parameter element_bytes:" + bytes);
            }
        }
    };

    var arrayCopy = function (src, src_offset, length) {
        var buffer = new ArrayBuffer(length);
        var dstU8 = new Uint8Array(buffer, 0, length);
        var srcU8 = src.subarray(src_offset, length);
        dstU8.set(srcU8);
        return dstU8;
    };


    /**
     * Convert String (UTF-16) to UTF-8 ArrayBuffer
     *
     * @param {String} str UTF-16 string to convert
     * @return {Uint8Array} Byte sequence encoded by UTF-8
     */
    var stringToUtf8Bytes = function (str) {

        // Max size of 1 character is 4 bytes
        var bytes = new Uint8Array(new ArrayBuffer(str.length * 4));

        var i = 0, j = 0;

        while (i < str.length) {
            var unicode_code;

            var utf16_code = str.charCodeAt(i++);
            if (utf16_code >= 0xD800 && utf16_code <= 0xDBFF) {
                // surrogate pair
                var upper = utf16_code;           // high surrogate
                var lower = str.charCodeAt(i++);  // low surrogate

                if (lower >= 0xDC00 && lower <= 0xDFFF) {
                    unicode_code =
                        (upper - 0xD800) * (1 << 10) + (1 << 16) +
                        (lower - 0xDC00);
                } else {
                    // malformed surrogate pair
                    return null;
                }
            } else {
                // not surrogate code
                unicode_code = utf16_code;
            }

            if (unicode_code < 0x80) {
                // 1-byte
                bytes[j++] = unicode_code;

            } else if (unicode_code < (1 << 11)) {
                // 2-byte
                bytes[j++] = (unicode_code >>> 6) | 0xC0;
                bytes[j++] = (unicode_code & 0x3F) | 0x80;

            } else if (unicode_code < (1 << 16)) {
                // 3-byte
                bytes[j++] = (unicode_code >>> 12) | 0xE0;
                bytes[j++] = ((unicode_code >> 6) & 0x3f) | 0x80;
                bytes[j++] = (unicode_code & 0x3F) | 0x80;

            } else if (unicode_code < (1 << 21)) {
                // 4-byte
                bytes[j++] = (unicode_code >>> 18) | 0xF0;
                bytes[j++] = ((unicode_code >> 12) & 0x3F) | 0x80;
                bytes[j++] = ((unicode_code >> 6) & 0x3F) | 0x80;
                bytes[j++] = (unicode_code & 0x3F) | 0x80;

            } else {
                // malformed UCS4 code
            }
        }

        return bytes.subarray(0, j);
    };


    /**
     * Convert UTF-8 ArrayBuffer to String (UTF-16)
     *
     * @param {Uint8Array} bytes UTF-8 byte sequence to convert
     * @return {String} String encoded by UTF-16
     */
    var utf8BytesToString = function (bytes) {

        var str = "";
        var code, b1, b2, b3, b4, upper, lower;
        var i = 0;

        while (i < bytes.length) {

            b1 = bytes[i++];

            if (b1 < 0x80) {
                // 1 byte
                code = b1;
            } else if ((b1 >> 5) === 0x06) {
                // 2 bytes
                b2 = bytes[i++];
                code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
            } else if ((b1 >> 4) === 0x0e) {
                // 3 bytes
                b2 = bytes[i++];
                b3 = bytes[i++];
                code = ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
            } else {
                // 4 bytes
                b2 = bytes[i++];
                b3 = bytes[i++];
                b4 = bytes[i++];
                code = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
            }

            if (code < 0x10000) {
	            str += String.fromCharCode(code);
            } else {
	            // surrogate pair
	            code -= 0x10000;
	            upper = (0xD800 | (code >> 10));
	            lower = (0xDC00 | (code & 0x3FF));
	            str += String.fromCharCode(upper, lower);
            }
        }

        return str;
    };


    // public methods
    var doublearray = {
        builder: function (initial_size) {
            return new DoubleArrayBuilder(initial_size);
        },
        load: function (base_buffer, check_buffer) {
            var bc = newBC(0);
            bc.loadBaseBuffer(base_buffer);
            bc.loadCheckBuffer(check_buffer);
            return new DoubleArray(bc);
        }
    };

    if ("undefined" === typeof module) {
	    // In browser
        window.doublearray = doublearray;
    } else {
	    // In node
        module.exports = doublearray;
    }

})();

},{}],23:[function(require,module,exports){
/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {'use strict';function n(e){throw e;}var q=void 0,aa=this;function r(e,c){var d=e.split("."),b=aa;!(d[0]in b)&&b.execScript&&b.execScript("var "+d[0]);for(var a;d.length&&(a=d.shift());)!d.length&&c!==q?b[a]=c:b=b[a]?b[a]:b[a]={}};var u="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array&&"undefined"!==typeof DataView;new (u?Uint8Array:Array)(256);var v;for(v=0;256>v;++v)for(var w=v,ba=7,w=w>>>1;w;w>>>=1)--ba;function x(e,c,d){var b,a="number"===typeof c?c:c=0,f="number"===typeof d?d:e.length;b=-1;for(a=f&7;a--;++c)b=b>>>8^z[(b^e[c])&255];for(a=f>>3;a--;c+=8)b=b>>>8^z[(b^e[c])&255],b=b>>>8^z[(b^e[c+1])&255],b=b>>>8^z[(b^e[c+2])&255],b=b>>>8^z[(b^e[c+3])&255],b=b>>>8^z[(b^e[c+4])&255],b=b>>>8^z[(b^e[c+5])&255],b=b>>>8^z[(b^e[c+6])&255],b=b>>>8^z[(b^e[c+7])&255];return(b^4294967295)>>>0}
var A=[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,
2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,
2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,
2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,
3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,
936918E3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117],z=u?new Uint32Array(A):A;function B(){}B.prototype.getName=function(){return this.name};B.prototype.getData=function(){return this.data};B.prototype.H=function(){return this.I};r("Zlib.GunzipMember",B);r("Zlib.GunzipMember.prototype.getName",B.prototype.getName);r("Zlib.GunzipMember.prototype.getData",B.prototype.getData);r("Zlib.GunzipMember.prototype.getMtime",B.prototype.H);function D(e){var c=e.length,d=0,b=Number.POSITIVE_INFINITY,a,f,g,k,m,p,t,h,l,y;for(h=0;h<c;++h)e[h]>d&&(d=e[h]),e[h]<b&&(b=e[h]);a=1<<d;f=new (u?Uint32Array:Array)(a);g=1;k=0;for(m=2;g<=d;){for(h=0;h<c;++h)if(e[h]===g){p=0;t=k;for(l=0;l<g;++l)p=p<<1|t&1,t>>=1;y=g<<16|h;for(l=p;l<a;l+=m)f[l]=y;++k}++g;k<<=1;m<<=1}return[f,d,b]};var E=[],F;for(F=0;288>F;F++)switch(!0){case 143>=F:E.push([F+48,8]);break;case 255>=F:E.push([F-144+400,9]);break;case 279>=F:E.push([F-256+0,7]);break;case 287>=F:E.push([F-280+192,8]);break;default:n("invalid literal: "+F)}
var ca=function(){function e(a){switch(!0){case 3===a:return[257,a-3,0];case 4===a:return[258,a-4,0];case 5===a:return[259,a-5,0];case 6===a:return[260,a-6,0];case 7===a:return[261,a-7,0];case 8===a:return[262,a-8,0];case 9===a:return[263,a-9,0];case 10===a:return[264,a-10,0];case 12>=a:return[265,a-11,1];case 14>=a:return[266,a-13,1];case 16>=a:return[267,a-15,1];case 18>=a:return[268,a-17,1];case 22>=a:return[269,a-19,2];case 26>=a:return[270,a-23,2];case 30>=a:return[271,a-27,2];case 34>=a:return[272,
a-31,2];case 42>=a:return[273,a-35,3];case 50>=a:return[274,a-43,3];case 58>=a:return[275,a-51,3];case 66>=a:return[276,a-59,3];case 82>=a:return[277,a-67,4];case 98>=a:return[278,a-83,4];case 114>=a:return[279,a-99,4];case 130>=a:return[280,a-115,4];case 162>=a:return[281,a-131,5];case 194>=a:return[282,a-163,5];case 226>=a:return[283,a-195,5];case 257>=a:return[284,a-227,5];case 258===a:return[285,a-258,0];default:n("invalid length: "+a)}}var c=[],d,b;for(d=3;258>=d;d++)b=e(d),c[d]=b[2]<<24|b[1]<<
16|b[0];return c}();u&&new Uint32Array(ca);function G(e,c){this.i=[];this.j=32768;this.d=this.f=this.c=this.n=0;this.input=u?new Uint8Array(e):e;this.o=!1;this.k=H;this.z=!1;if(c||!(c={}))c.index&&(this.c=c.index),c.bufferSize&&(this.j=c.bufferSize),c.bufferType&&(this.k=c.bufferType),c.resize&&(this.z=c.resize);switch(this.k){case I:this.a=32768;this.b=new (u?Uint8Array:Array)(32768+this.j+258);break;case H:this.a=0;this.b=new (u?Uint8Array:Array)(this.j);this.e=this.F;this.q=this.B;this.l=this.D;break;default:n(Error("invalid inflate mode"))}}
var I=0,H=1;
G.prototype.g=function(){for(;!this.o;){var e=J(this,3);e&1&&(this.o=!0);e>>>=1;switch(e){case 0:var c=this.input,d=this.c,b=this.b,a=this.a,f=c.length,g=q,k=q,m=b.length,p=q;this.d=this.f=0;d+1>=f&&n(Error("invalid uncompressed block header: LEN"));g=c[d++]|c[d++]<<8;d+1>=f&&n(Error("invalid uncompressed block header: NLEN"));k=c[d++]|c[d++]<<8;g===~k&&n(Error("invalid uncompressed block header: length verify"));d+g>c.length&&n(Error("input buffer is broken"));switch(this.k){case I:for(;a+g>b.length;){p=
m-a;g-=p;if(u)b.set(c.subarray(d,d+p),a),a+=p,d+=p;else for(;p--;)b[a++]=c[d++];this.a=a;b=this.e();a=this.a}break;case H:for(;a+g>b.length;)b=this.e({t:2});break;default:n(Error("invalid inflate mode"))}if(u)b.set(c.subarray(d,d+g),a),a+=g,d+=g;else for(;g--;)b[a++]=c[d++];this.c=d;this.a=a;this.b=b;break;case 1:this.l(da,ea);break;case 2:fa(this);break;default:n(Error("unknown BTYPE: "+e))}}return this.q()};
var K=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],L=u?new Uint16Array(K):K,N=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],O=u?new Uint16Array(N):N,P=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],Q=u?new Uint8Array(P):P,R=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],ga=u?new Uint16Array(R):R,ha=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,
13,13],U=u?new Uint8Array(ha):ha,V=new (u?Uint8Array:Array)(288),W,ia;W=0;for(ia=V.length;W<ia;++W)V[W]=143>=W?8:255>=W?9:279>=W?7:8;var da=D(V),X=new (u?Uint8Array:Array)(30),Y,ja;Y=0;for(ja=X.length;Y<ja;++Y)X[Y]=5;var ea=D(X);function J(e,c){for(var d=e.f,b=e.d,a=e.input,f=e.c,g=a.length,k;b<c;)f>=g&&n(Error("input buffer is broken")),d|=a[f++]<<b,b+=8;k=d&(1<<c)-1;e.f=d>>>c;e.d=b-c;e.c=f;return k}
function Z(e,c){for(var d=e.f,b=e.d,a=e.input,f=e.c,g=a.length,k=c[0],m=c[1],p,t;b<m&&!(f>=g);)d|=a[f++]<<b,b+=8;p=k[d&(1<<m)-1];t=p>>>16;e.f=d>>t;e.d=b-t;e.c=f;return p&65535}
function fa(e){function c(a,c,b){var d,e=this.w,f,g;for(g=0;g<a;)switch(d=Z(this,c),d){case 16:for(f=3+J(this,2);f--;)b[g++]=e;break;case 17:for(f=3+J(this,3);f--;)b[g++]=0;e=0;break;case 18:for(f=11+J(this,7);f--;)b[g++]=0;e=0;break;default:e=b[g++]=d}this.w=e;return b}var d=J(e,5)+257,b=J(e,5)+1,a=J(e,4)+4,f=new (u?Uint8Array:Array)(L.length),g,k,m,p;for(p=0;p<a;++p)f[L[p]]=J(e,3);if(!u){p=a;for(a=f.length;p<a;++p)f[L[p]]=0}g=D(f);k=new (u?Uint8Array:Array)(d);m=new (u?Uint8Array:Array)(b);e.w=
0;e.l(D(c.call(e,d,g,k)),D(c.call(e,b,g,m)))}G.prototype.l=function(e,c){var d=this.b,b=this.a;this.r=e;for(var a=d.length-258,f,g,k,m;256!==(f=Z(this,e));)if(256>f)b>=a&&(this.a=b,d=this.e(),b=this.a),d[b++]=f;else{g=f-257;m=O[g];0<Q[g]&&(m+=J(this,Q[g]));f=Z(this,c);k=ga[f];0<U[f]&&(k+=J(this,U[f]));b>=a&&(this.a=b,d=this.e(),b=this.a);for(;m--;)d[b]=d[b++-k]}for(;8<=this.d;)this.d-=8,this.c--;this.a=b};
G.prototype.D=function(e,c){var d=this.b,b=this.a;this.r=e;for(var a=d.length,f,g,k,m;256!==(f=Z(this,e));)if(256>f)b>=a&&(d=this.e(),a=d.length),d[b++]=f;else{g=f-257;m=O[g];0<Q[g]&&(m+=J(this,Q[g]));f=Z(this,c);k=ga[f];0<U[f]&&(k+=J(this,U[f]));b+m>a&&(d=this.e(),a=d.length);for(;m--;)d[b]=d[b++-k]}for(;8<=this.d;)this.d-=8,this.c--;this.a=b};
G.prototype.e=function(){var e=new (u?Uint8Array:Array)(this.a-32768),c=this.a-32768,d,b,a=this.b;if(u)e.set(a.subarray(32768,e.length));else{d=0;for(b=e.length;d<b;++d)e[d]=a[d+32768]}this.i.push(e);this.n+=e.length;if(u)a.set(a.subarray(c,c+32768));else for(d=0;32768>d;++d)a[d]=a[c+d];this.a=32768;return a};
G.prototype.F=function(e){var c,d=this.input.length/this.c+1|0,b,a,f,g=this.input,k=this.b;e&&("number"===typeof e.t&&(d=e.t),"number"===typeof e.A&&(d+=e.A));2>d?(b=(g.length-this.c)/this.r[2],f=258*(b/2)|0,a=f<k.length?k.length+f:k.length<<1):a=k.length*d;u?(c=new Uint8Array(a),c.set(k)):c=k;return this.b=c};
G.prototype.q=function(){var e=0,c=this.b,d=this.i,b,a=new (u?Uint8Array:Array)(this.n+(this.a-32768)),f,g,k,m;if(0===d.length)return u?this.b.subarray(32768,this.a):this.b.slice(32768,this.a);f=0;for(g=d.length;f<g;++f){b=d[f];k=0;for(m=b.length;k<m;++k)a[e++]=b[k]}f=32768;for(g=this.a;f<g;++f)a[e++]=c[f];this.i=[];return this.buffer=a};
G.prototype.B=function(){var e,c=this.a;u?this.z?(e=new Uint8Array(c),e.set(this.b.subarray(0,c))):e=this.b.subarray(0,c):(this.b.length>c&&(this.b.length=c),e=this.b);return this.buffer=e};function $(e){this.input=e;this.c=0;this.m=[];this.s=!1}$.prototype.G=function(){this.s||this.g();return this.m.slice()};
$.prototype.g=function(){for(var e=this.input.length;this.c<e;){var c=new B,d=q,b=q,a=q,f=q,g=q,k=q,m=q,p=q,t=q,h=this.input,l=this.c;c.u=h[l++];c.v=h[l++];(31!==c.u||139!==c.v)&&n(Error("invalid file signature:"+c.u+","+c.v));c.p=h[l++];switch(c.p){case 8:break;default:n(Error("unknown compression method: "+c.p))}c.h=h[l++];p=h[l++]|h[l++]<<8|h[l++]<<16|h[l++]<<24;c.I=new Date(1E3*p);c.O=h[l++];c.N=h[l++];0<(c.h&4)&&(c.J=h[l++]|h[l++]<<8,l+=c.J);if(0<(c.h&8)){m=[];for(k=0;0<(g=h[l++]);)m[k++]=String.fromCharCode(g);
c.name=m.join("")}if(0<(c.h&16)){m=[];for(k=0;0<(g=h[l++]);)m[k++]=String.fromCharCode(g);c.K=m.join("")}0<(c.h&2)&&(c.C=x(h,0,l)&65535,c.C!==(h[l++]|h[l++]<<8)&&n(Error("invalid header crc16")));d=h[h.length-4]|h[h.length-3]<<8|h[h.length-2]<<16|h[h.length-1]<<24;h.length-l-4-4<512*d&&(f=d);b=new G(h,{index:l,bufferSize:f});c.data=a=b.g();l=b.c;c.L=t=(h[l++]|h[l++]<<8|h[l++]<<16|h[l++]<<24)>>>0;x(a,q,q)!==t&&n(Error("invalid CRC-32 checksum: 0x"+x(a,q,q).toString(16)+" / 0x"+t.toString(16)));c.M=
d=(h[l++]|h[l++]<<8|h[l++]<<16|h[l++]<<24)>>>0;(a.length&4294967295)!==d&&n(Error("invalid input size: "+(a.length&4294967295)+" / "+d));this.m.push(c);this.c=l}this.s=!0;var y=this.m,s,M,S=0,T=0,C;s=0;for(M=y.length;s<M;++s)T+=y[s].data.length;if(u){C=new Uint8Array(T);for(s=0;s<M;++s)C.set(y[s].data,S),S+=y[s].data.length}else{C=[];for(s=0;s<M;++s)C[s]=y[s].data;C=Array.prototype.concat.apply([],C)}return C};r("Zlib.Gunzip",$);r("Zlib.Gunzip.prototype.decompress",$.prototype.g);r("Zlib.Gunzip.prototype.getMembers",$.prototype.G);}).call(this); 

},{}],24:[function(require,module,exports){
/**
 * @author Kenichiro Murata
 * @copyright 2015 Kenichiro Murata
 * @license MIT
 * @fileoverview Japanese (natural language) parser basic module.
 */

'use strict'

module.exports = require('./lib/parse-japanese-basic')

},{"./lib/parse-japanese-basic":25}],25:[function(require,module,exports){
/**
 * @author Kenichiro Murata
 * @copyright 2015 Kenichiro Murata
 * @license MIT
 * @fileoverview Japanese (natural language) parser basic module.
 */

'use strict'

/**
 * Dependencies.
 */
var Jaco = require('jaco').Jaco

/**
 * Constants.
 */

var LINEBREAKE_MARK = /\r?\n/g

/**
 * Tokenize
 * @param parser
 * @param text
 * @returns {{type: string, children: Array}}
 */
function tokenize (parser, text) {
  var textLines = text.split(LINEBREAKE_MARK)

  if (textLines[textLines.length - 1] === '') {
    textLines = textLines.splice(0, textLines.length - 1)
  }

  var rootNode = parser.createParentNode('Root')

  /**
   * Callback Function
   * @param element
   * @param index
   * @param array
   */
  function tokenizeByLine (element, index, array) {
    parser.line = index + 1
    parser.column = 1

    var paragraphNode = parser.createParentNode('Paragraph')

    // 空行ではない場合
    if (element !== '') {
      // 半角括弧を全角括弧に変換
      var str = new Jaco(element).toWideJapneseSymbol().toString()

      // 改行ノードをParagraphNodeに追加する
      parser.add(parser.createTextNode('Text', str), paragraphNode)
    }

    // 改行ノードをParagraphNodeに追加する
    parser.add(parser.createTextNode('WhiteSpace', '\n'), paragraphNode)

    // ParagraphNodeをRoodNodeに追加
    parser.add(paragraphNode, rootNode)
  }

  textLines.forEach(tokenizeByLine)

  return rootNode
}

/**
 * Transform Japanese natural language into
 * an NLCST-tree.
 *
 * @param {VFile?} file - Virtual file.
 * @param {Object?} options - Configuration.
 * @constructor {ParseJapanese}
 */
function ParseJapaneseBasic (file, options) {
  var offset = 0
  var line = 1
  var column = 1
  var position

  if (!(this instanceof ParseJapaneseBasic)) {
    return new ParseJapaneseBasic(file, options)
  }

  if (file && file.message) {
    this.file = file
  } else {
    options = file
  }

  position = options && options.position

  if (position !== null && position !== undefined) {
    this.position = Boolean(position)
  }

  this.offset = offset
  this.line = line
  this.column = column
}

/**
 * Quick access to the prototype.
 */
var parseJapaneseBasicPrototype = ParseJapaneseBasic.prototype

/**
 * Default position.
 */
parseJapaneseBasicPrototype.position = true

/**
 * Easy access to the document parser.
 * @param value
 */
parseJapaneseBasicPrototype.parse = function (value) {
  return tokenize(this, this.file ? this.file.toString() : value)
}

/**
 * Return current position
 * @returns {{line: *, column: *, offset: number}}
 */
parseJapaneseBasicPrototype.now = function () {
  return {
    'line': this.line,
    'column': this.column,
    'offset': this.offset
  }
}

/**
 * Return next position
 * @param value
 * @returns {{line, column, offset}|{line: *, column: *, offset: number}}
 */
parseJapaneseBasicPrototype.next = function (value) {
  var length = this.stringToArray(value).length
  this.offset += length
  this.column += length
  return this.now()
}

/**
 * Create position
 * @param value
 * @returns {{start: ({line, column, offset}|{line: *, column: *, offset: number}), end: ({line, column, offset}|{line: *, column: *, offset: number})}}
 */
parseJapaneseBasicPrototype.createPosition = function (value) {
  return {
    start: this.now(),
    end: this.next(value)
  }
}

/**
 * Create ParentNode for RootNode, SentenceNode and WordNode.
 * @param type
 * @returns {{type: string, children: Array}}
 */
parseJapaneseBasicPrototype.createParentNode = function (type) {
  var node = {
    type: type + 'Node',
    children: []
  }
  if (this.position) {
    node.position = {}
  }
  return node
}

/**
 * Create TextNode for SymbolNode, PunctuationNode, WhiteSpaceNode, SourceNode, and TextNode.
 * @param type
 * @param value
 * @returns {{type: string, value: *}}
 */
parseJapaneseBasicPrototype.createTextNode = function (type, value) {
  var node = {
    type: type + 'Node',
    value: value
  }
  if (this.position) {
    node.position = this.createPosition(value)
  }

  return node
}

/**
 * Add Node to ParentNode
 * @param node
 * @param parent
 */
parseJapaneseBasicPrototype.add = function (node, parent) {
  parent.children.push(node)
  if (this.position) {
    parent.position = {
      start: parent.children[0].position.start,
      end: node.position.end
    }
  }
}

/**
 * サロゲートペアに対応した配列化
 * @param value
 * @returns {Array|{index: number, input: string}|*|Array}
 */
parseJapaneseBasicPrototype.stringToArray = function (value) {
  return value.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || []
}

parseJapaneseBasicPrototype.useFirst = function () {
  throw new Error(
      'Illegal Invocation: Unsupported `useFirst` function.'
  )
}

/**
 * Expose.
 */

module.exports = ParseJapaneseBasic

},{"jaco":26}],26:[function(require,module,exports){
(function (global){
/*!
 * jaco - v1.2.1
 * Japanese Character Optimizer.
 * update: 2015-09-21
 * Author: YusukeHirao [http://jaco-project.github.io/docs/]
 * Repository: git@github.com:jaco-project/jaco-js.git
 * License: MIT
 */

(function () {
	'use strict';

	var global = this;

/**
* jacoモジュール
*
* 日本語やマルチバイト文字・ASCII文字を扱いやすくするためのモジュール
*
* 主に`Jaco`クラスのインスタンスを利用する
*
* ```
* var jSt = new jaco.Jaco("あいうえお");
* ```
*
*/
var jaco;
(function (jaco) {
    /**
    * 記号
    *
    * [!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]
    *
    */
    jaco.SIGN_CHARS = '\\u0020-\\u002F\\u003A-\\u0041\\u005B-\\u0061\\u007B-\\u007E';
    /**
    * 半角数字
    *
    * [0-9]
    *
    */
    jaco.DIGIT_CAHRS = '0-9';
    /**
    * 半角英字
    *
    * [A-Za-z]
    *
    */
    jaco.ALPHA_CHARS = 'A-Za-z';
    /**
    * 半角英数記号
    *
    * [!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~]
    *
    */
    jaco.ALPHANUMERIC_CHARS_WITH_SIGN = '\\u0020-\\u007E';
    /**
    * 全角記号
    *
    * [！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～]
    *
    */
    jaco.FULLWIDTH_SING_CHARS = '\\uFF01-\\uFF0F\\uFF1A-\\uFF20\\uFF3B-\\uFF40\\uFF5B-\\uFF5E';
    /**
    * 全角数字
    *
    * [０１２３４５６７８９]
    *
    */
    jaco.FULLWIDTH_DIGIT_CHARS = '\\uFF10-\\uFF19';
    /**
    * 全角英字
    *
    * [ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ]
    *
    */
    jaco.FULLWIDTH_ALPHA_CHARS = '\\uFF21-\\uFF3A\\uFF41-\\uFF5A';
    /**
    * 全角英数記号
    *
    * [！＂＃＄％＆＇（）＊＋，－．／０１２３４５６７８９：；＜＝＞？＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ［＼］＾＿｀ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｜｝～]
    *
    */
    jaco.FULLWIDTH_ALPHANUMERIC_CHARS_WITH_SIGN = '\\uFF01-\\uFF5F';
    /**
    * ひらがな
    *
    * [ぁ-ゖゝ-ゟ]
    *
    */
    jaco.HIRAGANA_CHARS = '\\u3041-\\u3096\\u309D-\\u309F';
    /**
    * ひらがな（繰り返し記号・合字なし）
    *
    * [ぁ-ゖ]
    *
    */
    jaco.HIRAGANA_CHARS_IGNORE_ITERATION_MARKS = '\\u3041-\\u3096';
    /**
    * カタカナ
    *
    * [ァ-ヺヽ-ヿ]
    *
    */
    jaco.KATAKANA_CHARS = '\\u30A1-\\u30FA\\u30FD\\u30FF';
    /**
    * カタカナ（繰り返し記号・合字なし）
    *
    * [ァ-ヺ]
    *
    */
    jaco.KATAKANA_CHARS_IGNORE_ITERATION_MARKS = '\\u30A1-\\u30FA';
    /**
    * 濁点／半濁点(結合文字含む)・長音符
    *
    * [゛゜ー]
    *
    */
    jaco.KANA_COMMON_CAHRS = '\u3099-\u309C\u30FC';
    /**
    * 日本語で使用される記号
    *
    * [　、。〃〄々〆〇〈〉《》「」『』【】〒〓〔〕〖〗〘〙〚〛〜〝〞〟〠〡〢〣〤〥〦〧〨〩〪〭〮〯〫〬〰〱〲〳〴〵〶・～]
    *
    * [波ダッシュ・全角チルダ問題](http://goo.gl/w1xV9Z)があるため 全角チルダを含めることとする
    *
    */
    jaco.JAPANESE_SIGN_CHARS = '\u3000-\u3036\u30FB\\uFF5E';
    /**
    * 半角カタカナ
    *
    * 濁点／半濁点は分解されているのでそれを含む
    * ヰヱの半角は存在しないので対象外
    *
    * [ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ]
    *
    */
    jaco.NARROW_KATAKANA_CHARS = '\\uFF66-\\uFF9F';
    /**
    * 半角の日本語で使用される記号
    *
    * [｡｢｣､･]
    *
    */
    jaco.NARROW_JAPANESE_SIGN_CHARS = '\\uFF61-\\uFF65';
    /**
    * スペース
    *
    * 仕様上、実際には「\u0009\u0020\u00A0\u2002〜\u200B\u3000\uFEFF'」すべて「\s」に含まれる
    *
    */
    jaco.SPACE_CHARS = '\\s\\n\\t\\u0009\\u0020\\u00A0\\u2002-\\u200B\\u3000\\uFEFF';
    /**
    * ひらがな化
    *
    * @version 0.1.0
    * @since 0.1.0
    * @param str 対象の文字列
    * @param isCombinate 濁点・半濁点を結合文字にするかどうか
    * @return ひらがな化された文字列
    */
    function hiraganize(str, isCombinate) {
        if (isCombinate === void 0) { isCombinate = false; }
        return new jaco.Jaco(str).toHiragana(isCombinate).toString();
    }
    jaco.hiraganize = hiraganize;
    /**
    * カタカナ化
    *
    * @version 0.1.0
    * @since 0.1.0
    * @param str 対象の文字列
    * @param isCombinate 濁点・半濁点を結合文字にするかどうか
    * @return カタカナ化された文字列
    */
    function katakanize(str, toWide) {
        if (toWide === void 0) { toWide = true; }
        return new jaco.Jaco(str).toKatakana(toWide).toString();
    }
    jaco.katakanize = katakanize;
    /**
    * ひらがなだけで構成されているかどうか
    *
    * @version 1.1.0
    * @since 1.1.0
    * @param str 対象の文字列
    * @return ひらがなだけで構成されているかどうか
    */
    function hiraganaOnly(str) {
        return new jaco.Jaco(str).isOnlyHiragana();
    }
    jaco.hiraganaOnly = hiraganaOnly;
    /**
    * カタカナだけで構成されているかどうか
    *
    * @version 1.1.0
    * @since 1.1.0
    * @param str 対象の文字列
    * @return カタカナだけで構成されているかどうか
    */
    function katakanaOnly(str) {
        return new jaco.Jaco(str).isOnlyKatakana();
    }
    jaco.katakanaOnly = katakanaOnly;
    /**
    * 配列の五十音順ソートをする
    * JIS X 4061 [日本語文字列照合順番](http://goo.gl/Mw8ja) に準ずる
    *
    * @version 1.1.0
    * @since 1.1.0
    * @param array 対象の配列
    * @return 五十音順にソートされた配列
    */
    function naturalKanaSort(array) {
        return array.sort(jaco.naturalKanaOrder);
    }
    jaco.naturalKanaSort = naturalKanaSort;
    /**
    * 配列の五十音順ソートをするためのソート関数
    * JIS X 4061 [日本語文字列照合順番](http://goo.gl/Mw8ja) に準ずる
    *
    * @version 1.1.0
    * @since 1.1.0
    * @param string Array.prototype.sort から渡される配列要素
    * @param string Array.prototype.sort から渡される配列要素
    * @return 比較数値
    */
    function naturalKanaOrder(a, b) {
        // 完全に一致ならば比較の必要なし
        if (a === b) {
            return 0;
        }
        var _a = new jaco.Jaco(a).toNarrow().toPhoeticKana();
        var _b = new jaco.Jaco(b).toNarrow().toPhoeticKana();
        var __a; // tempString
        var __b; // tempString
        var phoneticA = _a.toString();
        var phoneticB = _b.toString();
        var unvoicedA = _a.removeVoicedMarks(true).toString();
        var unvoicedB = _b.removeVoicedMarks(true).toString();
        var codeA = convertNaturalKanaOrderNumberPhase1(unvoicedA);
        var codeB = convertNaturalKanaOrderNumberPhase1(unvoicedB);
        var i = 0;
        var l = Math.max(a.length, b.length);
        var rSpecificPhoneticSign = /[ーぁぃぅぇぉっゃゅょゎァィゥェォヵㇰヶㇱㇲッㇳㇴㇵㇶㇷㇸㇹㇺャュョㇻㇼㇽㇾㇿヮゝゞヽヾ]/;
        // 濁音・半濁音をのぞいたよみがなで比較
        if (codeA < codeB) {
            return -1;
        }
        else if (codeA > codeB) {
            return 1;
        }
        else {
            // 上記比較が全く同じであれば
            // 一文字ずつ比較する
            for (; i < l; i++) {
                if (rSpecificPhoneticSign.test(a[i]) || rSpecificPhoneticSign.test(b[i])) {
                    // 片方が「ーぁぃぅぇぉっゃゅょゎァィゥェォヵㇰヶㇱㇲッㇳㇴㇵㇶㇷㇸㇹㇺャュョㇻㇼㇽㇾㇿヮゝゞヽヾ」に該当する場合
                    __a = convertNaturalKanaOrderNumberPhase2(a[i]);
                    __b = convertNaturalKanaOrderNumberPhase2(b[i]);
                    if (__a < __b) {
                        return -1;
                    }
                    else if (__a > __b) {
                        return 1;
                    }
                }
                else {
                    // 平音・濁音・半濁音で比較
                    if (phoneticA[i] < phoneticB[i]) {
                        return -1;
                    }
                    else if (phoneticB[i] < phoneticA[i]) {
                        return 1;
                    }
                }
            }
            // もう一度、頭から一文字ずつ比較する
            for (i = 0; i < l; i++) {
                // ひらがな・カタカナで比較
                __a = jaco.hiraganaOnly(a[i]) ? '0' : '1';
                __b = jaco.hiraganaOnly(b[i]) ? '0' : '1';
                if (__a < __b) {
                    return -1;
                }
                else if (__a > __b) {
                    return 1;
                }
            }
            return 0;
        }
    }
    jaco.naturalKanaOrder = naturalKanaOrder;
    /**
    * ソートのために内部コードを擬似的に置き換える フェーズ1
    *
    * 「あ」「い」「う」「え」「お」
    * 「か」「き」「く」「け」「こ」
    * 「さ」「し」「す」「せ」「そ」
    * 「た」「ち」「つ」「て」「と」
    * 「な」「に」「ぬ」「ね」「の」
    * 「は」「ひ」「ふ」「へ」「ほ」
    * 「ま」「み」「む」「め」「も」
    * 「や」「ゆ」「よ」
    * 「ら」「り」「る」「れ」「ろ」
    * 「わ」「ゐ」「ゑ」「を」「ん」
    * 「ゝ」「ー」
    * 上記の順にならぶように擬似的に文字のコード数値を変換する
    *
    * @version 1.1.0
    * @since 1.1.0
    * @param string 変換する文字列
    * @return 変換された文字列
    */
    function convertNaturalKanaOrderNumberPhase1(str) {
        return new jaco.Jaco(str).replaceMap({
            'あ': '\u3041',
            'い': '\u3042',
            'う': '\u3043',
            'え': '\u3044',
            'お': '\u3045',
            'か': '\u3046',
            'き': '\u3047',
            'く': '\u3048',
            'け': '\u3049',
            'こ': '\u304A',
            'さ': '\u304B',
            'し': '\u304C',
            'す': '\u304D',
            'せ': '\u304E',
            'そ': '\u304F',
            'た': '\u3050',
            'ち': '\u3052',
            'つ': '\u3053',
            'て': '\u3054',
            'と': '\u3055',
            'な': '\u3056',
            'に': '\u3057',
            'ぬ': '\u3058',
            'ね': '\u3059',
            'の': '\u305A',
            'は': '\u305B',
            'ひ': '\u305C',
            'ふ': '\u305D',
            'へ': '\u305E',
            'ほ': '\u305F',
            'ま': '\u3060',
            'み': '\u3061',
            'む': '\u3062',
            'め': '\u3063',
            'も': '\u3064',
            'や': '\u3065',
            'ゆ': '\u3066',
            'よ': '\u3067',
            'ら': '\u3068',
            'り': '\u3069',
            'る': '\u306A',
            'れ': '\u306B',
            'ろ': '\u306C',
            'わ': '\u306D',
            'ゐ': '\u306E',
            'ゑ': '\u306F',
            'を': '\u3070',
            'ん': '\u3071',
            'ゝ': '\u3072',
            'ー': '\u3073'
        }).toString();
    }
    /**
    * ソートのために内部コードを擬似的に置き換える フェーズ2
    *
    * 長音符→小書き文字→繰り返し記号→通常文字の順に並ぶようにコードを調整
    *
    * @version 1.1.0
    * @since 1.1.0
    * @param string 変換する文字（一文字しか受け取らない予定）
    * @return 変換された文字列
    */
    function convertNaturalKanaOrderNumberPhase2(str) {
        // naturalKanaOrder関数で使用される場合は str は一文字想定
        var result = str
            .replace('ー', '0')
            .replace(/[ぁぃぅぇぉっゃゅょゎァィゥェォヵㇰヶㇱㇲッㇳㇴㇵㇶㇷㇸㇹㇺャュョㇻㇼㇽㇾㇿヮ]/, function ($0) {
            return $0.charCodeAt(0).toString(16);
        })
            .replace('ゝ', '4000')
            .replace('ヽ', '4001')
            .replace('ゞ', '4002')
            .replace('ヾ', '4003')
            .replace(/[^0-9]/, '9000');
        return result;
    }
})(jaco || (jaco = {}));
var jaco;
(function (jaco) {
    /**
    * ## Jacoクラス
    *
    * 日本語やマルチバイト文字・ASCII文字を扱いやすくするためのラッパークラス
    *
    * 文字列クラスを継承してはいないがメソッドは同等のものが実装されている。
    * ただし基本的にほとんどのメソッドが破壊的メソッドかつチェインナブルである。
    *
    * @version 0.5.0
    * @since 0.1.0
    */
    var Jaco = (function () {
        /**
        * コンストラクタ
        *
        * ```javascript
        * var a = new Jaco("あああ");
        *
        * // newなしでも生成できる
        * var b = Jaco("あああ");
        * ```
        *
        * @version 0.2.0
        * @since 0.1.0
        * @param str 対象の文字列
        */
        function Jaco(str) {
            if (!(this instanceof Jaco)) {
                return new Jaco(str);
            }
            this._str = str.toString();
        }
        /**
        * 明示もしくは暗黙の文字列変換メソッド
        *
        * @version 0.1.0
        * @since 0.1.0
        * @return インスタンス自身が保持する文字列
        */
        Jaco.prototype.toString = function () {
            return this._str;
        };
        /**
        * 暗黙の値変換に呼び出されるメソッド
        *
        * @version 0.1.0
        * @since 0.1.0
        * @return インスタンス自身が保持する文字列
        */
        Jaco.prototype.valueOf = function () {
            return this.toString();
        };
        /**
        * 文字列連結をおこなう
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return インスタンス自身
        */
        Jaco.prototype.concat = function () {
            var likeStrings = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                likeStrings[_i - 0] = arguments[_i];
            }
            this._str += likeStrings.join('');
            return this;
        };
        /**
        * 文字列をパターンで置換する
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param pattern  対象のパターン
        * @param replacement 置換する文字列
        * @return インスタンス自身
        */
        Jaco.prototype.replace = function (pattern, replacement) {
            // TODO: replaceメソッドの型が (string | RexExp) だとコンパイルエラー TSv1.4.1時点
            this._str = this._str.replace(pattern, replacement);
            return this;
        };
        /**
        * 文字位置による抽出
        * (非破壊的メソッド)
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param from 開始インデックス
        * @param to 終了インデックス 省略すると最後まで
        * @return 抽出した文字列からなるJacoインスタンス
        */
        Jaco.prototype.slice = function (from, to) {
            return new Jaco(this._str.slice(from, to));
        };
        /**
        * 指定した位置から指定した数だけ文字列を抽出
        * (非破壊的メソッド)
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param start 開始インデックス
        * @param length 指定数
        * @return 抽出した文字列からなるJacoインスタンス
        */
        Jaco.prototype.substr = function (start, length) {
            return new Jaco(this._str.slice(start, length));
        };
        /**
        * 指定した位置の間の文字列を抽出
        * (非破壊的メソッド)
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param indexA インデックス
        * @param indexB インデックス
        * @return 抽出した文字列からなるJacoインスタンス
        */
        Jaco.prototype.substring = function (indexA, indexB) {
            return new Jaco(this._str.substring(indexA, indexB));
        };
        /**
        * 英字の大文字を小文字に変換する
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return インスタンス自身
        */
        Jaco.prototype.toLowerCase = function () {
            this._str = this._str.toLowerCase();
            return this;
        };
        /**
        * 英字の小文字を大文字に変換する
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return インスタンス自身
        */
        Jaco.prototype.toUpperCase = function () {
            this._str = this._str.toUpperCase();
            return this;
        };
        /**
        * 文字列を取り除く
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param pattern 取り除く文字列
        * @return インスタンス自身
        */
        Jaco.prototype.remove = function (pattern) {
            return this.replace(pattern, '');
        };
        /**
        * 先頭と末尾の空白を取り除く
        *
        * [\s]で判定するのでほとんどの空白文字はヒットする
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return インスタンス自身
        */
        Jaco.prototype.trim = function () {
            return this.remove(/^\s*|\s*$/g);
        };
        /**
        * 文字列の長さを返す
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return 文字列数
        */
        Jaco.prototype.size = function () {
            return this._str.length;
        };
        /**
        * 文字列のバイトサイズを返す
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return バイト数
        */
        Jaco.prototype.byteSize = function () {
            return encodeURIComponent(this._str).replace(/%../g, 'x').length;
        };
        /**
        * 文字が空かどうか
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return 結果の真偽
        */
        Jaco.prototype.isEmpty = function () {
            return this._str === '';
        };
        /**
        * コピーを生成する
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return コピー
        */
        Jaco.prototype.clone = function () {
            return new Jaco(this._str);
        };
        /**
        * パターンとマッチするかどうか
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param pattern パターン
        * @return 結果の真偽
        */
        Jaco.prototype.test = function (pattern) {
            var res;
            if (typeof pattern === 'string') {
                res = this._str === pattern;
            }
            else {
                res = pattern.test(this._str);
            }
            return res;
        };
        /**
        * 前方結合
        *
        * ```javascript
        * new Jaco("あああ").prepend("いいい").toString() // => "いいいあああ"
        * ```
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param element 結合する文字列
        * @return インスタンス自身
        */
        Jaco.prototype.prepend = function (element) {
            this._str = new Jaco(element).concat(this).toString();
            return this;
        };
        /**
        * 後方結合
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param element 結合する文字列
        * @return インスタンス自身
        */
        Jaco.prototype.append = function (element) {
            return this.concat(element);
        };
        /**
        * 完全マッチ
        *
        * @version 0.2.0
        * @since 0.2.0
        * @param target 比較する文字列
        * @return 結果の真偽
        */
        Jaco.prototype.is = function (target) {
            return this._str === target.toString();
        };
        /**
        * 該当の文字を含んでいるかどうか
        *
        * @version 0.3.0
        * @since 0.3.0
        * @param target 比較する文字列
        * @return 結果の真偽
        */
        Jaco.prototype.has = function (target) {
            return this._str.indexOf(target.toString()) !== -1;
        };
        /**
        * 該当の文字だけで構成されているかどうか
        *
        * @version 1.1.0
        * @since 0.2.0
        * @param characters 文字セット
        * @return 結果の真偽
        */
        Jaco.prototype.isOnly = function (characters) {
            return this.test(new RegExp('^[' + characters + ']+$', 'gm'));
        };
        /**
        * ひらがなだけで構成されているかどうか
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return 結果の真偽
        */
        Jaco.prototype.isOnlyHiragana = function () {
            return this.isOnly(jaco.HIRAGANA_CHARS + jaco.KANA_COMMON_CAHRS);
        };
        /**
        * カタカナだけで構成されているかどうか
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return 結果の真偽
        */
        Jaco.prototype.isOnlyKatakana = function () {
            return this.isOnly(jaco.KATAKANA_CHARS + jaco.KANA_COMMON_CAHRS);
        };
        /**
        * 数字だけで構成されているかどうか
        *
        * @version 0.5.0
        * @since 0.5.0
        * @param negative 負の数値も含めてチェックするかどうか
        * @param floatingPoint 小数としてチェックするかどうか
        * @return 結果の真偽
        */
        Jaco.prototype.isNumeric = function (negative, floatingPoint) {
            if (negative === void 0) { negative = true; }
            if (floatingPoint === void 0) { floatingPoint = true; }
            var pattern = '^';
            if (negative) {
                pattern += '-?';
            }
            if (floatingPoint) {
                pattern += '(?:[0-9]*\\.)?';
            }
            pattern += '[0-9]+$';
            return this.test(toRegExp(pattern));
        };
        /**
        * 数値に変換する
        *
        * @version 0.2.0
        * @since 0.2.0
        * @return 数値
        */
        Jaco.prototype.toNumber = function () {
            return parseFloat(this._str);
        };
        /**
        * 数字に変換する
        *
        * @version 0.5.0
        * @since 0.5.0
        * @param negative 負の値を許可してマイナスをつけるかどうか
        * @param floatingPoint 小数を許可してドットをつけるかどうか
        * @return インスタンス自身
        */
        Jaco.prototype.toNumeric = function (negative, floatingPoint) {
            if (negative === void 0) { negative = false; }
            if (floatingPoint === void 0) { floatingPoint = false; }
            // 半角化
            this.toNarrow();
            // 数字・ハイフン（マイナス）・ドット意外を削除
            this.remove(/[^0-9\.\-]/gm);
            if (negative) {
                // 最初のにくるハイフンをnに一時的に変換
                this.replace(/^-/, 'n');
            }
            // ハイフンを全て削除
            this.remove(/-/g);
            if (negative) {
                // ハイフンを元に戻す
                this.replace('n', '-');
            }
            if (floatingPoint) {
                // 文字列中で一番最初にくるドットを_に一時的に変換
                this.replace(/\.([0-9])/, '_$1');
            }
            // ドットを全て削除
            this.remove(/\./g);
            if (floatingPoint) {
                // ドットを元に戻す
                this.replace('_', '.');
            }
            return this;
        };
        /**
        * [非推奨] 濁点・半濁点を結合文字に変換
        *
        * メソッド名変更およびAPI更新につき非推奨
        *
        * @deprecated v2.0.0削除予定
        * @see [combinateSoundMarks](#combinatesoundmarks)
        * @version 0.2.0
        * @since 0.1.0
        * @return インスタンス自身
        */
        Jaco.prototype.combinate = function () {
            // 濁点・半濁点を結合文字に変換
            return this.replaceMap({
                // 濁点
                '\u309B': '\u3099',
                // 半濁点
                '\u309C': '\u309A'
            });
        };
        /**
        * 濁点・半濁点を結合するか、もしくは結合文字に変換
        *
        * @deprecated
        * @version 1.2.0
        * @since 1.2.0
        * @return インスタンス自身
        */
        Jaco.prototype.combinateSoundMarks = function (isConvertCombiningSoundMarks) {
            if (isConvertCombiningSoundMarks === void 0) { isConvertCombiningSoundMarks = false; }
            if (!isConvertCombiningSoundMarks) {
                // 濁点・半濁点を結合文字に変換
                this.combinateSoundMarks(true);
                // 濁点・半濁点を結合する
                return this.replaceMap({
                    // 濁点
                    'か\u3099': 'が', 'き\u3099': 'ぎ', 'く\u3099': 'ぐ', 'け\u3099': 'げ', 'こ\u3099': 'ご',
                    'さ\u3099': 'ざ', 'し\u3099': 'じ', 'す\u3099': 'ず', 'せ\u3099': 'ぜ', 'そ\u3099': 'ぞ',
                    'た\u3099': 'だ', 'ち\u3099': 'ぢ', 'つ\u3099': 'づ', 'て\u3099': 'で', 'と\u3099': 'ど',
                    'は\u3099': 'ば', 'ひ\u3099': 'び', 'ふ\u3099': 'ぶ', 'へ\u3099': 'べ', 'ほ\u3099': 'ぼ',
                    'カ\u3099': 'ガ', 'キ\u3099': 'ギ', 'ク\u3099': 'グ', 'ケ\u3099': 'ゲ', 'コ\u3099': 'ゴ',
                    'サ\u3099': 'ザ', 'シ\u3099': 'ジ', 'ス\u3099': 'ズ', 'セ\u3099': 'ゼ', 'ソ\u3099': 'ゾ',
                    'タ\u3099': 'ダ', 'チ\u3099': 'ヂ', 'ツ\u3099': 'ヅ', 'テ\u3099': 'デ', 'ト\u3099': 'ド',
                    'ハ\u3099': 'バ', 'ヒ\u3099': 'ビ', 'フ\u3099': 'ブ', 'ヘ\u3099': 'ベ', 'ホ\u3099': 'ボ',
                    'ワ\u3099': 'ヷ', 'イ\u3099': 'ヸ', 'ウ\u3099': 'ヴ', 'エ\u3099': 'ヹ', 'ヺ\u3099': 'ヲ',
                    'ゝ\u3099': 'ゞ', 'ヽ\u3099': 'ヾ',
                    // 半濁点
                    'は\u309A': 'ぱ', 'ひ\u309A': 'ぴ', 'ふ\u309A': 'ぷ', 'へ\u309A': 'ぺ', 'ほ\u309A': 'ぽ',
                    'ハ\u309A': 'パ', 'ヒ\u309A': 'ピ', 'フ\u309A': 'プ', 'ヘ\u309A': 'ペ', 'ホ\u309A': 'ポ'
                });
            }
            else {
                // 濁点・半濁点を結合文字に変換
                return this.replaceMap({
                    // 濁点
                    '\u309B': '\u3099',
                    // 半濁点
                    '\u309C': '\u309A'
                });
            }
        };
        /**
        * ひらがなに変換する
        *
        * @version 0.2.0
        * @since 0.1.0
        * @param isCombinate 濁点・半濁点を結合文字にするかどうか
        * @return インスタンス自身
        */
        Jaco.prototype.toHiragana = function (isCombinate) {
            if (isCombinate === void 0) { isCombinate = false; }
            // 半角カタカナを全角カタカナへ
            this.toWideKatakana();
            // ヷヸヹヺの変換
            this.replaceMap({
                'ヷ': 'わ゛',
                'ヸ': 'ゐ゛',
                'ヹ': 'ゑ゛',
                'ヺ': 'を゛'
            });
            // カタカナをひらがなへ(Unicodeの番号をずらす)
            this._shift(toPattern(jaco.KATAKANA_CHARS), -96);
            // 濁点・半濁点を結合文字に変換
            if (isCombinate) {
                this.combinateSoundMarks();
            }
            return this;
        };
        /**
        * カタカナに変換する
        *
        * @version 0.2.0
        * @since 0.1.0
        * @param toWide 半角カタカナを全角カタカナへ変換するかどうか
        * @return インスタンス自身
        */
        Jaco.prototype.toKatakana = function (toWide) {
            if (toWide === void 0) { toWide = true; }
            // 半角カタカナを全角カタカナへ
            if (toWide) {
                this.toWideKatakana();
            }
            // わ゛=> ヷ (濁点3種類対応)
            this.replace(/\u308F(?:\u309B|\u3099|\uFF9E)/g, '\u30F7');
            // ゐ゛=> ヸ (濁点3種類対応)
            this.replace(/\u3090(?:\u309B|\u3099|\uFF9E)/g, '\u30F8');
            // ゑ゛=> ヹ (濁点3種類対応)
            this.replace(/\u3091(?:\u309B|\u3099|\uFF9E)/g, '\u30F9');
            // を゛=> ヺ (濁点3種類対応)
            this.replace(/\u3092(?:\u309B|\u3099|\uFF9E)/g, '\u30FA');
            // ひらがなをカタカナへ(Unicodeの番号をずらす)
            this._shift(toPattern(jaco.HIRAGANA_CHARS), 96);
            return this;
        };
        /**
        * 半角カタカナに変換する
        *
        * @version 0.6.0
        * @since 0.1.0
        * @param fromHiragana ひらがなも変換する
        * @return インスタンス自身
        */
        Jaco.prototype.toNarrowKatakana = function (fromHiragana) {
            if (fromHiragana === void 0) { fromHiragana = false; }
            // ひらがなを一旦全角カタカナに変換する
            if (fromHiragana) {
                this.toKatakana();
            }
            // 濁点の変換 (全角濁点2種類対応)
            this.replace(/\u309B|\u3099/g, '\uFF9E');
            // 半濁点の変換 (全角半濁点2種類対応)
            this.replace(/\u309C|\u309A/g, '\uFF9F');
            // カタカナの変換
            this.replaceMap({
                'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ', 'ャ': 'ｬ',
                'ュ': 'ｭ', 'ョ': 'ｮ', 'ッ': 'ｯ',
                'ヵ': 'ｶ', 'ヶ': 'ｹ',
                'ヮ': 'ﾜ',
                'ー': 'ｰ',
                'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
                'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
                'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
                'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
                'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
                'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
                'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
                'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
                'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
                'ワ': 'ﾜ', 'ン': 'ﾝ', 'ヰ': 'ｲ', 'ヱ': 'ｴ', 'ヲ': 'ｦ',
                'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
                'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
                'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
                'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
                'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
                'ヷ': 'ﾜﾞ', 'ヸ': 'ｲﾞ', 'ヴ': 'ｳﾞ', 'ヹ': 'ｴﾞ', 'ヺ': 'ｦﾞ'
            });
            return this;
        };
        /**
        * 全角カタカナに変換する
        *
        * @version 0.2.0
        * @since 0.1.0
        * @return インスタンス自身
        */
        Jaco.prototype.toWideKatakana = function () {
            // カタカナ・濁点・半濁点の変換
            this.replaceMap({
                'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
                'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
                'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
                'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
                'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
                'ﾜﾞ': 'ヷ', 'ｲﾞ': 'ヸ', 'ｳﾞ': 'ヴ', 'ｴﾞ': 'ヹ', 'ｦﾞ': 'ヺ',
                'ﾞ': '゛', 'ﾟ': '゜',
                'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
                'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
                'ｯ': 'ッ', 'ｰ': 'ー',
                'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
                'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
                'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
                'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
                'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
                'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
                'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
                'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
                'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
                'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン'
            });
            return this;
        };
        /**
        * 日本語で使われる記号を半角に変換
        *
        * @version 0.4.0
        * @since 0.4.0
        * @return インスタンス自身
        */
        Jaco.prototype.toNarrowJapneseSymbol = function () {
            this.replaceMap({
                '。': '｡',
                '（': '(',
                '）': ')',
                '「': '｢',
                '」': '｣',
                '、': '､',
                '・': '･'
            });
            return this;
        };
        /**
        * 日本語で使われる記号を全角に変換
        *
        * @version 0.4.0
        * @since 0.4.0
        * @return インスタンス自身
        */
        Jaco.prototype.toWideJapneseSymbol = function () {
            this.replaceMap({
                '｡': '。',
                '\\(': '（',
                '\\)': '）',
                '｢': '「',
                '｣': '」',
                '､': '、',
                '･': '・'
            });
            return this;
        };
        /**
        * カタカナと日本語で使われる記号を半角に変換
        *
        * @version 0.4.0
        * @since 0.4.0
        * @return インスタンス自身
        */
        Jaco.prototype.toNarrowJapnese = function () {
            // 半角カタカナへ
            this.toNarrowKatakana();
            // 半角記号へ
            this.toNarrowJapneseSymbol();
            return this;
        };
        /**
        * カタカナと日本語で使われる記号を全角に変換
        *
        * @version 0.4.0
        * @since 0.4.0
        * @return インスタンス自身
        */
        Jaco.prototype.toWideJapnese = function () {
            // 全角カタカナへ
            this.toWideKatakana();
            // 全角記号へ
            this.toWideJapneseSymbol();
            return this;
        };
        /**
        * 半角に変換
        *
        * @version 0.4.0
        * @since 0.4.0
        * @return インスタンス自身
        */
        Jaco.prototype.toNarrow = function (convertJapaneseChars) {
            if (convertJapaneseChars === void 0) { convertJapaneseChars = false; }
            // スペースの変換
            this.replace(toPattern(jaco.SPACE_CHARS), ' ');
            // 半角英数記号の変換
            this._shift(toPattern(jaco.FULLWIDTH_ALPHANUMERIC_CHARS_WITH_SIGN), -65248);
            if (convertJapaneseChars) {
                // 日本語カタカナ記号の変換
                this.toNarrowJapnese();
            }
            return this;
        };
        /**
        * 全角に変換
        *
        * @version 0.4.0
        * @since 0.4.0
        * @return インスタンス自身
        */
        Jaco.prototype.toWide = function () {
            // スペースの変換
            this.replace(' ', '\u3000');
            // 日本語カタカナ記号の変換
            this.toWideJapnese();
            // 半角英数記号の変換
            this._shift(toPattern(jaco.ALPHANUMERIC_CHARS_WITH_SIGN), 65248);
            return this;
        };
        /**
        * 濁点を追加する
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return インスタンス自信
        */
        Jaco.prototype.addVoicedMarks = function () {
            // 濁点・半濁点単体の除去
            this.remove(/\u309B|\u3099|\uFF9E/g);
            this.remove(/\u309C|\u309A|\uFF9F/g);
            return this.replaceMap({
                'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
                'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
                'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
                'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
                'カ': 'ガ', 'キ': 'ギ', 'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ',
                'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ', 'ソ': 'ゾ',
                'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ヅ', 'テ': 'デ', 'ト': 'ド',
                'ハ': 'バ', 'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ',
                'ワ': 'ヷ', 'イ': 'ヸ', 'ウ': 'ヴ', 'エ': 'ヹ', 'ヺ': 'ヲ',
                'ゝ': 'ゞ', 'ヽ': 'ヾ'
            });
        };
        /**
        * 半濁点を追加する
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return インスタンス自信
        */
        Jaco.prototype.addSemivoicedMarks = function () {
            return this.replaceMap({
                'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
                'ハ': 'パ', 'ヒ': 'ピ', 'フ': 'プ', 'ヘ': 'ペ', 'ホ': 'ポ'
            });
        };
        /**
        * 濁点・半濁点を取り除く
        *
        * @version 1.1.0
        * @since 1.1.0
        * @param ignoreSingleMark 単体の濁点・半濁点を除去するかどうか
        * @return インスタンス自信
        */
        Jaco.prototype.removeVoicedMarks = function (ignoreSingleMark) {
            if (ignoreSingleMark === void 0) { ignoreSingleMark = false; }
            if (!ignoreSingleMark) {
                // 濁点・半濁点単体の除去
                this.remove(/\u309B|\u3099|\uFF9E/g);
                this.remove(/\u309C|\u309A|\uFF9F/g);
            }
            return this.replaceMap({
                'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
                'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
                'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
                'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
                'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
                'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
                'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
                'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
                'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
                'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
                'ヷ': 'ワ', 'ヸ': 'イ', 'ヴ': 'ウ', 'ヹ': 'エ', 'ヺ': 'ヲ',
                'ゞ': 'ゝ', 'ヾ': 'ヽ'
            });
        };
        /**
        * 長音符をかなに置き換える
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return インスタンス自信
        */
        Jaco.prototype.convertProlongedSoundMarks = function () {
            var kanaWithProlongedSoundMarksPattern = new RegExp('[' + jaco.HIRAGANA_CHARS + jaco.KATAKANA_CHARS + ']ー');
            var converted = this._str;
            var conv = function (_str) {
                _str = _str.replace(/([あぁかゕがさざただなはばぱまやゃらわゎ])ー/g, '$1あ')
                    .replace(/([いぃきぎしじちぢにひびぴみりゐ])ー/g, '$1い')
                    .replace(/([うぅゔくぐすずつづぬふぶぷむゆゅる])ー/g, '$1う')
                    .replace(/([えぇけゖげせぜてでねへべぺめれゑ])ー/g, '$1え')
                    .replace(/([おぉこごそぞとどのほぼぽもよょろを])ー/g, '$1お')
                    .replace(/んー/g, 'んん')
                    .replace(/っー/g, 'っっ')
                    .replace(/([アァカヵガサザタダナハバパマヤャラワヮヷ])ー/g, '$1ア')
                    .replace(/([イィキギシジチヂニヒビピミリヰヸ])ー/g, '$1イ')
                    .replace(/([ウゥヴクグスズツヅヌフブプムユュル])ー/g, '$1ウ')
                    .replace(/([エェケヶゲセゼテデネヘベペメレヱヹ])ー/g, '$1エ')
                    .replace(/([オォコゴソゾトドノホボポモヨョロヲヺ])ー/g, '$1オ')
                    .replace(/ンー/g, 'ンン')
                    .replace(/ッー/g, 'ッッ');
                return _str;
            };
            while (kanaWithProlongedSoundMarksPattern.test(converted)) {
                converted = conv(converted);
            }
            this._str = converted;
            return this;
        };
        /**
        * 繰り返し記号をかなに置き換える
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return インスタンス自信
        */
        Jaco.prototype.convertIterationMarks = function () {
            var kanaWithIterationMarks = new RegExp('([' +
                jaco.HIRAGANA_CHARS_IGNORE_ITERATION_MARKS +
                jaco.KATAKANA_CHARS_IGNORE_ITERATION_MARKS +
                '])([ゝゞヽヾ])');
            var conv = function (_str) {
                return _str.replace(kanaWithIterationMarks, function ($0, $1, $2) {
                    var beforeString = $1;
                    var converted = new jaco.Jaco($1).removeVoicedMarks();
                    var iterationMark = $2;
                    switch (iterationMark) {
                        case 'ゝ': {
                            converted.toHiragana();
                            break;
                        }
                        case 'ヽ': {
                            converted.toKatakana();
                            break;
                        }
                        case 'ゞ': {
                            converted.toHiragana().addVoicedMarks();
                            break;
                        }
                        case 'ヾ': {
                            converted.toKatakana().addVoicedMarks();
                            break;
                        }
                    }
                    return beforeString + converted;
                });
            };
            while (kanaWithIterationMarks.test(this._str)) {
                this._str = conv(this._str);
            }
            return this;
        };
        /**
        * 小書き文字を基底文字に変換する
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return インスタンス自身
        */
        Jaco.prototype.toBasicLetter = function () {
            this
                .combinateSoundMarks()
                .replaceMap({
                'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
                'っ': 'つ',
                'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
                'ゎ': 'わ',
                'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
                'ヵ': 'カ', 'ㇰ': 'ク', 'ヶ': 'ケ',
                'ㇱ': 'シ', 'ㇲ': 'ス',
                'ッ': 'ツ', 'ㇳ': 'ト',
                'ㇴ': 'ヌ', 'ㇵ': 'ハ',
                'ㇶ': 'ヒ', 'ㇷ': 'フ', 'ㇸ': 'ヘ', 'ㇹ': 'ホ',
                'ㇺ': 'ム',
                'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
                'ㇻ': 'ラ', 'ㇼ': 'リ', 'ㇽ': 'ル', 'ㇾ': 'レ', 'ㇿ': 'ロ',
                'ヮ': 'ワ'
            });
            return this;
        };
        /**
        * 小書き文字を含むかどうか
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return 小書き文字を含むかどうか
        */
        Jaco.prototype.hasSmallLetter = function () {
            return /[ぁぃぅぇぉっゃゅょゎァィゥェォヵㇰヶㇱㇲッㇳㇴㇵㇶㇷㇸㇹㇺャュョㇻㇼㇽㇾㇿヮ]/.test(this._str);
        };
        /**
        * よみの文字に変換する
        * JIS X 4061 [日本語文字列照合順番](http://goo.gl/Mw8ja) に準ずる
        *
        * @version 1.1.0
        * @since 1.1.0
        * @return インスタンス自身
        */
        Jaco.prototype.toPhoeticKana = function () {
            this
                .toHiragana()
                .toBasicLetter()
                .convertProlongedSoundMarks()
                .convertIterationMarks();
            return this;
        };
        /**
        * キーがパターン・値が置換文字列のハッシュマップによって置換する
        *
        * @version 0.1.1
        * @since 0.1.0
        * @param  convMap キーがパターン・値が置換文字列のハッシュマップ
        * @return インスタンス自身
        */
        Jaco.prototype.replaceMap = function (convMap) {
            var needle;
            var replace;
            for (needle in convMap) {
                if (convMap.hasOwnProperty(needle)) {
                    replace = convMap[needle];
                    this._str = this._str.replace(toRegExp(needle), replace);
                }
            }
            return this;
        };
        /**
        * 文字列中のそれぞれのひと文字に対してUnicode番号を指定の数値ずらす
        *
        * @version 0.2.0
        * @since 0.1.0
        * @param needle 対象のパターン
        * @param shiftNum ずらす数値
        * @return インスタンス自身
        */
        Jaco.prototype._shift = function (needle, shiftNum) {
            this._str = this._str.replace(needle, function (char) {
                return String.fromCharCode(char.charCodeAt(0) + shiftNum);
            });
            return this;
        };
        return Jaco;
    })();
    jaco.Jaco = Jaco;
    /**
    * キャラクターリストを正規表現に変換する
    *
    * @version 0.1.0
    * @since 0.1.0
    * @param chars 文字の集合
    * @return 正規表現化された文字セット
    */
    function toPattern(chars) {
        return new RegExp('[' + chars + ']', 'g');
    }
    /**
    * 文字列を正規表現に変換する
    *
    * @version 0.1.0
    * @since 0.1.0
    * @param str 対象の文字列
    * @param option 正規表現のオプション `"i"`:小大文字無視 `"g"`:すべてにマッチ `"m"`:複数行にマッチ
    * @return 正規表現化された文字
    */
    function toRegExp(str, option) {
        if (option === void 0) { option = 'igm'; }
        return new RegExp(str, option);
    }
})(jaco || (jaco = {}));
/// <reference path="../typings/bundle.d.ts" />
/// <reference path="jaco.ts" />
/// <reference path="jaco/Jaco.ts" />


	// Exports
	if ('process' in global) {
		module.exports = jaco;
	} else {
		global.jaco = jaco;
	}

}).call((this || 0).self || global);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],27:[function(require,module,exports){
/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer. All rights reserved.
 * @module unist:util:visit
 * @fileoverview Utility to recursively walk over unist nodes.
 */

'use strict';

/**
 * Walk forwards.
 *
 * @param {Array.<*>} values - Things to iterate over,
 *   forwards.
 * @param {function(*, number): boolean} callback - Function
 *   to invoke.
 * @return {boolean} - False if iteration stopped.
 */
function forwards(values, callback) {
    var index = -1;
    var length = values.length;

    while (++index < length) {
        if (callback(values[index], index) === false) {
            return false;
        }
    }

    return true;
}

/**
 * Walk backwards.
 *
 * @param {Array.<*>} values - Things to iterate over,
 *   backwards.
 * @param {function(*, number): boolean} callback - Function
 *   to invoke.
 * @return {boolean} - False if iteration stopped.
 */
function backwards(values, callback) {
    var index = values.length;
    var length = -1;

    while (--index > length) {
        if (callback(values[index], index) === false) {
            return false;
        }
    }

    return true;
}

/**
 * Visit.
 *
 * @param {Node} tree - Root node
 * @param {string} [type] - Node type.
 * @param {function(node): boolean?} callback - Invoked
 *   with each found node.  Can return `false` to stop.
 * @param {boolean} [reverse] - By default, `visit` will
 *   walk forwards, when `reverse` is `true`, `visit`
 *   walks backwards.
 */
function visit(tree, type, callback, reverse) {
    var iterate;
    var one;
    var all;

    if (typeof type === 'function') {
        reverse = callback;
        callback = type;
        type = null;
    }

    iterate = reverse ? backwards : forwards;

    /**
     * Visit `children` in `parent`.
     */
    all = function (children, parent) {
        return iterate(children, function (child, index) {
            return child && one(child, index, parent);
        });
    };

    /**
     * Visit a single node.
     */
    one = function (node, index, parent) {
        var result;

        index = index || (parent ? 0 : null);

        if (!type || node.type === type) {
            result = callback(node, index, parent || null);
        }

        if (node.children && result !== false) {
            return all(node.children, node);
        }

        return result;
    };

    one(tree);
}

/*
 * Expose.
 */

module.exports = visit;

},{}]},{},[1])(1)
});