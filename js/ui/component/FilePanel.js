Ext.namespace('ui','ui.component','ui.component._FilePanel');

//------------------------------------------------------------------------------
// FilePanel internals
Ext.namespace('ui.component._FilePanel.tbar.menu');
Ext.namespace('ui.component._FilePanel.tbar.items');

// FilePanel editor indo/redo items
ui.component._FilePanel.tbar.items.undoRedo = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._FilePanel.tbar.items.undoRedo.superclass.constructor.call(this);
};
Ext.extend(ui.component._FilePanel.tbar.items.undoRedo, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
               id      : this.id_prefix + '-FILE-' + this.fid + '-btn-undo',
               scope   : this,
               tooltip : _('<b>Undo</b>'),
               disabled: true,
               iconCls : 'iconUndo',
               handler : function()
               {
                   Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).undo(this.id_prefix, this.fid);
               }
           },{
               id      : this.id_prefix + '-FILE-' + this.fid + '-btn-redo',
               scope   : this,
               tooltip : _('<b>Redo</b>'),
               disabled: true,
               iconCls : 'iconRedo',
               handler : function()
               {
                   Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).redo(this.id_prefix, this.fid);
               }
           }]
        });
    }
});

// FilePanel editor commun items
ui.component._FilePanel.tbar.items.common = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._FilePanel.tbar.items.common.superclass.constructor.call(this);
};
Ext.extend(ui.component._FilePanel.tbar.items.common, Ext.ButtonGroup,
{
    init    : function()
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
                handler :  this.goToPreviousTab
            },{
                id      : this.prefix + '-' + this.fid + '-btn-tabRight-' + this.ftype,
                scope    : this,
                tooltip : _('Go to next tab'),
                disabled : true,
                iconCls  : 'iconArrowRight',
                handler  : this.goToNextTab
            }]
        });
    }
});
// FilePanel editor menu for LangFile
ui.component._FilePanel.tbar.menu.lang = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._FilePanel.tbar.menu.lang.superclass.constructor.call(this);
};
Ext.extend(ui.component._FilePanel.tbar.menu.lang, Ext.Toolbar.Button,
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
                        Ext.getCmp(this.comp_id).insertIntoLine(
                            2, 'end', "\n<!-- Reviewed: no -->"
                        );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }, {
                    scope   : this,
                    text    : _('Revcheck tag'),
                    handler : function()
                    {
                        Ext.getCmp(this.comp_id).insertIntoLine(
                            2, "end",
                            "\n<!-- EN-Revision: XX Maintainer: " +
                                phpDoc.userLogin + " Status: ready -->"
                        );
                        Ext.getCmp(this.comp_id).focus();
                    }
                }]
            })
        });
    }
});

// FilePanel editor menu for ENFile
ui.component._FilePanel.tbar.menu.en = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._FilePanel.tbar.menu.en.superclass.constructor.call(this);
};
Ext.extend(ui.component._FilePanel.tbar.menu.en, Ext.Toolbar.Button,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
                        var position = Ext.util.JSON.decode(Ext.getCmp(this.comp_id).getCursorPosition());

                        Ext.getCmp(this.comp_id).insertIntoLine(
                            position.line, 0,
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
ui.component._FilePanel.tbar.items.reindentTags = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._FilePanel.tbar.items.reindentTags.superclass.constructor.call(this);
};
Ext.extend(ui.component._FilePanel.tbar.items.reindentTags, Ext.ButtonGroup,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                tooltip : _('<b>Re-indent</b> all this file'),
                iconCls : 'iconIndent',
                handler : function()
                {
                    Ext.getCmp(this.id_prefix + '-FILE-' + this.fid).reIndentAll();
                }
            },(this.lang === 'en') ? new ui.component._FilePanel.tbar.menu.en({ comp_id : this.id_prefix + '-FILE-' + this.fid }) :
                                     new ui.component._FilePanel.tbar.menu.lang({ comp_id : this.id_prefix + '-FILE-' + this.fid})
            ]
        });
    }
});

