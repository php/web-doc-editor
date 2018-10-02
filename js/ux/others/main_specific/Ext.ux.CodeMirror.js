Ext.ux.CodeMirror = Ext.extend(Ext.BoxComponent, {

    lineWrapping: false,
    previousLine: false,
    readOnly: false,
    originalContent: false,
    documentDurty: false,
    mode: (this.parser || 'xml'),
    theme: (this.theme === 'undefined') ? 'default' : this.theme,

    initComponent : function()
    {
        this.initialized = false;
        Ext.ux.CodeMirror.superclass.initComponent.apply(this, arguments);

        this.theme = ( Ext.isDefined(this.theme) ) ? this.theme  :'default';

        // Handle the parser
        // In cm2, parser is the "mode" config.
        switch( this.mode ) {
            case 'html' :
            case 'htm' :
                this.mode = 'text/html';
                break;

            case 'css' :
                this.mode = 'text/css';
                break;

            case 'php' :
                this.mode = 'application/x-httpd-php';
                break;

            case 'xml' :
            case 'ent' :
                this.mode = {name: 'xml',alignCDATA:true};
                break;

            case 'bat' :
                this.mode = 'text/x-clojure';
                break;

            case 'README' :
                this.mode = 'text/x-rst';
                break;

            default : this.mode = {name: 'xmlpure'};
                break;
        };

        // Add some events
        this.addEvents('initialize');
        this.addEvents('codemodified');
        this.addEvents('coderestored');
        this.addEvents('cursormove');
        this.addEvents('scroll');

        // Call a fireEvent on the parent container to take care of the size of the editor
        this.ownerCt.on('resize', function(c, width, height) {
            this.fireEvent('resize', this, width, height);
        }, this);

        this.on({
            resize: function(cmp, width, height)
            {
                this.resize(width, height);
            },

            afterrender: function() {
                var me = this;

                me.codeEditor = new CodeMirror(Ext.get(me.id), {
                        theme: me.theme,
                        readOnly: me.readOnly,
                        mode: me.mode,
                        lineNumbers: true,
                        matchBrackets: true,
                        lineWrapping: me.lineWrapping,
                        indentUnit: 1,
                        tabMode: 'indent',
                        value:'',
                        onScroll: function()
                        {
                            me.fireEvent('scroll', me.el.child('.CodeMirror-scroll').dom.scrollTop);
                        },
                        onKeyEvent: function(c,e)
                        {
                            // Handle crtl+s to save the document
                            if( e.ctrlKey && e.keyCode == 83)
                            {
                                e.preventDefault();
                                me.onSave();
                            }


                            var cursor = c.getCursor();
                            me.fireEvent('cursormove', cursor.line, cursor.ch);
                        },
                        onCursorActivity: function(c)
                        {
                            var cursor = c.getCursor();

                            // We highlight the current line
                            if( me.previousLine !== false ) {
                                c.setLineClass(me.previousLine, null);
                            }
                            me.previousLine = c.setLineClass(cursor.line, "cm2-activeline");

                            me.fireEvent('cursormove', cursor.line, cursor.ch);
                        },
                        onChange: function(c) {
                            me.manageCodeChange();
                        }
                });

                me.initialized = true;
                me.fireEvent('initialize', true);

            }
        });

    },

    focus: function() {
        if (this.initialized) {
                return this.codeEditor.focus();
        }
        return this.initialConfig.value;
    },

    getCursor : function()
    {
        return this.codeEditor.getCursor();
    },

    getLine : function(line)
    {
        return this.codeEditor.getLine(line);
    },

    getValue: function() {
        if (this.initialized) {
                return this.codeEditor.getValue();
        }
        return this.initialConfig.value;
    },

    insertLine : function(line, text)
    {
        var curLine = this.codeEditor.getLine(line);
        this.codeEditor.setLine(line, curLine+"\n"+text);
    },

    manageCodeChange: function()
    {
        var originalContent = this.originalContent,
            currentContent  = this.getValue();
            btnUndo         = Ext.getCmp(this.id + '-btn-undo');

        // If originalContent is false, the editor is not ready
        if( originalContent ) {
            if( originalContent === currentContent ) {
                if( this.documentDurty === true ) {
                    this.fireEvent('coderestored');
                    this.documentDurty = false;
                }

            } else {

                // Enable the Undo Btn if it exist (don't exist when we open a fil in readOnly mode
                if( btnUndo ) {
                    btnUndo.enable(); // undo
                }

                if( this.documentDurty === false ) {
                    this.fireEvent('codemodified');
                    this.documentDurty = true;
                }
            }
        }
    },

    onSave: function()
    {
        var saveBtn = Ext.getCmp(this.id + '-btn-save');
        if( ! saveBtn.disabled ) {
            saveBtn.handler.call(saveBtn.scope || saveBtn, saveBtn);
        }
    },

    redo : function(id_prefix, fid)
    {
        this.codeEditor.redo();

        // Enable the undo btn
        Ext.getCmp(this.id + '-btn-undo').enable();

        // Is there more redo history ? If not, we disable this btn
        if( this.codeEditor.historySize().redo == 0 ) {
            Ext.getCmp(this.id + '-btn-redo').disable();
        }
    },

    resize : function(width, height)
    {
        var cmpEl = this.el, EditorEl = cmpEl.child('.CodeMirror-scroll');

        EditorEl.setHeight(height-89);
    },

    removeLine : function(line)
    {
        return this.codeEditor.removeLine(line);
    },

    reIndentAll : function()
    {
        var nbLine = this.codeEditor.lineCount(), i;

        for( i=0; i < nbLine; i++ ) {
            this.codeEditor.indentLine(i);
        }
        this.codeEditor.focus();
    },

    scrollTo: function(position)
    {
        var EditorEl = this.el.child('.CodeMirror-scroll');
        EditorEl.dom.scrollTop = position;

    },

    setOriginalContent : function(content)
    {
        this.originalContent = content;
        this.documentDurty = false;
    },

    setLine : function(line, content)
    {
        this.codeEditor.setLine(line, content);
    },

    setOption: function(optionName, optionValue) {

        if (this.initialized) {
                this.codeEditor.setOption(optionName, optionValue);
        }
    },

    setValue: function(v) {
        if (this.initialized) {
                this.codeEditor.setValue(v);
                this.originalContent = v;
                this.codeEditor.clearHistory();
        }
    },

    switchTheme: function(theme)
    {
        this.codeEditor.setOption("theme", theme);
    },

    undo : function()
    {
        this.codeEditor.undo();

        // Enable the Redo btn
        Ext.getCmp(this.id + '-btn-redo').enable();

        // Is there more undo history ? If not, we disable this btn
        if( this.codeEditor.historySize().undo == 0 ) {
            Ext.getCmp(this.id + '-btn-undo').disable();
        }
    }

});
Ext.reg('codemirror', Ext.ux.CodeMirror);
