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
                    | jump
                    | push
                    | jif
                    | jnif
                    | setv
                    | addv
                    | jirf
                    | jnirf
                    | set
                    | joff
                    | rand
                    | draw

noop               -> "NOOP"                          {% () => "0x0000" %}
clear              -> "CLEAR"                         {% () => "0x00e0" %}
pop                -> "POP"                           {% () => "0x00ee" %}
hires              -> "HIRES"                         {% () => "0x00ff" %}
move               -> varg _ asg_op _ varg            {% (d) => "0x8" + d[0] + d[4]+ "0"  %}
or                 -> varg _ or_op _ varg             {% (d) => "0x8" + d[0] + d[4]+ "1"  %}
and                -> varg _ and_op _ varg            {% (d) => "0x8" + d[0] + d[4]+ "2"  %}
xor                -> varg _ xor_op _ varg            {% (d) => "0x8" + d[0] + d[4]+ "3"  %}
add                -> varg _ add_op _ varg            {% (d) => "0x8" + d[0] + d[4]+ "4"  %}
sub                -> varg _ sub_op _ varg            {% (d) => "0x8" + d[0] + d[4]+ "5"  %}
                    | varg _ reverse_sub_op _ varg    {% (d) => "0x8" + d[0] + d[4]+ "7"  %}
shift              -> varg _ shift_right_op _ varg    {% (d) => "0x8" + d[0] + d[4]+ "6"  %}
                    | varg _ shift_left_op _ varg     {% (d) => "0x8" + d[0] + d[4]+ "e"  %}
sik                -> "SIK" _ varg                    {% (d) => "0xe" + d[2] + "9e" %}
sink               -> "SINK" _ varg                   {% (d) => "0xe" + d[2] + "a1" %}
dtvx               -> "DTVX" _ varg                   {% (d) => "0xf" + d[2] + "07" %}
vxdt               -> "VXDT" _ varg                   {% (d) => "0xf" + d[2] + "15" %}
vxst               -> "VXST" _ varg                   {% (d) => "0xf" + d[2] + "18" %}
get                -> "GET" _ varg                    {% (d) => "0xf" + d[2] + "0a" %}
inc                -> "INC" _ varg                    {% (d) => "0xf" + d[2] + "1e" %}
font               -> "FONT" _ varg                   {% (d) => "0xf" + d[2] + "29" %}
bcdc               -> "BCDC" _ varg                   {% (d) => "0xf" + d[2] + "33" %}
savem              -> "SAVE" _ varg                   {% (d) => "0xf" + d[2] + "55" %}
loadm              -> "LOAD" _ varg                   {% (d) => "0xf" + d[2] + "65" %}
pushf              -> "PUSHF" _ varg                  {% (d) => "0xf" + d[2] + "75" %}
popf               -> "POPF" _ varg                   {% (d) => "0xf" + d[2] + "85" %}
jump               -> "JUMP" _ arg                    {% (d) => "0x1" + d[2] %}
push               -> "PUSH" _ arg                    {% (d) => "0x2" + d[2] %}
jif                -> "JEQ"  _ varg _ arg             {% (d) => "0x3" + d[2] + d[4] %}
jnif               -> "JNQ" _ varg _ arg              {% (d) => "0x4" + d[2] + d[4] %}
setv               -> varg _ asg_op _ arg             {% (d) => "0x6" + d[0] + d[4] %}
addv               -> varg _ add_op _ arg             {% (d) => "0x7" + d[0] + d[4] %}
jirf               -> "JEQ" _ varg _ varg _ arg       {% (d) => "0x5" + d[2] + d[4] + d[6] %}
jnirf              -> "JNQ" _ varg _ varg _ arg       {% (d) => "0x9" + d[2] + d[4] + d[6] %}
set                -> "I" _ asg_op _ arg              {% (d) => "0xa" + d[4] %}
joff               -> "JOFF" _ arg                    {% (d) => "0xb" + d[2] %}
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

newline            -> "\r" "\n"                       {% empty %}
                    | "\r" | "\n"                     {% empty %}
_                  -> [\s]:*                          {% function(d) {return null; } %}
