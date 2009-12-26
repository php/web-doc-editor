Ext.ux.CodeMirror = Ext.extend(Ext.BoxComponent, {

    readOnly         : (this.readOnly) ? this.readOnly : false,
    width            : 'auto',
    height           : 'auto',
    autoResize       : true,
    initialised      : false,
    documentDurty    : false,
    parser           : (this.parser) ? this.parser : "xml",
    parserFile       : "parsexml.js",
    parserStylesheet : "js/ux/codemirror/css/xmlcolors.css",

    initComponent : function() {

        Ext.ux.CodeMirror.superclass.initComponent.apply(this);

        this.addEvents({
            initialize   : true,
            codemodified : true,
            coderestored : true,
            cursormove   : true,
            scroll       : true
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
    },

    resize: function() {
        this.mirror.frame.style.height = this.ownerCt.lastSize.height - 85 +"px";
        this.mirror.frame.style.width  = this.ownerCt.lastSize.width  - 35 +"px";
    },

    onInit: function(t, cmId) {

        var cmp    = Ext.getCmp(cmId),
            mirror = cmp.mirror;

        cmp.ownerCt.fireEvent('resize');

        // Fire the initialize event
        cmp.fireEvent('initialize');
        cmp.initialised = true;

        // Value used to monitor the state of this document (changed or not)
        cmp.documentDurty = false;

        // Attach some others events
        mirror.editor.keyUp = function(e) {

          // On envoie cursormove
          var r        = mirror.cursorPosition(),
              line     = mirror.lineNumber(r.line),
              caracter = r.character;
          cmp.fireEvent('cursormove', line, caracter);

          // We check if the code has changed or not
          cmp.manageCodeChange(cmId);
        }

        Ext.EventManager.addListener(mirror.frame.contentWindow, "scroll", function(e){ cmp.monitorScroll(e, cmp); }, this);

    },

    manageCodeChange: function(cmId) {

        var cmp    = Ext.getCmp(cmId),
            mirror = cmp.mirror;


        var originalContent = mirror.originalContent,
            currentContent  = mirror.getCode();

        // If originalContent is false, the editor is not ready
        if( originalContent ) {
            if( originalContent === currentContent ) {
                if( cmp.documentDurty === true ) {
                    cmp.fireEvent('coderestored');
                    cmp.documentDurty = false;
                }
                
            } else {
                cmp.ownerCt.topToolbar.items.items[3].enable();
                if( cmp.documentDurty === false ) {
                    cmp.fireEvent('codemodified');
                    cmp.documentDurty = true;
                }
            }

        }

    },

    saveFunction: function(cmId) {

        var cmp    = Ext.getCmp(cmId);

        var saveBtn = cmp.ownerCt.topToolbar.items.items[0];
        if( ! saveBtn.disabled ) {
            saveBtn.handler.call(saveBtn.scope || saveBtn, saveBtn);
        }

    },

    monitorScroll: function(e, cmp) {
        cmp.fireEvent('scroll',e.target.body.scrollTop, this);
    },

    afterRender: function() {
        this.mirror = new CodeMirror(CodeMirror.replace(Ext.get(this.id).dom), {
            textWrapping       : false,
            saveFunction       : this.saveFunction,
            width              : '100%',
            height             : this.ownerCt.lastSize.height,
            readOnly           : this.readOnly,
            content            : this.value,
            originalContent    : false,
            parserfile         : this.parserFile,
            parserConfig       : {alignCDATA: true, useHTMLKludges: false},
            indentUnit         : 1,
            cmId               : this.id,
            lineNumbers        : true,
            continuousScanning : (this.readOnly) ? false : 500,
            stylesheet         : this.parserStylesheet,
            path               : "js/ux/codemirror/js/",
            initCallback       : this.onInit,
            autoMatchParens    : true,
            disableSpellcheck  : false,
            onChange           : this.manageCodeChange
        });

        this.ownerCt.on('resize', function(ct, adjW, adjH, rawW, rawH) {
           this.resize();
        }, this);

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
            this.mirror.originalContent = code;
        }
    },

    reIndentAll : function() {
        this.mirror.reindent();
    },

    undo : function(cmp) {

        this.mirror.undo();

        // Enable the Redo btn
        cmp.topToolbar.items.items[4].enable();

        // Is there more undo history ? If not, we disable this btn
        if( ! this.mirror.editor.history.history.length ) {
            cmp.topToolbar.items.items[3].disable();
        }
    },

    redo : function(cmp) {

        this.mirror.redo();

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
    },

    scrollTo : function(scrollY) {
        this.mirror.frame.contentWindow.document.body.scrollTop = scrollY;
    },

    focus: function() {
        this.mirror.focus();
    },

    setOriginalCode : function() {
        this.mirror.originalContent = this.getCode();
        this.documentDurty = false;
    },

    getCursorPosition : function() {
        var r        = this.mirror.cursorPosition(),
            line     = this.mirror.lineNumber(r.line),
            caracter = r.character;

        return '{line:'+line+', caracter:'+caracter+'}';
    },

    nthLine : function(number) {
        return this.mirror.nthLine(number);
    }

});
Ext.reg('codemirror', Ext.ux.CodeMirror);
