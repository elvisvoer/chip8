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
    "<<=": "<<=",
    ">>=": ">>=",
    lte: "<=",
    lt: "<",
    gte: ">=",
    gt: ">",
    eq: "==",
    lparan: "(",
    rparan: ")",
    comma: ",",
    lbracket: "[",
    rbracket: "]",
    lbrace: "{",
    rbrace: "}",
    plus: "+",
    minus: "-",
    multiply: "*",
    divide: "/",
    modulo: "%",
    colon: ":",
    comment: {
        match: /#[^\n]*/,
        value: s => s.substring(1)
    },
    string_literal: {
        match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
        value: s => JSON.parse(s)
    },
    hex_literal: {
        match: /0x[0-9a-fA-F]+/,
    },
    number_literal: {
        match: /[0-9]+(?:\.[0-9]+)?/,
        value: s => Number(s)
    },
    identifier: {
        match: /[a-zA-Z_][a-zA-Z_0-9]*/,
        type: moo.keywords({
            fun: "fun",
            proc: "proc",
            while: "while",
            for: "for",
            else: "else",
            in: "in",
            if: "if",
            return: "return",
            and: "and",
            or: "or",
            true: "true",
            false: "false"
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
    {"name": "input", "symbols": ["top_level_statements"], "postprocess": id},
    {"name": "top_level_statements", "symbols": ["top_level_statement"], "postprocess": 
        d => [d[0]]
                },
    {"name": "top_level_statements", "symbols": ["top_level_statement", "_", {"literal":"\n"}, "_", "top_level_statements"], "postprocess": 
        d => [
            d[0],
            ...d[4]
        ]
                },
    {"name": "top_level_statements", "symbols": ["_", {"literal":"\n"}, "top_level_statements"], "postprocess": 
        d => d[2]
                },
    {"name": "top_level_statements", "symbols": ["_"], "postprocess": 
        d => []
                },
    {"name": "top_level_statement", "symbols": ["fun_definition"], "postprocess": id},
    {"name": "top_level_statement", "symbols": ["proc_definition"], "postprocess": id},
    {"name": "top_level_statement", "symbols": ["line_comment"], "postprocess": id},
    {"name": "top_level_statement", "symbols": ["code_block"], "postprocess": id},
    {"name": "top_level_statement", "symbols": ["executable_statement"], "postprocess": id},
    {"name": "fun_definition", "symbols": [{"literal":"fun"}, "__", "identifier", "_", {"literal":"("}, "_", "parameter_list", "_", {"literal":")"}, "_", "code_block"], "postprocess": 
        d => ({
            type: "fun_definition",
            name: d[2],
            parameters: d[6],
            body: d[10],
            start: tokenStart(d[0]),
            end: d[10].end
        })
                },
    {"name": "proc_definition", "symbols": [{"literal":"proc"}, "__", "identifier", "_", {"literal":"("}, "_", "parameter_list", "_", {"literal":")"}, "_", "code_block"], "postprocess": 
        d => ({
            type: "proc_definition",
            name: d[2],
            parameters: d[6],
            body: d[10],
            start: tokenStart(d[0]),
            end: d[10].end
        })
                },
    {"name": "parameter_list", "symbols": [], "postprocess": () => []},
    {"name": "parameter_list", "symbols": ["identifier"], "postprocess": d => [d[0]]},
    {"name": "parameter_list", "symbols": ["identifier", "_", {"literal":","}, "_", "parameter_list"], "postprocess": 
        d => [d[0], ...d[4]]
                },
    {"name": "code_block", "symbols": [{"literal":"{"}, "executable_statements", {"literal":"}"}], "postprocess": 
        (d) => ({
            type: "code_block",
            statements: d[1],
            start: tokenStart(d[0]),
            end: tokenEnd(d[2])
        })
            },
    {"name": "executable_statements", "symbols": ["_"], "postprocess": () => []},
    {"name": "executable_statements", "symbols": ["_", {"literal":"\n"}, "executable_statements"], "postprocess": (d) => d[2]},
    {"name": "executable_statements", "symbols": ["_", "executable_statement", "_"], "postprocess": d => [d[1]]},
    {"name": "executable_statements", "symbols": ["_", "executable_statement", "_", {"literal":"\n"}, "executable_statements"], "postprocess": 
        d => [d[1], ...d[4]]
                },
    {"name": "executable_statement", "symbols": ["return_statement"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["asm_line"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["var_assignment"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["call_statement"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["line_comment"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["while_loop"], "postprocess": id},
    {"name": "return_statement", "symbols": [{"literal":"return"}, "__", "expression"], "postprocess": 
        d => ({
            type: "return_statement",
            value: d[2],
            start: tokenStart(d[0]),
            end: d[2].end
        })
               },
    {"name": "asm_line", "symbols": ["hex", "__", "asm_code"], "postprocess": 
        d => ({
            type: "asm_line",
            value: d[2],
            start: tokenStart(d[0]),
            end: d[2].end
        })
               },
    {"name": "asm_code", "symbols": ["identifier"], "postprocess": id},
    {"name": "asm_code", "symbols": ["hex"], "postprocess": id},
    {"name": "asm_code", "symbols": ["var_assignment"], "postprocess": id},
    {"name": "asm_code", "symbols": ["asm_cmd"], "postprocess": id},
    {"name": "asm_cmd", "symbols": ["identifier", "__", "asm_cmd_args"], "postprocess": 
        d => ({
            type: "asm_command",
            value: d[0],
            arguments: d[2],
            start: tokenStart(d[0]),
            end: d[2].end
        })
               },
    {"name": "asm_cmd_args", "symbols": [], "postprocess": () => []},
    {"name": "asm_cmd_args", "symbols": ["expression"], "postprocess": d => [d[0]]},
    {"name": "asm_cmd_args", "symbols": ["expression", "__", "asm_cmd_args"], "postprocess": 
        d => [d[0], ...d[2]]
                },
    {"name": "var_assignment", "symbols": ["identifier", "_", "assignment_op", "_", "expression"], "postprocess": 
        d => ({
            type: "var_assignment",
            var_name: d[0],
            operator: d[2],
            value: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "assignment_op", "symbols": [{"literal":":="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"+="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"-="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"~="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"&="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"|="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"^="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":"<<="}], "postprocess": d => d[0]},
    {"name": "assignment_op", "symbols": [{"literal":">>="}], "postprocess": d => d[0]},
    {"name": "call_statement", "symbols": ["call_expression"], "postprocess": id},
    {"name": "call_expression", "symbols": ["identifier", "_", {"literal":"("}, "argument_list", {"literal":")"}], "postprocess": 
        d => ({
            type: "call_expression",
            fun_name: d[0],
            arguments: d[3],
            start: d[0].start,
            end: tokenEnd(d[4])
        })
                },
    {"name": "while_loop", "symbols": [{"literal":"while"}, "__", "expression", "__", "code_block"], "postprocess": 
        d => ({
            type: "while_loop",
            condition: d[2],
            body: d[4],
            start: tokenStart(d[0]),
            end: d[4].end
        })
                },
    {"name": "argument_list", "symbols": [], "postprocess": () => []},
    {"name": "argument_list", "symbols": ["_", "expression", "_"], "postprocess": d => [d[1]]},
    {"name": "argument_list", "symbols": ["_", "expression", "_", {"literal":","}, "argument_list"], "postprocess": 
        d => [d[1], ...d[4]]
                },
    {"name": "expression", "symbols": ["boolean_expression"], "postprocess": id},
    {"name": "boolean_expression", "symbols": ["comparison_expression"], "postprocess": id},
    {"name": "boolean_expression", "symbols": ["comparison_expression", "_", "boolean_operator", "_", "boolean_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: convertToken(d[2]),
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "boolean_operator", "symbols": [{"literal":"and"}], "postprocess": id},
    {"name": "boolean_operator", "symbols": [{"literal":"or"}], "postprocess": id},
    {"name": "comparison_expression", "symbols": ["additive_expression"], "postprocess": id},
    {"name": "comparison_expression", "symbols": ["additive_expression", "_", "comparison_operator", "_", "comparison_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: d[2],
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "comparison_operator", "symbols": [{"literal":">"}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":">="}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"<"}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"<="}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"=="}], "postprocess": convertTokenId},
    {"name": "additive_expression", "symbols": ["multiplicative_expression"], "postprocess": id},
    {"name": "additive_expression", "symbols": ["multiplicative_expression", "_", /[+-]/, "_", "additive_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: convertToken(d[2]),
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "multiplicative_expression", "symbols": ["unary_expression"], "postprocess": id},
    {"name": "multiplicative_expression", "symbols": ["unary_expression", "_", /[*/%]/, "_", "multiplicative_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: convertToken(d[2]),
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "unary_expression", "symbols": ["number"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["hex"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["identifier"], "postprocess": 
        d => ({
            type: "var_reference",
            var_name: d[0],
            start: d[0].start,
            end: d[0].end
        })
                },
    {"name": "unary_expression", "symbols": ["call_expression"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["string_literal"], "postprocess": id},
    {"name": "unary_expression", "symbols": [{"literal":"("}, "expression", {"literal":")"}], "postprocess": 
        data => data[1]
                },
    {"name": "line_comment", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": convertTokenId},
    {"name": "string_literal", "symbols": [(lexer.has("string_literal") ? {type: "string_literal"} : string_literal)], "postprocess": convertTokenId},
    {"name": "hex", "symbols": [(lexer.has("hex_literal") ? {type: "hex_literal"} : hex_literal)], "postprocess": convertTokenId},
    {"name": "number", "symbols": [(lexer.has("number_literal") ? {type: "number_literal"} : number_literal)], "postprocess": convertTokenId},
    {"name": "identifier", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": convertTokenId},
    {"name": "_ml$ebnf$1", "symbols": []},
    {"name": "_ml$ebnf$1", "symbols": ["_ml$ebnf$1", "multi_line_ws_char"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_ml", "symbols": ["_ml$ebnf$1"]},
    {"name": "multi_line_ws_char", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "multi_line_ws_char", "symbols": [{"literal":"\n"}]},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]}
]
  , ParserStart: "input"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
