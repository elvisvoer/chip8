// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require("moo");

const lexer = moo.compile({
    ws: /[ \t]+/,
    nl: { match: "\n", lineBreaks: true },
    ":=": ":=",
    "+=": "+=",
    "-=": "-=",
    "~=": "~=",
    "&=":   "&=",
    "|=": "|=",
    "^=": "^=",
    "<<": "<<",
    ">>": ">>",
    "==": "==",
    "!=": "!=",
    comment: {
        match: /#[^\n]*/,
        value: s => s.substring(1)
    },
    label: {
        match: /@[0-9a-z]+/,
    },
    hex_literal: {
      match: /0x[0-9a-z]+/,
    },
    identifier: {
      match: /[A-Z][A-Z0-9]*/,
      type: moo.keywords({
        "GOTO": "GOTO"
      })
    }
});


function tokenStart(token) {
    return {
        line: token.line,
        col: token.col - 1
    };
}

function tokenEnd(token) {
    const lastNewLine = token.text.lastIndexOf("\n");
    if (lastNewLine !== -1) {
        throw new Error("Unsupported case: token with line breaks");
    }
    return {
        line: token.line,
        col: token.col + token.text.length - 1
    };
}

function convertToken(token) {
    return {
        type: token.type,
        value: token.value,
        start: tokenStart(token),
        end: tokenEnd(token)
    };
}

function convertTokenId(data) {
    return convertToken(data[0]);
}

var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main", "symbols": ["lines"]},
    {"name": "lines", "symbols": ["lines", "newline", "line"], "postprocess": d => [...d[0], d[2]]},
    {"name": "lines", "symbols": ["lines", "newline"], "postprocess": d => d[0]},
    {"name": "lines", "symbols": ["line"], "postprocess": id},
    {"name": "line", "symbols": ["line_comment"]},
    {"name": "line", "symbols": ["statements"], "postprocess": d => d[0]},
    {"name": "line", "symbols": ["statements", "_", "comment"], "postprocess": d => d[0]},
    {"name": "line_comment", "symbols": ["comment"], "postprocess": d => ({...d[0], type: "line_comment"})},
    {"name": "statements", "symbols": ["statement"], "postprocess": d => d[0]},
    {"name": "statement", "symbols": ["hex", "__", "executable_statements"], "postprocess": d => d[2]},
    {"name": "statement", "symbols": ["label", "__", "executable_statements"], "postprocess": 
        d => ({
            type: "label_expression",
            label: d[0],
            arguments: d[2],
            start: d[0].start,
            end: d[0].end
        })
                     },
    {"name": "statement", "symbols": ["executable_statements"], "postprocess": d => d[0]},
    {"name": "executable_statements", "symbols": ["call_expression"]},
    {"name": "executable_statements", "symbols": ["goto_expression"]},
    {"name": "executable_statements", "symbols": ["binary_expr"]},
    {"name": "executable_statements", "symbols": ["hex"]},
    {"name": "goto_expression", "symbols": [{"literal":"GOTO"}, "__", "label"], "postprocess": 
        d => ({
            type: "goto_expression",
            name: d[0],
            label: d[2],
            start: d[0].start,
            end: d[0].end
        })
              },
    {"name": "call_expression", "symbols": ["identifier", "_", "expression_list"], "postprocess": 
        d => ({
            type: "call_expression",
            name: d[0],
            arguments: d[2],
            start: d[0].start,
            end: d[0].end
        })
              },
    {"name": "expression_list", "symbols": [], "postprocess": () => []},
    {"name": "expression_list", "symbols": ["expression", "_"], "postprocess": d => [d[0]]},
    {"name": "expression_list", "symbols": ["expression", "__", "expression_list", "_"], "postprocess": d => [d[0], ...d[2]]},
    {"name": "expression", "symbols": ["identifier"]},
    {"name": "expression", "symbols": ["hex"]},
    {"name": "expression", "symbols": ["boolean_expr"]},
    {"name": "binary_expr", "symbols": ["identifier", "_", "binary_op", "_", "expression"], "postprocess": 
        d => ({
            type: "binary_expr",
            name: d[0],
            operator: d[2],
            value: d[4],
            start: d[0].start,
            end: d[4].end
        })
              },
    {"name": "binary_op", "symbols": [{"literal":":="}]},
    {"name": "binary_op", "symbols": [{"literal":"+="}]},
    {"name": "binary_op", "symbols": [{"literal":"-="}]},
    {"name": "binary_op", "symbols": [{"literal":"~="}]},
    {"name": "binary_op", "symbols": [{"literal":"&="}]},
    {"name": "binary_op", "symbols": [{"literal":"|="}]},
    {"name": "binary_op", "symbols": [{"literal":"^="}]},
    {"name": "binary_op", "symbols": [{"literal":"<<"}]},
    {"name": "binary_op", "symbols": [{"literal":">>"}]},
    {"name": "binary_op", "symbols": [{"literal":"=="}]},
    {"name": "binary_op", "symbols": [{"literal":"!="}]},
    {"name": "boolean_expr", "symbols": ["identifier", "_", "boolean_op", "_", "expression"], "postprocess": 
        d => ({
            type: "boolean_expr",
            name: d[0],
            operator: d[2],
            value: d[4],
            start: d[0].start,
            end: d[4].end
        })
              },
    {"name": "boolean_op", "symbols": [{"literal":"=="}]},
    {"name": "boolean_op", "symbols": [{"literal":"!="}]},
    {"name": "comment", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": convertTokenId},
    {"name": "label", "symbols": [(lexer.has("label") ? {type: "label"} : label)], "postprocess": convertTokenId},
    {"name": "hex", "symbols": [(lexer.has("hex_literal") ? {type: "hex_literal"} : hex_literal)], "postprocess": convertTokenId},
    {"name": "identifier", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": convertTokenId},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]},
    {"name": "newline", "symbols": [{"literal":"\r"}, {"literal":"\n"}], "postprocess": () => []},
    {"name": "newline", "symbols": [{"literal":"\r"}], "postprocess": () => []},
    {"name": "newline", "symbols": [{"literal":"\n"}], "postprocess": () => []}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
