pushd ../..
# For Js files
cat js/util.js js/ui/task/*.js js/ui/component/*.js js/main.js | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/main_min.js 
cat js/ux/extjsPowered/*.js | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/ux_extjsPowered_all.js 
#For Css files
cat themes/style.css | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/style_min.css 
cat js/ux/extjsPowered/*.css | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/ux_extjsPowered_all.css 
popd
