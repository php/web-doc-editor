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
          codechange     : true,
          cursormove : true,
          scroll     : true
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
        obj.fireEvent('codechange',e.keyCode, e.charCode, e);
      }

      Ext.EventManager.addListener(this.obj.mirror.frame.contentWindow, "scroll", function(e){ obj.monitorScroll(e, obj); }, this);

    },

    saveFunction: function() {
        var saveBtn = this.obj.ownerCt.topToolbar.items.items[0];
        if( ! saveBtn.disabled ) {
            saveBtn.handler.call(saveBtn.scope || saveBtn, saveBtn);
        }
    },

    monitorScroll: function(e, obj) {
      obj.fireEvent('scroll',e.target.body.scrollTop, this);
    },

    afterRender: function() {
     this.mirror = new CodeMirror(CodeMirror.replace(Ext.get(this.id).dom), {
       textWrapping: false,
       saveFunction: this.saveFunction,
       width: '100%',
       height: this.ownerCt.lastSize.height,
       readOnly: this.readOnly,
       content: this.value,
       parserfile: this.parserFile,
       parserConfig: {alignCDATA: true, useHTMLKludges: false},
       indentUnit: 1,
       id:this.id,
       lineNumbers: true,
       continuousScanning: (this.readOnly) ? false : 500,
       cursorActivity: CursorActivity,
       stylesheet: this.parserStylesheet,
       path: "js/ux/codemirror/js/",
       obj: this,
       initCallback: this.onInit,
       autoMatchParens: true,
       disableSpellcheck: false
     });

     var scope = this;

     if( this.autoResize ) {
       this.ownerCt.on('resize', function(ct, adjW, adjH, rawW, rawH) {
          this.resize();
       }, this);
     }

     function CursorActivity() {
      scope.fireEvent('cursormove');
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
     this.fireEvent('codechange');
    },

    undo : function(cmp) {

     var dummyObj = new Object;
     dummyObj.keyCode  = 38;
     dummyObj.charCode = 0;
     dummyObj.ctrlKey  = false;

     this.mirror.undo();
     this.fireEvent('codechange', dummyObj.keyCode, dummyObj.charCode, dummyObj);

     // Enable the Redo btn
     cmp.topToolbar.items.items[4].enable();

     // Is there more undo history ? If not, we disable this btn
     if( ! this.mirror.editor.history.history.length ) {
         cmp.topToolbar.items.items[3].disable();
     }
    },

    redo : function(cmp) {

     var dummyObj = new Object;
     dummyObj.keyCode  = 38;
     dummyObj.charCode = 0;
     dummyObj.ctrlKey  = false;

     this.mirror.redo();
     this.fireEvent('codechange', dummyObj.keyCode, dummyObj.charCode, dummyObj);

     // Enable the undo btn
     cmp.topToolbar.items.items[3].enable();

     // Is there more redo history ? If not, we disable this btn
     if( ! this.mirror.editor.history.redoHistory.length ) {
         cmp.topToolbar.items.items[4].disable();
     }
    },

    insertIntoLine : function(line, position, text) {
     var lineObj = this.mirror.nthLine(line);
     this.mirror.insertIntoLine(lineObj, position, text);
     this.fireEvent('codechange');
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
