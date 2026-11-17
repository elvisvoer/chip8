@{%
const moo = require("moo");

const lexer = moo.compile({
    ws: {
        match: /(?:[ \t]+|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/,
        lineBreaks: true
    },
    nl: { match: "\n", lineBreaks: true },
    "==": "==",
    "!=": "!=",
    "&&": "&&",
    "||": "||",
    "=": "=",
    "+=": "+=",
    "-=": "-=",
    "~=": "~=",
    "&=":   "&=",
    "|=": "|=",
    "^=": "^=",
    "<<=": "<<=",
    ">>=": ">>=",
    "++": "++",
    "--": "--",
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
    semicolon: ";",
    string_literal: {
        match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
        value: s => JSON.parse(s)
    },
    binary_literal: {
        match: /0b[01]+/,
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
            do: "do",
            while: "while",
            for: "for",
            if: "if",
            else: "else",
            goto: "goto",
            break: "break",
            SKIP: "SKIP",
            KEY: "KEY",
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

%}

@lexer lexer

input -> top_level_statements {% id %}

top_level_statements
    ->  top_level_statement _
        {%
            d => [d[0]]
        %}
    |  top_level_statement _ "\n" _ top_level_statements
        {%
            d => [
                d[0],
                ...d[4]
            ]
        %}
    # below 2 sub-rules handle blank lines
    |  _ "\n" top_level_statements
        {%
            d => d[2]
        %}
    |  _
        {%
            d => []
        %}

top_level_statement
    -> fun_definition   {% id %}
    |  code_block       {% id %}
    |  executable_statement {% id %}

fun_definition
    -> "fun" __ identifier _ "(" _ parameter_list _ ")" _ code_block
        {%
            d => ({
                type: "fun_definition",
                name: d[2],
                parameters: d[6],
                body: d[10],
                start: tokenStart(d[0]),
                end: d[10].end
            })
        %}

parameter_list
    -> null        {% () => [] %}
    | identifier   {% d => [d[0]] %}
    | identifier _ "," _ parameter_list
        {%
            d => [d[0], ...d[4]]
        %}

code_block -> "{" executable_statements "}"
    {%
        (d) => ({
            type: "code_block",
            statements: d[1],
            start: tokenStart(d[0]),
            end: tokenEnd(d[2])
        })
    %}

executable_statements
    -> _
        {% () => [] %}
    |  _ "\n" executable_statements
        {% (d) => d[2] %}
    |  _ executable_statement _
        {% d => [d[1]] %}
    |  _ executable_statement _ "\n" executable_statements
        {%
            d => [d[1], ...d[4]]
        %}

executable_statement
   -> return_statement     {% id %}
   |  asm_line             {% id %}
   |  code_block           {% id %}
   |  var_assignment       {% id %}
   |  postfix_update       {% id %}
   |  call_statement       {% id %}
   |  label_statement      {% id %}
   |  goto_statement       {% id %}
   |  break_statement      {% id %}
   |  key_skip_statement   {% id %}
#    |  indexed_assignment   {% id %}
   |  do_while_loop        {% id %}
   |  while_loop           {% id %}
   |  if_statement         {% id %}
   |  for_loop             {% id %}

return_statement
   -> "return" __ expression
       {%
           d => ({
               type: "return_statement",
               value: d[2],
               start: tokenStart(d[0]),
               end: d[2].end
           })
       %}

label_statement
    -> identifier ":"
        {%
            d => ({
                type: "label_statement",
                name: d[0].value,
                start: d[0].start,
                end: tokenEnd(d[1])
            })
        %}

goto_statement
    -> "goto" __ identifier
        {%
            d => ({
                type: "goto_statement",
                target: d[2].value,
                start: tokenStart(d[0]),
                end: d[2].end
            })
        %}

break_statement
    -> "break"
        {%
            d => ({
                type: "break_statement",
                start: tokenStart(d[0]),
                end: tokenEnd(d[0])
            })
        %}

asm_line
    -> hex __ asm_code
        {%
           d => ({
               type: "asm_line",
               value: d[2],
               start: tokenStart(d[0]),
               end: d[2].end
           })
       %}

asm_code
    -> identifier       {% id %}
    |  hex              {% id %}
    |  binary           {% id %}
    |  var_assignment   {% id %}
    |  call_statement   {% id %}
    |  asm_cmd          {% id %}
    |  key_skip_statement {% id %}

key_skip_statement
    -> "SKIP" __ identifier __ "KEY" _ comparison_operator _ identifier
        {%
            d => {
                if (d[2].value !== "IF") {
                    throw new Error("Expected IF in key skip instruction");
                }
                return {
                    type: "key_skip_statement",
                    operator: d[6],
                    key: d[8],
                    start: tokenStart(d[0]),
                    end: d[8].end
                };
            }
        %}

asm_cmd
    -> identifier __ asm_cmd_args
        {%
           d => ({
               type: "asm_command",
               value: d[0],
               arguments: d[2],
               start: tokenStart(d[0]),
               end: d[2].end
           })
       %}

asm_cmd_args
    -> null {% () => [] %}
    |  expression  {% d => [d[0]] %}
    |  expression __ asm_cmd_args
        {%
            d => [d[0], ...d[2]]
        %}


var_assignment
    -> identifier _ assignment_op _ expression
        {%
            d => ({
                type: "var_assignment",
                var_name: d[0],
                operator: d[2],
                value: d[4],
                start: d[0].start,
                end: d[4].end
            })
        %}

postfix_update
    -> identifier _ postfix_op
        {%
            d => ({
                type: "postfix_update",
                var_name: d[0],
                operator: d[2],
                start: d[0].start,
                end: tokenEnd(d[2])
            })
        %}

postfix_op
    -> "++" {% d => d[0] %}
    |  "--" {% d => d[0] %}

assignment_op
    -> "="   {% d => d[0] %}
    | "+="  {% d => d[0] %}
    | "-="  {% d => d[0] %}
    | "~="  {% d => d[0] %}
    | "&="  {% d => d[0] %}
    | "|="  {% d => d[0] %}
    | "^="  {% d => d[0] %}
    | "<<=" {% d => d[0] %}
    | ">>=" {% d => d[0] %}

call_statement -> call_expression  {% id %}

call_expression
    -> identifier _ "(" argument_list ")"
        {%
            d => ({
                type: "call_expression",
                fun_name: d[0],
                arguments: d[3],
                start: d[0].start,
                end: tokenEnd(d[4])
            })
        %}

# indexed_access
#     -> unary_expression _ "[" _ expression _ "]"
#         {%
#             d => ({
#                 type: "indexed_access",
#                 subject: d[0],
#                 index: d[4],
#                 start: d[0].start,
#                 end: tokenEnd(d[6])
#             })
#         %}

# indexed_assignment
#     -> unary_expression _ "[" _ expression _ "]" _ "=" _ expression
#         {%
#             d => ({
#                 type: "indexed_assignment",
#                 subject: d[0],
#                 index: d[4],
#                 value: d[10],
#                 start: d[0].start,
#                 end: d[10].end
#             })
#         %}

do_while_loop
    -> "do" _ code_block _ "while" _ "(" _ expression _ ")"
        {%
            d => ({
                type: "do_while_loop",
                body: d[2],
                condition: d[8],
                start: tokenStart(d[0]),
                end: tokenEnd(d[10])
            })
        %}

while_loop
    -> "while" _ "(" _ expression _ ")" _ code_block
        {%
            d => ({
                type: "while_loop",
                condition: d[4],
                body: d[8],
                start: tokenStart(d[0]),
                end: d[8].end
            })
        %}

for_loop
    -> "for" _ "(" _ for_loop_init _ ";" _ for_loop_expr _ ";" _ for_loop_increment _ ")" _ code_block
        {%
            d => ({
                type: "for_loop",
                body: d[16],
                init: d[4],
                condition: d[8],
                increment: d[12],
                start: tokenStart(d[0]),
                end: d[16].end
            })
        %}

for_loop_init
    ->  var_assignment {% id %}
    |   null           {% () => null %}

for_loop_expr
    ->  expression {% id %}
    |   null           {% () => null %}

for_loop_increment
    ->  expression     {% id %}
    |   postfix_update {% id %}
    |   null           {% () => null %}

if_statement
    -> "if" _ "(" _ expression _ ")" _ code_block _ else_clause
        {%
            d => ({
                type: "if_statement",
                condition: d[4],
                body: d[8],
                alternate: d[10] ?? null,
                start: tokenStart(d[0]),
                end: d[10] ? d[10].end : d[8].end
            })
        %}

else_clause
    -> null
        {% () => null %}
    |  "else" _ code_block
        {% d => d[2] %}
    |  "else" _ if_statement
        {% d => d[2] %}

argument_list
    -> null {% () => [] %}
    |  _ expression _  {% d => [d[1]] %}
    |  _ expression _ "," argument_list
        {%
            d => [d[1], ...d[4]]
        %}

expression -> logical_or_expression {% id %}

logical_or_expression
    -> logical_and_expression {% id %}
    |  logical_and_expression _ "||" _ logical_or_expression
        {%
            d => ({
                type: "binary_operation",
                operator: convertToken(d[2]),
                left: d[0],
                right: d[4],
                start: d[0].start,
                end: d[4].end
            })
        %}

logical_and_expression
    -> comparison_expression     {% id %}
    |  comparison_expression _ "&&" _ logical_and_expression
        {%
            d => ({
                type: "binary_operation",
                operator: convertToken(d[2]),
                left: d[0],
                right: d[4],
                start: d[0].start,
                end: d[4].end
            })
        %}

comparison_expression
    -> additive_expression    {% id %}
    |  additive_expression _ comparison_operator _ comparison_expression
        {%
            d => ({
                type: "binary_operation",
                operator: d[2],
                left: d[0],
                right: d[4],
                start: d[0].start,
                end: d[4].end
            })
        %}

comparison_operator
    -> "=="  {% convertTokenId %}
    |  "!="  {% convertTokenId %}

additive_expression
    -> multiplicative_expression    {% id %}
    |  multiplicative_expression _ [+-] _ additive_expression
        {%
            d => ({
                type: "binary_operation",
                operator: convertToken(d[2]),
                left: d[0],
                right: d[4],
                start: d[0].start,
                end: d[4].end
            })
        %}

multiplicative_expression
    -> unary_expression     {% id %}
    |  unary_expression _ [*/%] _ multiplicative_expression
        {%
            d => ({
                type: "binary_operation",
                operator: convertToken(d[2]),
                left: d[0],
                right: d[4],
                start: d[0].start,
                end: d[4].end
            })
        %}

unary_expression
    -> number               {% id %}
    |  hex                  {% id %}
    |  binary               {% id %}
    |  "KEY"
        {%
            d => ({
                type: "key_reference",
                value: d[0].value,
                start: tokenStart(d[0]),
                end: tokenEnd(d[0])
            })
        %}
    |  identifier
        {%
            d => ({
                type: "var_reference",
                var_name: d[0],
                start: d[0].start,
                end: d[0].end
            })
        %}
    |  call_expression      {% id %}
    |  string_literal       {% id %}
    # |  list_literal         {% id %}
    # |  boolean_literal      {% id %}
    # |  indexed_access       {% id %}
    # |  fun_expression       {% id %}
    |  "(" expression ")"
        {%
            data => data[1]
        %}

# list_literal
#     -> "[" list_items "]"
#         {%
#             d => ({
#                 type: "list_literal",
#                 items: d[1],
#                 start: tokenStart(d[0]),
#                 end: tokenEnd(d[2])
#             })
#         %}

# list_items
#     -> null
#         {% () => [] %}
#     |  _ml expression _ml
#         {% d => [d[1]] %}
#     |  _ml expression _ml "," list_items
#         {%
#             d => [
#                 d[1],
#                 ...d[4]
#             ]
#         %}


# boolean_literal
#     -> "true"
#         {%
#             d => ({
#                 type: "boolean_literal",
#                 value: true,
#                 start: tokenStart(d[0]),
#                 end: tokenEnd(d[0])
#             })
#         %}
#     |  "false"
#         {%
#             d => ({
#                 type: "boolean_literal",
#                 value: false,
#                 start: tokenStart(d[0]),
#                 end: tokenEnd(d[0])
#             })
#         %}

# fun_expression
#     -> "fun" _ "(" _ parameter_list _ ")" _ code_block
#         {%
#             d => ({
#                 type: "fun_expression",
#                 parameters: d[4],
#                 body: d[8],
#                 start: tokenStart(d[0]),
#                 end: d[8].end
#             })
#         %}

string_literal -> %string_literal {% convertTokenId %}
binary -> %binary_literal {% convertTokenId %}
hex -> %hex_literal {% convertTokenId %}
number -> %number_literal {% convertTokenId %}

identifier -> %identifier {% convertTokenId %}

_ml -> multi_line_ws_char:*

multi_line_ws_char
    -> %ws
    |  "\n"

__ -> %ws:+

_ -> %ws:*
