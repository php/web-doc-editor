pushd ../..
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
cat js/util.js \
    js/ux/extjsPowered/*.js \
    js/ux/others/main_specific/*.js \
    js/ui/task/*.js \
    js/ui/cmp/*.js \
    js/main.js \
    | java -jar scripts/utils/yuicompressor.jar --type js --verbose -o js/main-all.js

# Js Files for Main page - debug
cat js/util.js \
    js/ux/extjsPowered/*.js \
    js/ux/others/main_specific/*.js \
    js/ui/task/*.js \
    js/ui/cmp/*.js \
    js/main.js \
    > js/main-all-debug.js

#Css Files for Main page
cat themes/flags.css \
    js/ux/extjsPowered/*.css \
    js/ux/others/main_specific/*.css \
    themes/main.css \
    | java -jar scripts/utils/yuicompressor.jar --type css --verbose -o themes/main-all.css

popd
