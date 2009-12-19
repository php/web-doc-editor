Ext.ux.CodeMirror = Ext.extend(Ext.BoxComponent, {

    readOnly: (this.readOnly) ? this.readOnly : false,
    mirror: false,
    width: 'auto',
    height: 'auto',
    value: (this.value) ? this.value : "",
    autoResize: true,
    obj: false,
    initialised: false,
    parser: (this.parser) ? this.parser : "xml",
    parserFile: "parsexml.js",
    parserStylesheet: "js/ux/codemirror/css/xmlcolors.css",

    initComponent : function() {

      Ext.ux.CodeMirror.superclass.initComponent.apply(this);

      this.addEvents({
          initialize   : true,
          cmchange     : true,
          cmcursormove : true,
          cmscroll     : true
      });

      //For the parser
      if( this.parser == 'xml' ) {
        this.parserFile = "parsexml.js";
        this.parserStylesheet = "js/ux/codemirror/css/xmlcolors.css";
      }

      if( this.parser == 'html' ) {
        this.parserFile = ["parsexml.js", "parsecss.js", "tokenizejavascript.js", "parsejavascript.js", "parsehtmlmixed.js"];
        this.parserStylesheet = ["js/ux/codemirror/css/xmlcolors.css", "js/ux/codemirror/css/jscolors.css", "js/ux/codemirror/css/csscolors.css"];
      }

      if( this.parser == 'php' ) {
        this.parserFile = ["parsexml.js", "parsecss.js", "tokenizejavascript.js", "parsejavascript.js",
                           "../contrib/php/js/tokenizephp.js", "../contrib/php/js/parsephp.js",
                           "../contrib/php/js/parsephphtmlmixed.js"];
        this.parserStylesheet = ["js/ux/codemirror/css/xmlcolors.css", "js/ux/codemirror/css/jscolors.css", "js/ux/codemirror/css/csscolors.css", "js/ux/codemirror/contrib/php/css/phpcolors.css"];
      }
    },
    onRender : function(ct, position){
        Ext.ux.CodeMirror.superclass.onRender.apply(this, [ct, position]);
        obj = this;
    },

    resize: function() {
      this.mirror.frame.style.height = this.ownerCt.lastSize.height - 85 +"px";
      this.mirror.frame.style.width  = this.ownerCt.lastSize.width  - 35 +"px";
    },

    onInit: function() {

       this.obj.ownerCt.fireEvent('resize', this);

      // Fire the initialize event
      this.obj.fireEvent('initialize', this.obj);
      this.obj.initialised = true;

      var obj;
      obj = this.obj;

      // Attach some others events
      this.obj.mirror.editor.keyUp = function(e) {
        obj.fireEvent('cmchange',e.keyCode, e.charCode, e);
      }

      Ext.EventManager.addListener(this.obj.mirror.frame.contentWindow, "scroll", function(e){ obj.monitorScroll(e, obj); }, this);

    },

    monitorScroll: function(e, obj) {
      obj.fireEvent('cmscroll',e.target.body.scrollTop, this);
    },

    afterRender: function() {
     this.mirror = new CodeMirror(CodeMirror.replace(Ext.get(this.id).dom), {
       textWrapping: false,
       width: '100%',
       height: this.ownerCt.lastSize.height,
       readOnly: this.readOnly,
       content: this.value,
       parserfile: this.parserFile,
       parserConfig: {alignCDATA: true, useHTMLKludges: false},
       indentUnit: 1,
       id:this.id,
       lineNumbers: true,
       continuousScanning: 500,
       cursorActivity: CursorActivity,
       stylesheet: this.parserStylesheet,
       path: "js/ux/codemirror/js/",
       obj: this,
       initCallback: this.onInit,
       autoMatchParens: true
     });

     var scope = this;

     if( this.autoResize ) {
       this.ownerCt.on('resize', function(ct, adjW, adjH, rawW, rawH) {
          this.resize();
       }, this);
     }

     function CursorActivity() {
      scope.fireEvent('cmcursormove');
     }

    },

    getCode: function() {
     return this.mirror.getCode();
    },

    setCode: function(code) {
     if( !this.initialised ) {

      var wait = new Ext.util.DelayedTask(function() { this.setCode(code); }, this );
      wait.delay(500);

     } else {
      this.mirror.setCode(code);
     }
    },

    reIndentAll : function() {
     this.mirror.reindent();
     this.fireEvent('cmchange');
    },

    insertIntoLine : function(line, position, text) {
     var lineObj = this.mirror.nthLine(line);
     this.mirror.insertIntoLine(lineObj, position, text);
     this.fireEvent('cmchange');
    },

    scrollTo : function(scrollY) {
     this.mirror.frame.contentWindow.document.body.scrollTop = scrollY;
    },

    focus: function() {
     this.mirror.focus();
    },

    getCursorPosition : function() {
      var r = this.mirror.cursorPosition();
      var line = this.mirror.lineNumber(r.line);
      var caracter = r.character;

      return '{line:'+line+', caracter:'+caracter+'}';
    },

    nthLine : function(number) {
      return this.mirror.nthLine(number);
    }

});
Ext.reg('codemirror', Ext.ux.CodeMirror);
