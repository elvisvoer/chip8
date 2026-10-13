@{%
var appendItem = function (a, b) { return function (d) { return d[a].concat([d[b]]); } };
var empty = function (d) { return []; };
%}

main -> lines
lines              -> lines newline line              {% appendItem(0, 2) %}
                    | lines newline                   {% d => d[0]        %}
                    | line                            {% id %}

line               -> hexNum
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
                    | setm
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
move               -> "MOVE" _ varg _ varg _ "0x0"      {% (d) => "0x8" + d[2] + d[4]+ "0"  %}
or                 -> "OR" _ varg _ varg _ "0x1"        {% (d) => "0x8" + d[2] + d[4]+ "1"  %}
and                -> "AND" _ varg _ varg _ "0x2"       {% (d) => "0x8" + d[2] + d[4]+ "2"  %}
xor                -> "XOR" _ varg _ varg _ "0x3"       {% (d) => "0x8" + d[2] + d[4]+ "3"  %}
add                -> "ADD" _ varg _ varg _ "0x4"       {% (d) => "0x8" + d[2] + d[4]+ "4"  %}
sub                -> "SUB" _ varg _ varg _ "0x5"       {% (d) => "0x8" + d[2] + d[4]+ "5"  %}
                    | "SUB" _ varg _ varg _ "0x7"       {% (d) => "0x8" + d[2] + d[4]+ "7"  %}
shift              -> "SHIFT" _ varg _ varg _ "0x6"     {% (d) => "0x8" + d[2] + d[4]+ "6"  %}
                    | "SHIFT" _ varg _ varg _ "0xe"     {% (d) => "0x8" + d[2] + d[4]+ "e"  %}
sik                -> "SIK" _ varg _ "0x9e"            {% (d) => "0xe" + d[2] + "9e" %}
sink               -> "SINK" _ varg _ "0xa1"           {% (d) => "0xe" + d[2] + "a1" %}
dtvx               -> "DTVX" _ varg _ "0x07"           {% (d) => "0xf" + d[2] + "07" %}
vxdt               -> "VXDT" _ varg _ "0x15"           {% (d) => "0xf" + d[2] + "15" %}
vxst               -> "VXST" _ varg _ "0x18"           {% (d) => "0xf" + d[2] + "18" %}
get                -> "GET" _ varg _ "0x0a"            {% (d) => "0xf" + d[2] + "0a" %}
inc                -> "INC" _ varg _ "0x1e"            {% (d) => "0xf" + d[2] + "1e" %}
font               -> "FONT" _ varg _ "0x29"           {% (d) => "0xf" + d[2] + "29" %}
bcdc               -> "BCDC" _ varg _ "0x33"           {% (d) => "0xf" + d[2] + "33" %}
setm               -> "SETM" _ varg _ "0x55"           {% (d) => "0xf" + d[2] + "55" %}
loadm              -> "LOADM" _ varg _ "0x65"          {% (d) => "0xf" + d[2] + "65" %}
pushf              -> "PUSHF" _ varg _ "0x75"          {% (d) => "0xf" + d[2] + "75" %}
popf               -> "POPF" _ varg _ "0x85"           {% (d) => "0xf" + d[2] + "85" %}
jump               -> "JUMP" _ arg                    {% (d) => "0x1" + d[2] %}
push               -> "PUSH" _ arg                    {% (d) => "0x2" + d[2] %}
jif                -> "JIF"  _ varg _ arg              {% (d) => "0x3" + d[2] + d[4] %}
jnif               -> "JNIF" _ varg _ arg              {% (d) => "0x4" + d[2] + d[4] %}
setv               -> "SETV" _ varg _ arg              {% (d) => "0x6" + d[2] + d[4] %}
addv               -> "ADDV" _ varg _ arg              {% (d) => "0x7" + d[2] + d[4] %}
jirf               -> "JIRF" _ varg _ varg _ arg        {% (d) => "0x5" + d[2] + d[4] + d[6] %}
jnirf              -> "JNIRF" _ varg _ varg _ arg       {% (d) => "0x9" + d[2] + d[4] + d[6] %}
set                -> "SET" _ arg                     {% (d) => "0xa" + d[2] %}
joff               -> "JOFF" _ arg                    {% (d) => "0xb" + d[2] %}
rand               -> "RAND" _ varg _ arg              {% (d) => "0xc" + d[2] + d[4] %}
draw               -> "DRAW" _ varg _ varg _ arg        {% (d) => "0xd" + d[2] + d[4] + d[6] %}

varg               -> "v" hex                         {% (d) => d[1] %}
arg                -> hexPrefix hex                   {% (d) => d[1] %}
hexNum             -> hexPrefix hex                   {% (d) => d[0] + d[1] %}
hex                -> [0-9a-f]:+                      {% function(d) {return d[0].join(""); } %}
hexPrefix          -> "0x"


newline            -> "\r" "\n"                       {% empty %}
                    | "\r" | "\n"                     {% empty %}
_                  -> [\s]:*                          {% function(d) {return null; } %}
