@{%
var appendItem = function (a, b) { return function (d) { return d[a].concat([d[b]]); } };
var empty = function (d) { return []; };
%}

main -> lines
lines              -> lines newline line              {% appendItem(0, 2) %}
                    | lines newline                   {% d => d[0]        %}
                    | line                            {% id %}

line               -> offset ":" _ command            {% d => d[3] %}
offset             -> hexNum

command            -> hexNum
                    | noop
                    | clear
                    | pop
                    | hires
                    | move
                    | or
                    | and
                    | xor
                    | add
                    | sub
                    | shift
                    | sik
                    | sink
                    | dtvx
                    | vxdt
                    | vxst
                    | get
                    | inc
                    | font
                    | bcdc
                    | savem
                    | loadm
                    | pushf
                    | popf
                    | push
                    | jump
                    | jif
                    | jnif
                    | joff
                    | setv
                    | addv
                    | jirf
                    | jnirf
                    | set
                    | rand
                    | draw

# Conditionals
jump               -> "JUMP" _ arg                          {% (d) => "0x1" + d[2] %}
jif                -> "JUMP IF"  _ varg _ eq_op _ arg       {% (d) => "0x3" + d[2] + d[6] %}
jnif               -> "JUMP IF"  _ varg _ not_eq_op _ arg   {% (d) => "0x4" + d[2] + d[6] %}
joff               -> "JUMP TO" _ arg                       {% (d) => "0xb" + d[2] %}

# Timers
dtvx               -> varg _ asg_op _ "DT"                  {% (d) => "0xf" + d[0] + "07" %}
vxdt               -> "DT" _ asg_op _ varg                  {% (d) => "0xf" + d[4] + "15" %}
vxst               -> "ST" _ asg_op _ varg                  {% (d) => "0xf" + d[4] + "18" %}

# Misc
noop               -> "NOOP"                                {% () => "0x0000" %}
clear              -> "CLEAR"                               {% () => "0x00e0" %}
pop                -> "POP"                                 {% () => "0x00ee" %}
hires              -> "HIRES"                               {% () => "0x00ff" %}
move               -> varg _ asg_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "0"  %}
or                 -> varg _ or_op _ varg                   {% (d) => "0x8" + d[0] + d[4]+ "1"  %}
and                -> varg _ and_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "2"  %}
xor                -> varg _ xor_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "3"  %}
add                -> varg _ add_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "4"  %}
sub                -> varg _ sub_op _ varg                  {% (d) => "0x8" + d[0] + d[4]+ "5"  %}
                    | varg _ reverse_sub_op _ varg          {% (d) => "0x8" + d[0] + d[4]+ "7"  %}
shift              -> varg _ shift_right_op _ varg          {% (d) => "0x8" + d[0] + d[4]+ "6"  %}
                    | varg _ shift_left_op _ varg           {% (d) => "0x8" + d[0] + d[4]+ "e"  %}
sik                -> "SKIP IF KEY" _ eq_op _ varg          {% (d) => "0xe" + d[4] + "9e" %}
sink               -> "SKIP IF KEY" _ not_eq_op _ varg      {% (d) => "0xe" + d[4] + "a1" %}

get                -> "GET" _ varg                    {% (d) => "0xf" + d[2] + "0a" %}
inc                -> "INC" _ varg                    {% (d) => "0xf" + d[2] + "1e" %}
font               -> "FONT" _ varg                   {% (d) => "0xf" + d[2] + "29" %}
bcdc               -> "BCDC" _ varg                   {% (d) => "0xf" + d[2] + "33" %}
savem              -> "SAVE" _ varg                   {% (d) => "0xf" + d[2] + "55" %}
loadm              -> "LOAD" _ varg                   {% (d) => "0xf" + d[2] + "65" %}
pushf              -> "PUSHF" _ varg                  {% (d) => "0xf" + d[2] + "75" %}
popf               -> "POPF" _ varg                   {% (d) => "0xf" + d[2] + "85" %}

push               -> "PUSH" _ arg                    {% (d) => "0x2" + d[2] %}

setv               -> varg _ asg_op _ arg             {% (d) => "0x6" + d[0] + d[4] %}
addv               -> varg _ add_op _ arg             {% (d) => "0x7" + d[0] + d[4] %}
jirf               -> "JEQ" _ varg _ varg _ arg       {% (d) => "0x5" + d[2] + d[4] + d[6] %}
jnirf              -> "JNQ" _ varg _ varg _ arg       {% (d) => "0x9" + d[2] + d[4] + d[6] %}
set                -> "I" _ asg_op _ arg              {% (d) => "0xa" + d[4] %}
rand               -> "RAND" _ varg _ arg             {% (d) => "0xc" + d[2] + d[4] %}
draw               -> "DRAW" _ varg _ varg _ arg      {% (d) => "0xd" + d[2] + d[4] + d[6] %}

varg               -> "V" hex                         {% (d) => d[1].toUpperCase() %}
arg                -> hexPrefix hex                   {% (d) => d[1] %}
hexNum             -> hexPrefix hex                   {% (d) => d[0] + d[1] %}
hex                -> [0-9a-fA-F]:+                      {% function(d) {return d[0].join(""); } %}
hexPrefix          -> "0x"

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

newline            -> "\r" "\n"                       {% empty %}
                    | "\r" | "\n"                     {% empty %}
_                  -> [\s]:*                          {% function(d) {return null; } %}