//------------------------------------------------------------------------------
// FilePanel
// config - {
//    id, title, prefix, ftype {'EN' | 'LANG'},
//    fid, fpath, fname, lang,
//    readOnly,                    indicate this file is readonly
//    isTrans                      pendingTranslate file config
//    isPatch, fuid,               pending patch file config
//    parser, storeRecord,
//    syncScrollCB {true | false}, display sync-scroll checkbox
//    syncScroll {true | false},   indicate whether sync the scroll with corresponding file
//    syncScrollConf               syncScrollConf attribute name in userConf
// }
ui.component.FilePanel = Ext.extend(Ext.form.FormPanel,
{
    activeScroll : false,  // scroll lock

    goToPreviousTab : function()
    {
        var currentTabId = this.prefix+'-'+this.fid,
            tabs         = Ext.getCmp('main-panel').layout.container.items.items,
            previousTabId,
            currentTabIndex,
            i;

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
            nextTabId    = false,
            currentTabIndex,
            i;

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
            name      : 'needUpdateScrollbars',
            hideLabel : true,
            checked   : phpDoc.userConf[this.syncScrollConf],
            boxLabel  : _('Synchronize scroll bars'),
            listeners : {
                scope : this,
                check : function(c)
                {
                    var tmp = new ui.task.UpdateConfTask({item: this.syncScrollConf, value: c.getValue()});
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
            this.tbar = (this.isPatch) ? [
                // patch file pane tbar
                new ui.component._FilePanel.tbar.items.common({prefix: this.prefix, fid: this.fid, ftype: this.ftype, goToPreviousTab: this.goToPreviousTab, goToNextTab: this.goToNextTab}),
                {
                    xtype :'buttongroup',
                    items : [{
                        id       : id_prefix + '-FILE-' + this.fid + '-btn-save',
                        scope    : this,
                        tooltip  : _('<b>Accept</b> this patch and <b>Save</b> the file (CTRL+s)'),
                        iconCls  : 'iconSaveFile',
                        handler  : function()
                        {
                            var tmp = new ui.task.AcceptPatchTask({
                                fid         : this.fid,
                                fpath       : this.fpath,
                                fname       : this.fname,
                                fuid        : this.fuid,
                                storeRecord : this.storeRecord
                            });
                        }
                    }, {
                        id       : id_prefix + '-FILE-' + this.fid + '-btn-reject',
                        scope    : this,
                        tooltip  : _('<b>Reject</b> this patch'),
                        iconCls  : 'iconPageDelete',
                        handler  : function()
                        {
                            var tmp = new ui.task.RejectPatchTask({
                                fid         : this.fid,
                                fuid        : this.fuid,
                                storeRecord : this.storeRecord
                            });
                        }
                    }]
                }, new ui.component._FilePanel.tbar.items.undoRedo({id_prefix: id_prefix, fid: this.fid}),
                   new ui.component._FilePanel.tbar.items.reindentTags({id_prefix: id_prefix, fid: this.fid, lang: this.lang})
            ] : [
                // en/lang file pane tbar
                new ui.component._FilePanel.tbar.items.common({prefix: this.prefix, fid: this.fid, ftype: this.ftype, goToPreviousTab: this.goToPreviousTab, goToNextTab: this.goToNextTab}), {
                    xtype :'buttongroup',
                    items : [{
                        id       : id_prefix + '-FILE-' + this.fid + '-btn-save',
                        scope    : this,
                        tooltip  : _('<b>Save</b> this file (CTRL+s)'),
                        iconCls  : 'iconSaveFile',
                        disabled : true,
                        handler  : function()
                        {
                            var tmp;

                            if (this.lang === 'en') {

                                tmp = new ui.task.SaveENFileTask({
                                    prefix      : this.prefix,
                                    ftype       : this.ftype,
                                    fid         : this.fid,
                                    fpath       : this.fpath,
                                    fname       : this.fname,
                                    storeRecord : this.storeRecord
                                });
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();

                            } else {

                                // From "All files" or "Need translate file", we only save the file
                                if (this.prefix === 'AF') {
                                    tmp = new ui.task.SaveLangFileTask({
                                        prefix      : this.prefix,
                                        ftype       : this.ftype,
                                        fid         : this.fid,
                                        fpath       : this.fpath,
                                        fname       : this.fname,
                                        lang        : this.lang,
                                        storeRecord : this.storeRecord
                                    });
                                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                    return;
                                }
                                if (this.prefix === 'FNT' ) {
                                    tmp = new ui.task.SaveTransFileTask({
                                        prefix      : this.prefix,
                                        ftype       : this.ftype,
                                        fid         : this.fid,
                                        fpath       : this.fpath,
                                        fname       : this.fname,
                                        lang        : this.lang,
                                        storeRecord : this.storeRecord
                                    });
                                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                    return;
                                }

                                // We check the conf option : onSaveLangFile. Can be : ask-me, always or never
                                switch (phpDoc.userConf["onSaveLangFile"]) {

                                    case 'always':
                                        tmp = new ui.task.CheckFileTask({
                                            prefix      : this.prefix,
                                            ftype       : this.ftype,
                                            fid         : this.fid,
                                            fpath       : this.fpath,
                                            fname       : this.fname,
                                            lang        : this.lang,
                                            storeRecord : this.storeRecord
                                        }); // include SaveLangFileTask when no err
                                        Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                        break;

                                    case 'never':
                                        tmp = new ui.task.SaveLangFileTask({
                                            prefix      : this.prefix,
                                            ftype       : this.ftype,
                                            fid         : this.fid,
                                            fpath       : this.fpath,
                                            fname       : this.fname,
                                            lang        : this.lang,
                                            storeRecord : this.storeRecord
                                        });
                                        Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                        break;

                                    case 'ask-me':
                                        Ext.MessageBox.show({
                                            title   : _('Confirm'),
                                            msg     : _('Do you want to check for error before saving?'),
                                            icon    : Ext.MessageBox.INFO,
                                            buttons : Ext.MessageBox.YESNOCANCEL,
                                            scope   : this,
                                            fn      : function (btn)
                                            {
                                                if (btn === 'no') {

                                                    tmp = new ui.task.SaveLangFileTask({
                                                        prefix      : this.prefix,
                                                        ftype       : this.ftype,
                                                        fid         : this.fid,
                                                        fpath       : this.fpath,
                                                        fname       : this.fname,
                                                        lang        : this.lang,
                                                        storeRecord : this.storeRecord
                                                    });
                                                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();

                                                } else if (btn === 'yes') {

                                                    tmp = new ui.task.CheckFileTask({
                                                        prefix      : this.prefix,
                                                        ftype       : this.ftype,
                                                        fid         : this.fid,
                                                        fpath       : this.fpath,
                                                        fname       : this.fname,
                                                        lang        : this.lang,
                                                        storeRecord : this.storeRecord
                                                    }); // include SaveLangFileTask when no err
                                                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).setOriginalCode();
                                                }
                                            }
                                        });
                                        break;
                                }
                            }
                        }
                    }, {
                        id       : id_prefix + '-FILE-' + this.fid + '-btn-saveas',
                        scope    : this,
                        tooltip  : _('<b>Save as</b> a patch'),
                        iconCls  : 'iconSaveAsFile',
                        disabled : true,
                        handler  : function()
                        {
                            var tmp = new ui.component.PatchPrompt({
                                prefix : this.prefix,
                                ftype  : this.ftype,
                                fid    : this.fid,
                                fpath  : this.fpath,
                                fname  : this.fname,
                                lang   : this.lang,
                                defaultEmail : (phpDoc.userLogin !== 'anonymous') ? phpDoc.userLogin + '@php.net' : ''
                            }).show();
                        }
                    }]
                }, new ui.component._FilePanel.tbar.items.undoRedo({id_prefix: id_prefix, fid: this.fid}),
                   new ui.component._FilePanel.tbar.items.reindentTags({id_prefix: id_prefix, fid: this.fid, lang: this.lang})
                ]
        } else {
            this.tbar = [
                new ui.component._FilePanel.tbar.items.common({prefix: this.prefix, fid: this.fid, ftype: this.ftype, goToPreviousTab: this.goToPreviousTab, goToNextTab: this.goToNextTab})
            ];
        }

        Ext.apply(this,
        {
            title : this.title,
            cls: 'code-mirror-panel',
            originTitle : this.title,
            items : [{
                xtype      : 'codemirror',
                id         : id_prefix + '-FILE-' + this.fid,
                readOnly   : this.readOnly,
                parser     : this.parser,
                isModified : false,
                listeners  : {
                    scope  : this,
                    initialize : function()
                    {

                        var herePath, hereName, tmp;

                        if( this.isPatch ) {
                          herePath = this.fpath;
                          hereName = this.fname + '.' + this.fuid + '.patch';
                        } else if ( this.isTrans ) {
                             if( this.storeRecord.data['needcommit'] ) {
                                herePath = this.lang + this.fpath;
                                hereName = this.fname+'.new';
                             } else {
                                herePath = 'en' + this.fpath;
                                hereName = this.fname;
                             }
                        } else {
                          herePath = this.lang + this.fpath;
                          hereName = this.fname;
                        }

                        tmp = new ui.task.GetFileTask({
                            prefix : this.prefix,
                            ftype  : this.ftype,
                            fid    : this.fid,
                            fpath  : herePath,
                            fname  : hereName
                        });
                    },
                    coderestored : function() {

                        if ( Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified ) {
                            // Remove [modified] in title
                            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle +
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).permlink
                            );

                            // Remove in tabpanel
                            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                            );

                            // Desactivate save button
                            if ( ! this.isPatch) {
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-saveas').disable();
                            }

                            // Mark as modified
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;

                        }

                    },
                    codemodified : function() {

                        if (!Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified) {
                            // Add an [modified] in title
                            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle +
                                ' <span style="color:#ff0000; font-weight: bold;">[' + _('modified') + ']</span>'
                                + Ext.getCmp(id_prefix + '-PANEL-' + this.fid).permlink
                            );
                            // Add in tabpanel
                            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                Ext.getCmp(this.prefix + '-' + this.fid).originTitle +
                                ' <t style="color:#ff0000; font-weight: bold;">*</t>'
                            );

                            // Activate save button
                            if (! this.isPatch) {
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').enable();
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-saveas').enable();
                            }

                            // Enable the undo btn
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-undo').enable();

                            // Mark as modified
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = true;

                        }


                    },
                    cursormove : function(line, caracter)
                    {
                        Ext.get(id_prefix + '-status-line-' + this.fid).dom.innerHTML = line;
                        Ext.get(id_prefix + '-status-col-'  + this.fid).dom.innerHTML  = caracter;
                    },
                    scroll : function(scrollY)
                    {
                        if( this.syncScroll && phpDoc.userConf[this.syncScrollConf] ) {
                            var opp_prefix;
                            switch (this.ftype) {
                                case 'EN':     opp_prefix = this.prefix + '-LANG';   break;
                                case 'LANG':   opp_prefix = this.prefix + '-EN';     break;
                                case 'PATCH':  opp_prefix = this.prefix + '-ORIGIN'; break;
                                case 'ORIGIN': opp_prefix = this.prefix + '-PATCH';  break;
                            }
                            var opp_panel  = Ext.getCmp(opp_prefix + '-PANEL-' + this.fid),
                                opp_file   = Ext.getCmp(opp_prefix + '-FILE-' + this.fid);

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
        ui.component.FilePanel.superclass.initComponent.call(this);
    }
});
