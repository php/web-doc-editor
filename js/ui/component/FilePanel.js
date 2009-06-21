Ext.namespace('ui','ui.component');

//------------------------------------------------------------------------------
// FilePanel
// config - {
//    id, title, prefix, ftype {'EN' | 'LANG'},
//    fid, fpath, fname, lang,
//    readOnly,                    indicate this file is readonly
//    isPatch, fuid,               pending patch file config
//    parser, storeRecord,
//    syncScrollCB {true | false}, display sync-scroll checkbox
//    syncScroll {true | false},   indicate whether sync the scroll with corresponding file
//    syncScrollConf               syncScrollConf attribute name in userConf
// }
ui.component.FilePanel = Ext.extend(Ext.form.FormPanel,
{
    activeScroll : false,  // scroll lock

    initComponent : function()
    {
        var id_prefix = this.prefix + '-' + this.ftype;

        this.bbar = (this.syncScrollCB) ? [{
            xtype     : 'checkbox',
            name      : 'conf_needupdate_scrollbars',
            hideLabel : true,
            checked   : (phpDoc.userConf[this.syncScrollConf] === 'true'),
            boxLabel  : _('Synchronize scroll bars'),
            listeners : {
                scope : this,
                check : function(c)
                {
                    phpDoc.confUpdate(this.syncScrollConf, c.getValue());
                },
                render : function(c)
                {
                    Ext.DomHelper.insertHtml(
                        'beforeBegin', c.el.dom,
                        '<div style="display: inline;" class="x-statusbar">' +
                            '<span class="x-status-text-panel">' + _('Line: ') +
                            '<span id="' + id_prefix + '-status-line-' + this.fid + '">-</span></span>' +
                            '&nbsp;&nbsp;<span class="x-status-text-panel">' + _('Col: ') +
                            '<span id="' + id_prefix + '-status-col-' + this.fid + '">-</span></span>' +
                        '</div>&nbsp;&nbsp;'
                    );
                }
            }
        }] : [{
            xtype     : 'panel',
            height    : 21,
            baseCls   : '',
            bodyStyle : 'padding-top:5px;',
            html      : '<div style="display: inline;" class="x-statusbar">' +
                            '<span class="x-status-text-panel">' + _('Line: ') +
                            '<span id="' + id_prefix + '-status-line-' + this.fid + '">-</span></span>' +
                            '&nbsp;&nbsp;<span class="x-status-text-panel">' + _('Col: ') +
                            '<span id="' + id_prefix + '-status-col-' + this.fid + '">-</span></span>' +
                        '</div>&nbsp;&nbsp;'
        }];

        if (!this.readOnly) {
            this.tbar = (this.isPatch) ? [{
                id       : id_prefix + '-PANEL-btn-save-' + this.fid,
                scope    : this,
                tooltip  : _('<b>Accept</b> this patch and <b>Save</b> the file'),
                iconCls  : 'saveFile',
                handler  : function()
                {
                    new ui.task.AcceptPatchTask({
                        fid         : this.fid,
                        fpath       : this.fpath,
                        fname       : this.fname,
                        fuid        : this.fuid,
                        storeRecord : this.storeRecord
                    }).run();
                }
            }, {
                id       : id_prefix + '-PANEL-btn-reject-' + this.fid,
                scope    : this,
                tooltip  : _('<b>Reject</b> this patch'),
                iconCls  : 'iconPageDelete',
                handler  : function()
                {
                    new ui.task.RejectPatchTask({
                        fid         : this.fid,
                        fuid        : this.fuid,
                        storeRecord : this.storeRecord
                    }).run();
                }
            }, '-', {
                scope   : this,
                tooltip : _('<b>Re-indent</b> all this file'),
                iconCls : 'iconIndent',
                handler : function()
                {
                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).reIndentAll();
                }
            }] : [{
                id       : id_prefix + '-PANEL-btn-save-' + this.fid,
                scope    : this,
                tooltip  : _('<b>Save</b> this file'),
                iconCls  : 'saveFile',
                disabled : true,
                handler  : function()
                {
                    if (this.lang === 'en') {

                        new ui.task.SaveENFileTask({
                            prefix      : this.prefix,
                            ftype       : this.ftype,
                            fid         : this.fid,
                            fpath       : this.fpath,
                            fname       : this.fname,
                            storeRecord : this.storeRecord
                        }).run();

                    } else {

                        phpDoc.saveLangFile(
                            this.prefix, this.ftype, this.fid, this.fpath, this.fname,
                            this.lang, this.storeRecord, (this.prefix === 'AF')
                        );
                    }
                }
            }, {
                id       : id_prefix + '-PANEL-btn-saveas-' + this.fid,
                scope    : this,
                tooltip  : _('<b>Save as</b> a patch'),
                iconCls  : 'saveAsFile',
                disabled : true,
                handler  : function()
                {
                    new ui.component.PatchPrompt({
                        prefix : this.prefix,
                        ftype  : this.ftype,
                        fid    : this.fid,
                        fpath  : this.fpath,
                        fname  : this.fname,
                        lang   : this.lang,
                        defaultEmail : (phpDoc.userLogin !== 'cvsread')
                                       ? phpDoc.userLogin + '@php.net' : ''
                    }).show();
                }
            }, '-', {
                scope   : this,
                tooltip : _('<b>Re-indent</b> all this file'),
                iconCls : 'iconIndent',
                handler : function()
                {
                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).reIndentAll();
                }
            }, (this.lang === 'en')
                ? phpDoc.menuMarkupEN(id_prefix + '-FILE-' + this.fid)
                : phpDoc.menuMarkupLANG(id_prefix + '-FILE-' + this.fid, phpDoc)
            ];
        } else {
            this.tbar = [{}]; // empty tbar for readonly file
        }

        Ext.apply(this,
        {
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
                        if (this.isPatch) {
                            phpDoc.getFile(
                                this.fid, this.fpath, this.fname + '.' + this.fuid + '.patch',
                                id_prefix + '-PANEL-', id_prefix + '-FILE-'
                            );
                        } else {
                            phpDoc.getFile(
                                this.fid, this.lang + this.fpath, this.fname,
                                id_prefix + '-PANEL-', id_prefix + '-FILE-'
                            );
                        }
                    },
                    cmchange : function(keyCode, charCode, obj)
                    {
                        if ( keyCode === 116 ) return; // 116 = f5

                        var cursorPosition = Ext.util.JSON.decode(
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid)
                                .getCursorPosition()
                        );

                        Ext.get(id_prefix + '-status-line-' + this.fid).dom.innerHTML = cursorPosition.line;
                        Ext.get(id_prefix + '-status-col-' + this.fid).dom.innerHTML  = cursorPosition.caracter;

                        // 38 = arrow up; 40 = arrow down; 37 = arrow left; 39 = arrow right;
                        // 34 = pageDown; 33 = pageUp; 27 = esc; 17 = CRTL; 16 = ALT; 67 = CTRL+C
                        if (   keyCode !== 27
                            && keyCode !== 33
                            && keyCode !== 34
                            && keyCode !== 37
                            && keyCode !== 38
                            && keyCode !== 39
                            && keyCode !== 40
                            && keyCode !== 17
                            && keyCode !== 16
                            && keyCode !== 67
                        ) {
                            if (!Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified) {
                                // Add an [modified] in title
                                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                                    Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle +
                                    ' <span style="color:#ff0000; font-weight: bold;">[' + _('modified') + ']</span>'
                                );
                                // Add in tabpanel
                                Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                                    Ext.getCmp(this.prefix + '-' + this.fid).originTitle +
                                    ' <t style="color:#ff0000; font-weight: bold;">*</t>'
                                );

                                // Activate save button
                                Ext.getCmp(id_prefix + '-PANEL-btn-save-' + this.fid).enable();
                                Ext.get(id_prefix + '-PANEL-btn-save-' + this.fid).frame("3F8538");

                                if (this.isPatch) {
                                    Ext.getCmp(id_prefix + '-PANEL-btn-reject-' + this.fid).enable();
                                    Ext.get(id_prefix + '-PANEL-btn-reject-' + this.fid).frame("3F8538");
                                } else {
                                    Ext.getCmp(id_prefix + '-PANEL-btn-saveas-' + this.fid).enable();
                                    Ext.get(id_prefix + '-PANEL-btn-saveas-' + this.fid).frame("3F8538");
                                }

                                // Mark as modified
                                Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = true;
                            }
                        }
                    },
                    cmcursormove : function()
                    {
                        var cursorPosition = Ext.util.JSON.decode(
                            Ext.getCmp(id_prefix + '-FILE-' + this.fid).getCursorPosition()
                        );

                        Ext.get(id_prefix + '-status-line-' + this.fid).dom.innerHTML = cursorPosition.line;
                        Ext.get(id_prefix + '-status-col-' + this.fid).dom.innerHTML  = cursorPosition.caracter;
                    },
                    cmscroll : function(scrollY)
                    {
                        if (this.syncScroll && phpDoc.userConf[this.syncScrollConf] === 'true') {
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
