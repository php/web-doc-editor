#!/bin/sh
#
# A helper script to compile and minify the JavaScript and CSS assets using the
# YUI Compressor.

# Project root directory
PROJECT_ROOT=`CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P`

# Store current path to return later to it
CURRENT_PATH=`pwd`

# YUI Compressor
COMPRESSOR="java -jar scripts/utils/yuicompressor.jar --verbose"

cd $PROJECT_ROOT

# CSS loading indicator specific
$COMPRESSOR --type css -o themes/loading-min.css \
  themes/loading.css

# JS files for login page
$COMPRESSOR --type js -o js/login-all.js \
  js/util.js \
  js/ux/others/login_specific/*.js \
  js/login.js

# JS files for login page - debug
cat \
  js/util.js \
  js/ux/others/login_specific/*.js \
  js/login.js \
  > js/login-all-debug.js

# CSS files for login page
$COMPRESSOR --type css -o themes/login-all.css \
  themes/flags.css \
  js/ux/others/login_specific/*.css \
  themes/login.css

# JS files for main page
$COMPRESSOR --type js -o js/main-all.js \
  js/ux/codemirror2/lib/codemirror.js \
  js/ux/codemirror2/mode/clojure/clojure.js \
  js/ux/codemirror2/mode/xml/xml.js \
  js/ux/codemirror2/mode/javascript/javascript.js \
  js/ux/codemirror2/mode/clike/clike.js \
  js/ux/codemirror2/mode/xmlpure/xmlpure.js \
  js/ux/codemirror2/mode/css/css.js \
  js/ux/codemirror2/mode/php/php.js \
  js/ux/codemirror2/mode/htmlmixed/htmlmixed.js \
  js/ux/codemirror2/mode/rst/rst.js \
  js/ux/codemirror2/lib/util/search.js \
  js/ux/codemirror2/lib/util/searchcursor.js \
  js/ux/codemirror2/lib/util/dialog.js \
  js/util.js \
  js/ux/extjsPowered/*.js \
  js/ux/extjsPowered/treegrid/TreeGridSorter.js \
  js/ux/extjsPowered/treegrid/TreeGridColumnResizer.js \
  js/ux/extjsPowered/treegrid/TreeGridNodeUI.js \
  js/ux/extjsPowered/treegrid/TreeGridLoader.js \
  js/ux/extjsPowered/treegrid/TreeGridColumns.js \
  js/ux/extjsPowered/treegrid/TreeGrid.js \
  js/ux/others/main_specific/*.js \
  js/ui/task/*.js \
  js/ui/cmp/*.js \
  js/main.js

# JS files for main page - debug
cat \
  js/ux/codemirror2/lib/codemirror.js \
  js/ux/codemirror2/mode/clojure/clojure.js \
  js/ux/codemirror2/mode/xml/xml.js \
  js/ux/codemirror2/mode/javascript/javascript.js \
  js/ux/codemirror2/mode/clike/clike.js \
  js/ux/codemirror2/mode/xmlpure/xmlpure.js \
  js/ux/codemirror2/mode/css/css.js \
  js/ux/codemirror2/mode/php/php.js \
  js/ux/codemirror2/mode/htmlmixed/htmlmixed.js \
  js/ux/codemirror2/mode/rst/rst.js \
  js/ux/codemirror2/lib/util/search.js \
  js/ux/codemirror2/lib/util/searchcursor.js \
  js/ux/codemirror2/lib/util/dialog.js \
  js/util.js \
  js/ux/extjsPowered/*.js \
  js/ux/extjsPowered/treegrid/TreeGridSorter.js \
  js/ux/extjsPowered/treegrid/TreeGridColumnResizer.js \
  js/ux/extjsPowered/treegrid/TreeGridNodeUI.js \
  js/ux/extjsPowered/treegrid/TreeGridLoader.js \
  js/ux/extjsPowered/treegrid/TreeGridColumns.js \
  js/ux/extjsPowered/treegrid/TreeGrid.js \
  js/ux/others/main_specific/*.js \
  js/ui/task/*.js \
  js/ui/cmp/*.js \
  js/main.js \
  > js/main-all-debug.js

# CSS files for main page
$COMPRESSOR --type css -o themes/main-all.css \
  themes/flags.css \
  js/ux/extjsPowered/*.css \
  js/ux/extjsPowered/treegrid/*.css \
  js/ux/others/main_specific/*.css \
  themes/main.css \
  js/ux/codemirror2/lib/codemirror.css \
  js/ux/codemirror2/theme/*.css \
  js/ux/codemirror2/lib/util/dialog.css

# Return to the original directory
cd $CURRENT_PATH
