pushd ../..
# Css loading indicator specific
cat themes/loading.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/loading-min.css

# Js Files for Login page
cat js/util.js \
    js/ux/others/login_specific/*.js \
    js/login.js \
    | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/login-all.js

#Css Files for Login page
cat themes/flags.css \
    js/ux/others/login_specific/*.css \
    themes/login.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/login-all.css


# Js Files for Main page
cat js/util.js \
    js/ux/extjsPowered/*.js \
    js/ux/others/main_specific/*.js \
    js/ui/task/*.js \
    js/ui/component/*.js \
    js/main.js \
    | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/main-all.js

#Css Files for Main page
cat themes/flags.css \
    js/ux/extjsPowered/*.css \
    js/ux/others/main_specific/*.css \
    themes/style.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/main-all.css

popd
