Ext.namespace('ui','ui.cmp','ui.cmp._FilePanel');

//------------------------------------------------------------------------------
// FilePanel internals
Ext.namespace('ui.cmp._FilePanel.tbar.menu');
Ext.namespace('ui.cmp._FilePanel.tbar.items');

// FilePanel editor indo/redo items
ui.cmp._FilePanel.tbar.items.undoRedo = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.undoRedo.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.undoRedo, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {

            id    : this.id_prefix + '-FILE-' + this.fid + '-grp-undoRedo',
            items : [{
                id      : this.id_prefix + '-FILE-' + this.fid + '-btn-undo',
                scope   : this,
                tooltip : _('<b>Undo</b>'),
                disabled: true,
                iconCls : 'iconUndo',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).undo();
                }
            },{
                id      : this.id_prefix + '-FILE-' + this.fid + '-btn-redo',
                scope   : this,
                tooltip : _('<b>Redo</b>'),
                disabled: true,
                iconCls : 'iconRedo',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).redo();
                }
            }]
        });
    }
});


// FilePanel editor user notes item
ui.cmp._FilePanel.tbar.items.usernotes = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.usernotes.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.usernotes, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype: 'usernotes',
                file : this.file,
                fid  : Ext.id()
            }]
        });
    }
});


// FilePanel editor commun items
ui.cmp._FilePanel.tbar.items.common = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.common.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.common, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                tooltip : _('Close Tab'),
                iconCls : 'iconClose',
                handler : function()
                {
                    Ext.getCmp('main-panel').remove(this.prefix + '-' + this.fid);
                }
            },{
                id      : this.prefix + '-' + this.fid + '-btn-tabLeft-' + this.ftype,
                scope   : this,
                tooltip : _('Go to previous tab'),
                iconCls : 'iconArrowLeft',
                handler : this.goToPreviousTab
            },{
                id      : this.prefix + '-' + this.fid + '-btn-tabRight-' + this.ftype,
                scope   : this,
                tooltip : _('Go to next tab'),
                disabled: true,
                iconCls : 'iconArrowRight',
                handler : this.goToNextTab
            }]
        });
    }
});

