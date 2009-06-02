pushd ../..
cat js/util.js js/ui/component/*.js js/main.js | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/main_min.js 
popd
