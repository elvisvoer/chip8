@{%
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
      match: /0x[0-9a-fA-F]+/,
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

%}

@lexer lexer

main -> lines
lines              -> lines newline line                    {% d => [...d[0], d[2]] %}
                    | lines newline                         {% d => d[0]        %}
                    | line                                  {% id %}

line -> _ _line _  {% d => d[1] %}

_line
    -> comment
    | statements                                {% d => d[0] %}

statements -> statement                         {% id %}

statement ->  hex __ executable_statements      {% d => d[2] %}
            | label __ executable_statements
             {%
                d => ({
                    type: "label_expression",
                    label: d[0],
                    arguments: d[2],
                    start: d[0].start,
                    end: d[0].end
                })
             %}
            | executable_statements             {% d => d[0] %}

executable_statements
    -> call_expression
    |  goto_expression
    |  var_assignment
    |  hex

goto_expression
    -> "GOTO" __ label
      {%
        d => ({
            type: "goto_expression",
            name: d[0],
            label: d[2],
            start: d[0].start,
            end: d[0].end
        })
      %}

call_expression
    -> identifier _ expression_list
      {%
        d => ({
            type: "call_expression",
            name: d[0],
            arguments: d[2],
            start: d[0].start,
            end: d[0].end
        })
      %}

expression_list
    -> null                             {% () => [] %}
    |  expression _                     {% d => [d[0]] %}
    |  expression __ expression_list _  {% d => [d[0], ...d[2]] %}

expression -> identifier
            |  hex
            |  boolean_expr

var_assignment
    -> identifier _ assignment_op _ expression
      {%
          d => ({
              type: "var_assignment",
              name: d[0],
              operator: d[2],
              value: d[4],
              start: d[0].start,
              end: d[4].end
          })
      %}

assignment_op
    -> ":="
    | "+="
    | "-="
    | "~="
    | "&="
    | "|="
    | "^="
    | "<<"
    | ">>"

boolean_expr
    -> identifier _ boolean_op _ expression
      {%
          d => ({
              type: "boolean_expr",
              name: d[0],
              operator: d[2],
              value: d[4],
              start: d[0].start,
              end: d[4].end
          })
      %}

boolean_op
    -> "=="
    |  "!="

comment -> %comment       {% convertTokenId %}
label -> %label           {% convertTokenId %}
hex -> %hex_literal       {% convertTokenId %}
identifier -> %identifier {% convertTokenId %}

__ -> %ws:+

_ -> %ws:*

newline
    -> "\r" "\n"                     {% () => [] %}
    | "\r"                           {% () => [] %}
    | "\n"                           {% () => [] %}
