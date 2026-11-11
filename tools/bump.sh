#!/bin/sh
# Sätter ett nytt versionsnummer på alla js/css-länkar så att webbläsaren alltid hämtar senaste versionen.
cd "$(dirname "$0")/.." || exit 1
V=$(date +%s)
sed -i '' -E "s#(\./[a-z0-9]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" js/*.js
sed -i '' -E "s#(\.\./js/[a-z0-9]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" demo/*.js
sed -i '' -E "s#(js/app\.js|style\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html
sed -i '' -E "s#(demo\.js|demo\.css|\.\./style\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#g" demo/index.html
echo "version $V"
