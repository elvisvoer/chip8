main -> lines
lines              -> lines newline line                    {% d => [...d[0], d[2]] %}
                    | lines newline                         {% d => d[0]        %}
                    | line                                  {% id %}

line               -> command                               {% d => d[0] %}

command            -> noop
                    | clear
                    | hires
                    | jump
                    | expr
                    | draw
                    | rand
                    | font
                    | read
                    | bcdc
                    | func
                    | memory
                    | registry
                    | timers
                    | hex_literal

# Simple instructions
noop               -> "NOOP"                                {% () => "0x0000" %}
clear              -> "CLEAR"                               {% () => "0x00e0" %}
hires              -> "HIRES"                               {% () => "0x00ff" %}

# Jump instructions
jump               -> "JUMP" _ arg                          {% (d) => "0x1" + d[2] %}
                    | "JUMP IF"  _ varg _ eq_op _ arg       {% (d) => "0x3" + d[2] + d[6] %}
                    | "JUMP IF"  _ varg _ not_eq_op _ arg   {% (d) => "0x4" + d[2] + d[6] %}
                    | "JUMP TO" _ arg                       {% (d) => "0xb" + d[2] %}
                    | "JEQ" _ varg _ varg _ arg             {% (d) => "0x5" + d[2] + d[4] + d[6] %}
                    | "JNQ" _ varg _ varg _ arg             {% (d) => "0x9" + d[2] + d[4] + d[6] %}
                    | "SKIP IF KEY" _ eq_op _ varg          {% (d) => "0xe" + d[4] + "9e" %}
                    | "SKIP IF KEY" _ not_eq_op _ varg      {% (d) => "0xe" + d[4] + "a1" %}

# Expressions
expr                -> "I" _ asg_op _ arg                   {% (d) => "0xa" + d[4] %}
                    | varg _ asg_op _ arg                   {% (d) => "0x6" + d[0] + d[4] %}
                    | varg _ asg_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "0"  %}
                    | varg _ add_op _ arg                   {% (d) => "0x7" + d[0] + d[4] %}
                    | varg _ add_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "4"  %}
                    | varg _ sub_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "5"  %}
                    | varg _ reverse_sub_op _ varg          {% (d) => "0x8" + d[0] + d[4]+ "7"  %}
                    | varg _ and_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "2"  %}
                    | varg _ or_op _ varg                   {% (d) => "0x8" + d[0] + d[4]+ "1"  %}
                    | varg _ xor_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "3"  %}
                    | varg _ shift_right_op _ varg          {% (d) => "0x8" + d[0] + d[4]+ "6"  %}
                    | varg _ shift_left_op _ varg           {% (d) => "0x8" + d[0] + d[4]+ "e"  %}

# Built-in instructions
draw               -> "DRAW" _ varg _ varg _ arg            {% (d) => "0xd" + d[2] + d[4] + d[6] %}
rand               -> "RAND" _ varg _ arg                   {% (d) => "0xc" + d[2] + d[4] %}
font               -> "FONT" _ varg                         {% (d) => "0xf" + d[2] + "29" %}
read               -> "READ" _ varg                         {% (d) => "0xf" + d[2] + "0a" %}
bcdc               -> "BCDC" _ varg                         {% (d) => "0xf" + d[2] + "33" %}

# Function instructions
func               -> "CALL" _ arg                          {% (d) => "0x2" + d[2] %}
                    | "RETURN"                              {% () => "0x00ee" %}

# Memory instructions
memory             -> "SAVE" _ varg                         {% (d) => "0xf" + d[2] + "55" %}
                    | "LOAD" _ varg                         {% (d) => "0xf" + d[2] + "65" %}
                    | "POPF" _ varg                         {% (d) => "0xf" + d[2] + "85" %}
                    | "PUSHF" _ varg                        {% (d) => "0xf" + d[2] + "75" %}

# Registry
registry           -> "INC" _ varg                          {% (d) => "0xf" + d[2] + "1e" %}

# Timers
timers             -> varg _ asg_op _ "DT"                  {% (d) => "0xf" + d[0] + "07" %}
                    | "DT" _ asg_op _ varg                  {% (d) => "0xf" + d[4] + "15" %}
                    | "ST" _ asg_op _ varg                  {% (d) => "0xf" + d[4] + "18" %}

# Mist
varg               -> "V" hex                               {% (d) => d[1] %}
arg                -> "0x" hex                              {% (d) => d[1] %}
hex_literal        -> "0x" hex                              {% (d) => "0x" + d[1] %}
hex                -> [0-9a-fA-F]:+                         {% (d) => d[0].join("") %}

asg_op             -> ":="
or_op              -> "|="
and_op             -> "&="
xor_op             -> "^="
add_op             -> "+="
sub_op             -> "-="
reverse_sub_op     -> "~="
shift_right_op     -> ">>"
shift_left_op      -> "<<"
eq_op              -> "=="
not_eq_op          -> "!="

newline            -> "\r" "\n"                             {% () => [] %}
                    | "\r" | "\n"                           {% () => [] %}
_                  -> [\s]:*                                {% d => null %}