// FilePanel editor menu for LangFile
ui.cmp._FilePanel.tbar.menu.lang = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.menu.lang.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.menu.lang, Ext.Toolbar.Button,
{
    text    : _('MarkUp'),
    iconCls : 'iconInsertCode',
    init    : function()
    {
        Ext.apply(this,
        {
            menu : new Ext.menu.Menu({
                items : [{
                    scope   : this,
                    text    : _('Reviewed tag'),
                    handler : function()
                    {
                        Ext.getCmp(this.comp_id).insertLine(
                            2, "<!-- Reviewed: no Maintainer: " +
                            PhDOE.user.login + " -->"
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Revcheck tag'),
                    handler : function()
                    {
                        Ext.getCmp(this.comp_id).insertLine(
                            1,
                            "<!-- EN-Revision: XX Maintainer: " +
                            PhDOE.user.login + " Status: ready -->"
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }]
            })
        });
    }
});

// FilePanel editor menu for ENFile
ui.cmp._FilePanel.tbar.menu.en = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.menu.en.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.menu.en, Ext.Toolbar.Button,
{
    text    : _('MarkUp'),
    iconCls : 'iconInsertCode',
    init    : function()
    {
        Ext.apply(this,
        {
            menu : new Ext.menu.Menu({
                items : [{
                    scope   : this,
                    text    : _('Description section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            " <refsect1 role=\"description\"><!-- {{{ -->\r\n  ",
                            "&reftitle.description;\r\n  ",
                            "<methodsynopsis>\r\n   ",
                            "<!-- Example: All functions have this -->\r\n   ",
                            "<type>thereturned type</type><methodname>func_name</methodname>\r\n   ",
                            "<!-- Example: Required parameter -->\r\n   ",
                            "<methodparam><type>param1type</type><parameter>firstparameter</parameter></methodparam>\r\n   ",
                            "<!-- Example: Optional parameter, also by reference -->\r\n   ",
                            "<methodparam choice=\"opt\"><type>int</type><parameter role=\"reference\">secondparameter</parameter></methodparam>\r\n   ",
                            "<!-- Example: If no methodparams exist (void), use this -->\r\n   ",
                            "<void />\r\n  ",
                            "</methodsynopsis>\r\n  ",
                            "<para>\r\n   ",
                            "The function description goes here.\r\n  ",
                            "</para>\r\n ",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Parameters section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"parameters\"><!-- {{{ -->\r\n",
                            "&reftitle.parameters;\r\n",
                            "<para>\r\n",
                            "<variablelist>\r\n",
                            "<varlistentry>\r\n",
                            "<term><parameter>firstparameter</parameter></term>\r\n",
                            "<listitem>\r\n",
                            "<para>\r\n",
                            "Its description\r\n",
                            "</para>\r\n",
                            "</listitem>\r\n",
                            "</varlistentry>\r\n",
                            "<varlistentry>\r\n",
                            "<term>\r\n",
                            "<parameter>secondparameter</parameter>\r\n",
                            "</term>\r\n",
                            "<listitem>\r\n",
                            "<para>\r\n",
                            "Its description\r\n",
                            "</para>\r\n",
                            "</listitem>\r\n",
                            "</varlistentry>\r\n",
                            "</variablelist>\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Return section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"returnvalues\"><!-- {{{ -->\r\n",
                            "&reftitle.returnvalues;\r\n",
                            "<para>\r\n",
                            "What this function returns, first on success, then failure.\r\n",
                            "If simply true on success and false on failure, just use &return.success; here.\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Error section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"errors\"><!-- {{{ -->\r\n",
                            "&reftitle.errors;\r\n",
                            "<para>\r\n",
                            "When does this function issue E_* level errors, and/or throw exceptions.\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->\r\n"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Unicode section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"unicode\"><!-- {{{ -->\r\n",
                            "&reftitle.unicode;\r\n",
                            "<para>\r\n",
                            "Information specific to unicode, from the PHP 6 changes.\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Changelog section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"changelog\"><!-- {{{ -->\r\n",
                            "&reftitle.changelog;\r\n",
                            "<para>\r\n",
                            "<informaltable>\r\n",
                            "<tgroup cols=\"2\">\r\n",
                            "<thead>\r\n",
                            "<row>\r\n",
                            "<entry>&Version;</entry>\r\n",
                            "<entry>&Description;</entry>\r\n",
                            "</row>\r\n",
                            "</thead>\r\n",
                            "<tbody>\r\n",
                            "<row>\r\n",
                            "<entry>Enter the version of change here</entry>\r\n",
                            "<entry>\r\n",
                            "Describe the change\r\n",
                            "</entry>\r\n",
                            "</row>\r\n",
                            "</tbody>\r\n",
                            "</tgroup>\r\n",
                            "</informaltable>\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Examples section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"examples\"><!-- {{{ -->\r\n",
                            "&reftitle.examples;\r\n",
                            "<para>\r\n",
                            "<example xml:id=\"function-name.example.basic\"><!-- {{{ -->\r\n",
                            "<title><function>function-name</function> example</title>\r\n",
                            "<para>\r\n",
                            "Any text that describes the purpose of the example, or what\r\n",
                            "goes on in the example should be here. (Inside the <example> tag, not out).\r\n",
                            "</para>\r\n",
                            "<programlisting role=\"php\">\r\n",
                            "<![CDATA[\r\n",
                            "<?php\r\n",
                            "if ($anexample === true) {\r\n",
                            "echo 'Use the PEAR Coding standards';\r\n",
                            "}\r\n",
                            "if ($thereisoutput === 'and it is multiple lines') {\r\n",
                            "echo 'Use a screen like we did below';\r\n",
                            "}\r\n",
                            "?>\r\n",
                            "]]>\r\n",
                            "</programlisting>\r\n",
                            "&example.outputs.similar;\r\n",
                            "<screen>\r\n",
                            "<![CDATA[\r\n",
                            "Use the PEAR Coding standards\r\n",
                            "Use a screen like we did below\r\n",
                            "]]>\r\n",
                            "</screen>\r\n",
                            "</example><!-- }}} -->\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Notes section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"notes\"><!-- {{{ -->\r\n",
                            "&reftitle.notes;\r\n",
                            "<caution>\r\n",
                            "<para>\r\n",
                            "Any notes that don't fit anywhere else should go here.\r\n",
                            "90% of the time, notes, warnings or cautions are better placed in the\r\n",
                            "parameters section. Consider that before using this section!\r\n",
                            "</para>\r\n",
                            "</caution>\r\n",
                            "&note.language-construct;\r\n",
                            "&note.not-bin-safe;\r\n",
                            "&note.registerglobals;\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('SeeAlso section'),
                    handler : function()
                    {
                        var cursorPosition = Ext.getCmp(this.comp_id).getCursor();

                        Ext.getCmp(this.comp_id).insertLine(
                            cursorPosition.line,
                            [
                            "\r\n<refsect1 role=\"seealso\"><!-- {{{ -->\r\n",
                            "&reftitle.seealso;\r\n",
                            "<para>\r\n",
                            "<simplelist>\r\n",
                            "<member><function>somefunc</function></member>\r\n",
                            "<member><function>another_func</function></member>\r\n",
                            "<member>The <link linkend=\"something\">something appendix</link></member>\r\n",
                            "</simplelist>\r\n",
                            "</para>\r\n",
                            "</refsect1><!-- }}} -->"
                            ].join('')
                            );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }]
            })
        });
    }
});

// FilePanel editor reindent item & tags menu
ui.cmp._FilePanel.tbar.items.reindentTags = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._FilePanel.tbar.items.reindentTags.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._FilePanel.tbar.items.reindentTags, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            id    : this.id_prefix + '-FILE-' + this.fid + '-grp-tools',
            items : [{
                scope        : this,
                tooltip      : _('<b>Check</b> XML with XmlLint'),
                iconCls      : 'iconXml',
                handler      : function(btn)
                {
                    new ui.task.CheckXml({
                        idPrefix : this.id_prefix,
                        fid      : this.fid
                    });
                }
            }

            /* Actually, codemirror2 don't support this. Desactivate it.

            {
                scope        : this,
                tooltip      : _('<b>Enable / Disable</b> spellChecking'),
                enableToggle : true,
                iconCls      : 'iconSpellCheck',
                pressed      : PhDOE.user.conf[this.spellCheckConf.module][this.spellCheckConf.itemName],
                handler      : function(btn)
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).setSpellcheck(btn.pressed);

                    new ui.task.UpdateConfTask({
                        module    : this.spellCheckConf.module,
                        itemName  : this.spellCheckConf.itemName,
                        value     : btn.pressed,
                        notify    : false
                    });

                } editorTheme
            },
            */
            ,(this.lang === 'en') ? new ui.cmp._FilePanel.tbar.menu.en({
                comp_id : this.id_prefix + '-FILE-' + this.fid
            }) :
            new ui.cmp._FilePanel.tbar.menu.lang({
                comp_id : this.id_prefix + '-FILE-' + this.fid
            }),
            {
                scope: this,
                text: _('Editor option'),
                iconCls: 'iconConf',
                menu:[{
                    scope: this,
                    text: _('Re-indent all this file'),
                    iconCls : 'iconIndent',
                    handler : function()
                    {
                        Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).reIndentAll();
                    }
                },{
                    scope: this,
                    text: _('Enable line wrapping'),
                    checked: ((PhDOE.user.conf.main.lineWrapping === true) ? true : false),
                    checkHandler: function(item, checked)
                    {
                        var wrappingValue = ( checked ) ? true : false;

                        Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).setOption('lineWrapping', wrappingValue);

                        new ui.task.UpdateConfTask({
                            module    : 'main',
                            itemName  : 'lineWrapping',
                            value     : checked,
                            notify    : false
                        });

                    }
                },{
                    scope: this,
                    text: _('Choose a Theme'),
                    iconCls: 'iconThemes',
                    onThemeChange: function()
                    {
                        var editorCmp = Ext.getCmp(this.ownerCt.ownerCt.ownerCt.id_prefix + '-FILE-' + this.ownerCt.ownerCt.ownerCt.fid);

                        Ext.each(this.menu.items.items, function(item)
                        {
                            if( item.checked === true )
                            {
                                editorCmp.switchTheme(item.themeName);

                                new ui.task.UpdateConfTask({
                                    module    : 'main',
                                    itemName  : 'editorTheme',
                                    value     : item.themeName,
                                    notify    : false
                                });
                            }
                        });

                    },
                    menu: {
                        items: [{
                            text: _('No theme'),
                            themeName: false,
                            checked: (PhDOE.user.conf.main.editorTheme === false),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Default theme'),
                            themeName: 'default',
                            checked: (PhDOE.user.conf.main.editorTheme === 'default' || PhDOE.user.conf.main.editorTheme === 'undefined'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Cobalt'),
                            themeName: 'cobalt',
                            checked: (PhDOE.user.conf.main.editorTheme === 'cobalt'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Eclipse'),
                            themeName: 'eclipse',
                            checked: (PhDOE.user.conf.main.editorTheme === 'eclipse'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Elegant'),
                            themeName: 'elegant',
                            checked: (PhDOE.user.conf.main.editorTheme === 'elegant'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Monokai'),
                            themeName: 'monokai',
                            checked: (PhDOE.user.conf.main.editorTheme === 'monokai'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Neat'),
                            themeName: 'neat',
                            checked: (PhDOE.user.conf.main.editorTheme === 'neat'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('Night'),
                            themeName: 'night',
                            checked: (PhDOE.user.conf.main.editorTheme === 'night'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        },{
                            text: _('RubyBlue'),
                            themeName: 'rubyblue',
                            checked: (PhDOE.user.conf.main.editorTheme === 'rubyblue'),
                            group: 'cmd2-theme',
                            checkHandler: function() {
                                this.ownerCt.ownerCt.onThemeChange();
                            }
                        }]
                    }
                }]

            }
            ]
        });
    }
});

//------------------------------------------------------------------------------
// FilePanel
// config - {
//    id, title, prefix, original,  ftype {'EN' | 'LANG'},
//    fid, fpath, fname, lang,
//    readOnly,                    indicate this file is readonly
//    openInNewTabBtn,             add a button into the toolsBar to open this file into a new tab
//    isTrans                      pendingTranslate file config
//    isPatch, fuid,               pending patch file config // TODO: obsolète. Inutile de fournir une interface spécifique pour les patchs
//    parser, storeRecord,
//    syncScrollCB {true | false}, display sync-scroll checkbox
//    syncScroll {true | false},   indicate whether sync the scroll with corresponding file
//    syncScrollConf               syncScrollConf attribute name in userConf
//    spellCheck {true | false},   indicate whether spellCheck is enable or not
//    spellCheckConf               spellCheckConf attribute name in userConf
// }
ui.cmp.FilePanel = Ext.extend(Ext.form.FormPanel,
{
    activeScroll : false,  // scroll lock

    goToPreviousTab : function()
    {
        var currentTabId = this.prefix+'-'+this.fid,
            tabs         = Ext.getCmp('main-panel').layout.container.items.items,
            previousTabId, currentTabIndex, i;

        for( i=0; i < tabs.length; i++ ) {
            if( tabs[i].id === currentTabId ) {
                currentTabIndex = i;
            }
        }

        // What's the ID of the previous tab ? There is always the first tab, with id's MainInfoTabPanel
        // If currentTabIndex is 1, the previous is always MainInfoTabPanel, so we don't compute it
        if( currentTabIndex === 1 ) {
            previousTabId = 'MainInfoTabPanel';
        } else {
            previousTabId = tabs[currentTabIndex - 1].id;
        }

        // We go to the previous
        Ext.getCmp('main-panel').setActiveTab(previousTabId);
    },

    goToNextTab : function()
    {
        var currentTabId = this.prefix+'-'+this.fid,
            tabs         = Ext.getCmp('main-panel').layout.container.items.items,
            nextTabId    = false, currentTabIndex, i;

        for( i=0; i < tabs.length; i++ ) {
            if( tabs[i].id === currentTabId ) {
                currentTabIndex = i;
            }
        }

        // What's the ID of the next tab ?
        if( tabs[currentTabIndex + 1] ) {
            // We go to the previous
            nextTabId = tabs[currentTabIndex + 1].id;
            Ext.getCmp('main-panel').setActiveTab(nextTabId);
        }
    },

    initComponent : function()
    {
        var id_prefix = this.prefix + '-' + this.ftype;

        this.bbar = (this.syncScrollCB) ? [{
            height    : 22,
            xtype     : 'checkbox',
            name      : 'syncScrollConf.module',
            hideLabel : true,
            checked   : PhDOE.user.conf[this.syncScrollConf.module][this.syncScrollConf.itemName],
            boxLabel  : _('Synchronize scroll bars'),
            listeners : {
                scope : this,
                check : function(c)
                {
                    new ui.task.UpdateConfTask({
                        module   : this.syncScrollConf.module,
                        itemName : this.syncScrollConf.itemName,
                        value    : c.getValue(),
                        notify   : false
                    });
                },
                render : function(c)
                {
                    Ext.DomHelper.insertHtml(
                        'beforeBegin', c.el.dom,
                        [
                        '<div style="display: inline;" class="x-statusbar">',
                        '<span class="x-status-text-panel">', _('Line: '),
                        '<span id="', id_prefix, '-status-line-', this.fid, '">-</span></span>',
                        '&nbsp;&nbsp;<span class="x-status-text-panel">', _('Col: '),
                        '<span id="', id_prefix, '-status-col-', this.fid, '">-</span></span>',
                        '</div>&nbsp;&nbsp;'
                        ].join('')
                        );
                }
            }
        }] : [{
            xtype     : 'panel',
            height    : 22,
            baseCls   : '',
            bodyStyle : 'padding-top:5px;',
            html      : [
                '<div style="display: inline;" class="x-statusbar">',
                '<span class="x-status-text-panel">', _('Line: '),
                '<span id="', id_prefix, '-status-line-', this.fid, '">-</span></span>',
                '&nbsp;&nbsp;<span class="x-status-text-panel">', _('Col: '),
                '<span id="', id_prefix, '-status-col-', this.fid, '">-</span></span>',
                '</div>&nbsp;&nbsp;'
            ].join('')
        }];

        if (!this.readOnly) {

            // Tbar definition
            // en/lang file panel tbar
            this.tbar = [
            new ui.cmp._FilePanel.tbar.items.common({
                prefix          : this.prefix,
                fid             : this.fid,
                ftype           : this.ftype,
                goToPreviousTab : this.goToPreviousTab,
                goToNextTab     : this.goToNextTab
            }), {
                xtype : 'buttongroup',
                id    : id_prefix + '-FILE-' + this.fid + '-grp-save',
                items : [{
                    id       : id_prefix + '-FILE-' + this.fid + '-btn-save',
                    scope    : this,
                    tooltip  : _('<b>Save</b> this file (CTRL+s)'),
                    iconCls  : 'iconSaveFile',
                    disabled : true,
                    handler  : function()
                    {
                        // From "All files" or "Need translate file", we only save the file
                        if (this.prefix === 'AF') {
                            new ui.task.SaveFileTask({
                                prefix      : this.prefix,
                                ftype       : this.ftype,
                                fid         : this.fid,
                                fpath       : this.fpath,
                                fname       : this.fname,
                                lang        : this.lang,
                                storeRecord : this.storeRecord
                            });
                            return;
                        }
                        if (this.prefix === 'FNT' ) {
                            new ui.task.SaveTransFileTask({
                                prefix      : this.prefix,
                                ftype       : this.ftype,
                                fid         : this.fid,
                                fpath       : this.fpath,
                                fname       : this.fname,
                                lang        : this.lang,
                                storeRecord : this.storeRecord
                            });
                            return;
                        }

                        // We check the conf option : onSaveFile. Can be : ask-me, always or never
                        if( !PhDOE.user.conf.main.onSaveFile ) {
                            PhDOE.user.conf.main.onSaveFile = 'ask-me';
                        }

                        switch (PhDOE.user.conf.main.onSaveFile) {

                            case 'always':
                                new ui.task.CheckFileTask({
                                    prefix      : this.prefix,
                                    ftype       : this.ftype,
                                    fid         : this.fid,
                                    fpath       : this.fpath,
                                    fname       : this.fname,
                                    lang        : this.lang,
                                    storeRecord : this.storeRecord
                                }); // include SaveFileTask when no err
                                break;

                            case 'never':
                                new ui.task.SaveFileTask({
                                    prefix      : this.prefix,
                                    ftype       : this.ftype,
                                    fid         : this.fid,
                                    fpath       : this.fpath,
                                    fname       : this.fname,
                                    lang        : this.lang,
                                    storeRecord : this.storeRecord
                                });
                                break;

                            case 'ask-me':
                                Ext.MessageBox.show({
                                    title   : _('Confirm'),
                                    msg     : _('Do you want to check for errors before saving?'),
                                    icon    : Ext.MessageBox.INFO,
                                    buttons : Ext.MessageBox.YESNOCANCEL,
                                    scope   : this,
                                    fn      : function (btn)
                                    {
                                        if (btn === 'no') {

                                            new ui.task.SaveFileTask({
                                                prefix      : this.prefix,
                                                ftype       : this.ftype,
                                                fid         : this.fid,
                                                fpath       : this.fpath,
                                                fname       : this.fname,
                                                lang        : this.lang,
                                                storeRecord : this.storeRecord
                                            });

                                        } else if (btn === 'yes') {

                                            new ui.task.CheckFileTask({
                                                prefix      : this.prefix,
                                                ftype       : this.ftype,
                                                fid         : this.fid,
                                                fpath       : this.fpath,
                                                fname       : this.fname,
                                                lang        : this.lang,
                                                storeRecord : this.storeRecord
                                            }); // include SaveFileTask when no err
                                        }
                                    }
                                });
                                break;
                        }
                    }
                }]
            }, new ui.cmp._FilePanel.tbar.items.undoRedo({
                id_prefix : id_prefix,
                fid       : this.fid
            }),
            new ui.cmp._FilePanel.tbar.items.reindentTags({
                id_prefix      : id_prefix,
                fid            : this.fid,
                lang           : this.lang
            }), {
                scope: this,
                iconCls:'iconZoom',
                tooltip: _('<b>Expand</b> in a popup'),
                handler: function(b) {
                    var winMax = new Ext.Window({
                        title: this.originTitle,
                        bodyStyle:    'background-color:white',
                        maximized :true,
                        animateTarget: b.el,
                        items: [{
                            xtype      : 'codemirror',
                            id         : id_prefix + '-FILE-' + this.fid + 'maximized',
                            readOnly   : false,
                            lineWrapping: PhDOE.user.conf.main.lineWrapping,
                            theme: PhDOE.user.conf.main.editorTheme,
                            parser     : this.parser,
                            isModified : false,
                            listeners  : {
                                scope: this,
                                initialize : function()
                                {
                                    var codeMirrorMax =Ext.getCmp(id_prefix + '-FILE-' + this.fid + 'maximized'),
                                        currentCode = Ext.getCmp(id_prefix + '-FILE-' + this.fid).getValue();

                                    // We set the current code into the maximized window editor
                                    codeMirrorMax.setValue(currentCode);

                                    // We must wait until the winMax is rendered to rize the editor
                                    var waitTask = new Ext.util.DelayedTask(function(){

                                        if( winMax.rendered ) {
                                            codeMirrorMax.resize(false, winMax.getInnerHeight()+89);
                                        } else {
                                            waitTask.delay(500);
                                        }

                                    });
                                    waitTask.delay(500);
                                }
                            }
                        }],
                        listeners : {
                            scope: this,
                            beforeclose : function(p) {
                                var newCode = p.items.items[0].getValue();
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid).setValue(newCode);
                            }
                        }
                    });
                    winMax.show();
                }
            },{
                scope: this,
                iconCls:'iconView',
                hidden : !(this.lang === 'en' && this.fname.substr(-3) === 'xml'),
                tooltip: _('<b>Preview</b> in a popup'),
                handler: function() {
                    var needsave  = Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified;
                    if (needsave) {
                        Ext.Msg.alert(_('Information'), _('You must save your file in order to preview the result.'), function(btn){
                            if (btn == 'ok'){
                                new ui.cmp.PreviewFile({
                                    path: this.lang + this.fpath + this.fname
                                });
                            }
                        }, this);
                    }
                    else {
                        new ui.cmp.PreviewFile({
                            path: this.lang + this.fpath + this.fname
                        });
                    }
                }
            },'->',
            new ui.cmp._FilePanel.tbar.items.usernotes({
                fid : this.fid,
                file: this.lang + this.fpath + this.fname
            })
            ];
        } else {
            this.tbar = [
                new ui.cmp._FilePanel.tbar.items.common({
                    prefix          : this.prefix,
                    fid             : this.fid,
                    ftype           : this.ftype,
                    goToPreviousTab : this.goToPreviousTab,
                    goToNextTab     : this.goToNextTab
                }), {
                    xtype: 'buttongroup',
                    hidden: ( this.openInNewTabBtn !== true ),
                    scope: this,
                    items:[{
                        tooltip: _('Open for editing in a new Tab'),
                        iconCls: 'iconEditInNewTab',
                        scope: this,
                        handler: function() {
                            ui.cmp.RepositoryTree.getInstance().openFile(
                                'byPath',
                                this.lang + this.fpath,
                                this.fname
                            );
                        }
                    }]
                }, '->', (( this.ftype !== 'GGTRANS' ) ?
                            new ui.cmp._FilePanel.tbar.items.usernotes({
                                fid : this.fid,
                                file: this.lang + this.fpath + this.fname
                            })
                            : '' )
            ];
        }

        Ext.apply(this,
        {
            title       : this.title,
            cls         : 'code-mirror-panel',
            originTitle : this.title,
            items       : [{
                xtype       : 'codemirror',
                id          : id_prefix + '-FILE-' + this.fid,
                readOnly    : this.readOnly,
                lineWrapping: PhDOE.user.conf.main.lineWrapping,
                theme       : PhDOE.user.conf.main.editorTheme,
                parser      : this.parser,
                isModified  : false,
                listeners   : {
                    scope      : this,
                    initialize : function()
                    {
                        var herePath, hereName;

                        if ( this.isTrans )
                        {
                            if( this.storeRecord.data.fileModified )
                            {
                                herePath = this.lang + this.fpath;
                                hereName = this.fname;
                            } else {
                                herePath = 'en' + this.fpath;
                                hereName = this.fname;
                            }
                        } else {
                            herePath = this.lang + this.fpath;
                            hereName = this.fname;
                        }

                        new ui.task.GetFileTask({
                            prefix   : this.prefix,
                            ftype    : this.ftype,
                            original : this.original,
                            fid      : this.fid,
                            fpath    : herePath,
                            freadOnly: this.readOnly,
                            fname    : hereName,
                            skeleton : this.skeleton,
                            storeRecord: this.storeRecord
                        });
                    },

                    coderestored : function()
                    {
                        // This should never occurs on readOnly file
                        if( this.readOnly ) {
                            return;
                        }

                        if ( Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified ) {
                            // Remove [modified] in title
                            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).permlink +
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
                                );

                            // Do we need to remove the red mark into the Tab title ?
                            if(
                                ( this.ftype === 'LANG' && PhDOE.user.lang !== 'en' )
                                ||
                                this.ftype === 'EN'
                            ) {

                                if( (this.ftype === 'EN'   && !Ext.getCmp(this.prefix + '-LANG-FILE-' + this.fid).isModified ) ||
                                    (this.ftype === 'LANG' && !Ext.getCmp(this.prefix + '-EN-FILE-'   + this.fid).isModified ) ) {

                                    Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                        Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                                    );
                                }
                            } else {
                                Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                    Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                                );
                            }

                            // Desactivate save button
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();

                            // Mark as not modified
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
                            Ext.getCmp(this.prefix + '-' + this.fid).isModified = false;
                        }
                    },

                    codemodified : function()
                    {
                        // This should never occurs on readOnly file
                        if( this.readOnly ) {
                            return;
                        }

                        // We follow the same rules as defined in GetFileTask.js.
                        // So, if the toolsBar is disabled here, we just skeep this function and return asap.
                        if( Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-grp-save').disabled ) {
                                return;
                        }

                        var cmpFile  = Ext.getCmp(id_prefix + '-FILE-' + this.fid),
                            cmpPanel = Ext.getCmp(id_prefix + '-PANEL-' + this.fid);

                        if ( !cmpFile.isModified )
                        {
                            // Add an [modified] in title
                            cmpPanel.setTitle(
                                cmpPanel.permlink    +
                                cmpPanel.originTitle +
                                ' <span style="color:#ff0000; font-weight: bold;">[' + _('modified') + ']</span>'
                            );

                            // Add in tabpanel
                            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                Ext.getCmp(this.prefix + '-' + this.fid).originTitle +
                                ' <t style="color:#ff0000; font-weight: bold;">*</t>'
                            );
                            Ext.getCmp(this.prefix + '-' + this.fid).isModified = true;


                            // Activate save button
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').enable();

                            // Enable the undo btn
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-undo').enable();

                            // Mark as modified
                            cmpFile.isModified = true;
                        }
                    },

                    cursormove : function(line, caracter)
                    {
                        Ext.get(id_prefix + '-status-line-' + this.fid).dom.innerHTML = line;
                        Ext.get(id_prefix + '-status-col-'  + this.fid).dom.innerHTML = caracter;
                    },

                    scroll : function(scrollY)
                    {
                        var opp_prefix, opp_panel, opp_file;

                        if( this.syncScroll && PhDOE.user.conf[this.syncScrollConf.module][this.syncScrollConf.itemName] )
                        {
                            switch (this.ftype) {
                                case 'EN':
                                    if( this.prefix == 'FNT' ) {
                                        opp_prefix = this.prefix + '-TRANS';
                                    } else {
                                        opp_prefix = this.prefix + '-LANG';
                                    }
                                    break;

                                case 'LANG':
                                    opp_prefix = this.prefix + '-EN';
                                    break;

                                case 'TRANS':
                                    if( PhDOE.user.conf.newFile.secondPanel == 'google' ) {
                                        opp_prefix = this.prefix + '-GGTRANS';
                                    }
                                    if( PhDOE.user.conf.newFile.secondPanel == 'originalFile' ) {
                                        opp_prefix = this.prefix + '-EN';
                                    }
                                    break;

                                case 'GGTRANS':
                                    opp_prefix = this.prefix + '-TRANS';
                                    break;

                            }

                            opp_panel = Ext.getCmp(opp_prefix + '-PANEL-' + this.fid);
                            opp_file  = Ext.getCmp(opp_prefix + '-FILE-'  + this.fid);

                            // scroll lock logic:
                            // 1. panel-A gains lock if panel-B is not scrolling
                            // 2. panel-B cannot gain lock to scoll as panel-A gained
                            // 3. panel-B force panel-A to release the lock
                            // 4. So.. scrolling won't be propagated
                            // 5. if panel-A/panel-B scroll again, lock can be gained
                            if (opp_panel.activeScroll === false) {
                                this.activeScroll = true;   // gain scroll lock
                                opp_file.scrollTo(scrollY);
                            } else {
                                opp_panel.activeScroll = false; // force release opponent's scroll lock
                            }
                        }
                    }
                }
            }]
        });
        ui.cmp.FilePanel.superclass.initComponent.call(this);
    }
});
