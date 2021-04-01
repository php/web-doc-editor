module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      main: {
        files: {
          'js/main-all.js': [
            'js/ux/codemirror2/lib/codemirror.js',
            'js/ux/codemirror2/mode/clojure/clojure.js',
            'js/ux/codemirror2/mode/xml/xml.js',
            'js/ux/codemirror2/mode/javascript/javascript.js',
            'js/ux/codemirror2/mode/clike/clike.js',
            'js/ux/codemirror2/mode/xmlpure/xmlpure.js',
            'js/ux/codemirror2/mode/css/css.js',
            'js/ux/codemirror2/mode/php/php.js',
            'js/ux/codemirror2/mode/htmlmixed/htmlmixed.js',
            'js/ux/codemirror2/mode/rst/rst.js',
            'js/ux/codemirror2/lib/util/search.js',
            'js/ux/codemirror2/lib/util/searchcursor.js',
            'js/ux/codemirror2/lib/util/dialog.js',
            'js/util.js',
            'js/ux/extjsPowered/*.js',
            'js/ux/extjsPowered/treegrid/TreeGridSorter.js',
            'js/ux/extjsPowered/treegrid/TreeGridColumnResizer.js',
            'js/ux/extjsPowered/treegrid/TreeGridNodeUI.js',
            'js/ux/extjsPowered/treegrid/TreeGridLoader.js',
            'js/ux/extjsPowered/treegrid/TreeGridColumns.js',
            'js/ux/extjsPowered/treegrid/TreeGrid.js',
            'js/ux/others/main_specific/*.js',
            'js/ui/task/*.js',
            'js/ui/cmp/*.js',
            'js/main.js',
          ],
        },
      },
      login: {
        files: {
          'js/login-all.js': [
            'js/util.js',
            'js/ux/others/login_specific/*.js',
            'js/login.js',
          ],
        },
      },
    },
    concat: {
      main: {
        files: {
          'js/main-all-debug.js': [
            'js/ux/codemirror2/lib/codemirror.js',
            'js/ux/codemirror2/mode/clojure/clojure.js',
            'js/ux/codemirror2/mode/xml/xml.js',
            'js/ux/codemirror2/mode/javascript/javascript.js',
            'js/ux/codemirror2/mode/clike/clike.js',
            'js/ux/codemirror2/mode/xmlpure/xmlpure.js',
            'js/ux/codemirror2/mode/css/css.js',
            'js/ux/codemirror2/mode/php/php.js',
            'js/ux/codemirror2/mode/htmlmixed/htmlmixed.js',
            'js/ux/codemirror2/mode/rst/rst.js',
            'js/ux/codemirror2/lib/util/search.js',
            'js/ux/codemirror2/lib/util/searchcursor.js',
            'js/ux/codemirror2/lib/util/dialog.js',
            'js/util.js',
            'js/ux/extjsPowered/*.js',
            'js/ux/extjsPowered/treegrid/TreeGridSorter.js',
            'js/ux/extjsPowered/treegrid/TreeGridColumnResizer.js',
            'js/ux/extjsPowered/treegrid/TreeGridNodeUI.js',
            'js/ux/extjsPowered/treegrid/TreeGridLoader.js',
            'js/ux/extjsPowered/treegrid/TreeGridColumns.js',
            'js/ux/extjsPowered/treegrid/TreeGrid.js',
            'js/ux/others/main_specific/*.js',
            'js/ui/task/*.js',
            'js/ui/cmp/*.js',
            'js/main.js',
          ],
        },
      },
      login: {
        files: {
          'js/login-all-debug.js': [
            'js/util.js',
            'js/ux/others/login_specific/*.js',
            'js/login.js',
          ],
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', ['uglify', 'concat']);
};