DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )/../../" && pwd )"
pushd $DIR
# Css loading indicator specific
cat themes/loading.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/loading-min.css

# Js Files for Login page
cat js/util.js \
    js/ux/others/login_specific/*.js \
    js/login.js \
    | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/login-all.js

# Js Files for Login page - debug
cat js/util.js \
    js/ux/others/login_specific/*.js \
    js/login.js \
    > js/login-all-debug.js

#Css Files for Login page
cat themes/flags.css \
    js/ux/others/login_specific/*.css \
    themes/login.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/login-all.css


# Js Files for Main page
cat js/ux/codemirror2/lib/codemirror.js \
    js/ux/codemirror2/mode/clojure/clojure.js \
    js/ux/codemirror2/mode/xml/xml.js \
    js/ux/codemirror2/mode/javascript/javascript.js \
    js/ux/codemirror2/mode/clike/clike.js \
    js/ux/codemirror2/mode/xmlpure/xmlpure.js \
    js/ux/codemirror2/mode/css/css.js \
    js/ux/codemirror2/mode/php/php.js \
    js/ux/codemirror2/mode/htmlmixed/htmlmixed.js \
    js/ux/codemirror2/mode/rst/rst.js \
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
    | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/main-all.js

# Js Files for Main page - debug
cat js/ux/codemirror2/lib/codemirror.js \
    js/ux/codemirror2/mode/clojure/clojure.js \
    js/ux/codemirror2/mode/xml/xml.js \
    js/ux/codemirror2/mode/javascript/javascript.js \
    js/ux/codemirror2/mode/clike/clike.js \
    js/ux/codemirror2/mode/xmlpure/xmlpure.js \
    js/ux/codemirror2/mode/css/css.js \
    js/ux/codemirror2/mode/php/php.js \
    js/ux/codemirror2/mode/htmlmixed/htmlmixed.js \
    js/ux/codemirror2/mode/rst/rst.js \
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

#Css Files for Main page
cat themes/flags.css \
    js/ux/extjsPowered/*.css \
    js/ux/extjsPowered/treegrid/*.css \
    js/ux/others/main_specific/*.css \
    themes/main.css \
    js/ux/codemirror2/lib/codemirror.css \
    js/ux/codemirror2/theme/*.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/main-all.css

popd
