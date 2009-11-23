var phpDoc = function()
{
    Ext.QuickTips.init();

    return {
        // Variable
        userLogin  : null,
        userLang   : null,
        appName    : 'PhpDocumentation Online Editor',
        appVer     : '0.2',
        uiRevision : '$Revision$',

        userConf : {
            'conf_needupdate_diff'       : 'using-exec',
            'conf_needupdate_scrollbars' : true,
            'conf_needupdate_displaylog' : false,

            'conf_error_skipnbliteraltag' : true,
            'conf_error_scrollbars'       : true,
            'conf_error_displaylog'       : false,

            'conf_reviewed_scrollbars' : true,
            'conf_reviewed_displaylog' : false,

            'conf_allfiles_displaylog' : false,

            'conf_patch_scrollbars' : true,
            'conf_patch_displaylog' : false,

            'conf_theme' : 'themes/empty.css'
        },

        filePendingOpen : '',

        init : function()
        {
            // Stop default contextmenu on all this app
            Ext.getBody().on('contextmenu', function(e) {
                e.stopEvent();
            }, this);

            // We load the configuration for this user
            new ui.task.LoadConfigTask();
        },

        winForbidden : function(type)
        {

            var title = _('Forbidden'),
                mess  = _('You can\'t do this action as anonymous user.');

            switch (type) {
                case 'fs_error' :
                    title = _('Error');
                    mess  = _('File system error. Check read/write permission under data folder.');
                    break;
            }

            Ext.MessageBox.alert(
                title,
                mess
            );
        },

        // Need confirm if we want to close a tab and the content have been modified.
        removeTabEvent : function(tabpanel, tab)
        {
            var stateLang, stateEn, state, PanType = tab.id.split('-');

            if ((PanType[0] === 'FE' || PanType[0] === 'FNU' || PanType[0] === 'FNR' || PanType[0] === 'PP' || PanType[0] === 'AF' || PanType[0] === 'FNT') && PanType[1] !== 'help') {

                if (PanType[0] === 'FE') {
                    stateLang = Ext.getCmp('FE-LANG-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNU') {
                    stateLang = Ext.getCmp('FNU-LANG-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNR') {
                    stateLang = Ext.getCmp('FNR-LANG-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'FE') {
                    stateEn = Ext.getCmp('FE-EN-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNU') {
                    stateEn = Ext.getCmp('FNU-EN-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNR') {
                    stateEn = Ext.getCmp('FNR-EN-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'PP') {
                    state = Ext.getCmp('PP-PATCH-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'AF') {
                    state = Ext.getCmp('AF-ALL-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'FNT') {
                    state = Ext.getCmp('FNT-TRANS-FILE-' + PanType[1]).isModified;
                }

                if (stateEn || stateLang || state) {
                    Ext.Msg.show({
                        scope   : this,
                        title   : _('Confirm'),
                        msg     : _('This file has been modified without being saved.<br/>' +
                                    'Do you really want to close?'),
                        buttons : Ext.Msg.YESNO,
                        icon    : Ext.Msg.QUESTION,
                        fn : function(btn, text)
                        {
                            if (btn === 'yes') {
                                tabpanel.un('beforeremove', this.removeTabEvent, this);
                                tabpanel.remove(tab);
                                tabpanel.addListener('beforeremove', this.removeTabEvent, this);
                            }
                        }
                    });
                    return false;
                } else {
                    return true;
                }
            } else {
                return true;
            }
        },

        drawInterface: function()
        {
            // We keel alive our session by sending a ping every minute
            ui.task.PingTask.getInstance().delay(30000); // start after 1 minute.

            var mainMenu    = new ui.component.MainMenu(),
                mainContent = (this.userLang === 'en') ? [
                    ui.component.LocalMailGrid.getInstance()
                ] : [
                    ui.component.SummaryGrid.getInstance(),
                    ui.component.TranslatorGrid.getInstance(),
                    ui.component.LocalMailGrid.getInstance(),
                    ui.component.BugsGrid.getInstance(),
                    ui.component.TranslationGraph.getInstance()
                ];
            new Ext.Viewport({
                layout : 'border',
                items : [{
                    // logo
                    region     : 'north',
                    html       : '<h1 class="x-panel-header">' +
                                    '<img src="themes/img/mini_php.png" ' +
                                        'style="vertical-align: middle;" />&nbsp;&nbsp;' +
                                    this.appName +
                                 '</h1>',
                    autoHeight : true,
                    border     : false,
                    margins    : '0 0 5 0'
                }, {
                    // accordion
                    region       : 'west',
                    collapsible  : true,
                    collapseMode : 'mini',
                    animate      : true,
                    split        : true,
                    layout       : 'fit',
                    width        : 300,
                    autoScroll   : true,
                    items : [{
                        layout     : 'accordion',
                        animate    : true,
                        bodyBorder : false,
                        border     : false,
                        tbar : [{
                            text    : _('Main Menu'),
                            iconCls : 'MainMenu',
                            menu    : mainMenu
                        }],
                        items : [{
                            id        : 'acc-need-translate',
                            title     : _('Files Need Translate') + ' - <em id="acc-need-translate-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesNeedTranslate',
                            hidden    : (this.userLang === 'en'),
                            items     : [ ui.component.PendingTranslateGrid.getInstance() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FNT-filter').wrap.setWidth(200);
                                }
                            }
                        },{
                            id        : 'acc-need-update',
                            title     : _('Files Need Update') + ' - <em id="acc-need-update-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesNeedUpdate',
                            hidden    : (this.userLang === 'en'),
                            items     : [ ui.component.StaleFileGrid.getInstance() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FNU-filter').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-error',
                            title     : _('Error in current translation') + ' - <em id="acc-error-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesError',
                            hidden    : (this.userLang === 'en'),
                            items     : [ ui.component.ErrorFileGrid.getInstance() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FE-filter').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-need-reviewed',
                            title     : _('Files Need Reviewed') + ' - <em id="acc-need-reviewed-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesNeedReviewed',
                            hidden    : (this.userLang === 'en'),
                            items     : [ ui.component.PendingReviewGrid.getInstance() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FNR-filter').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-notInEn',
                            title     : _('Not in EN tree') + ' - <em id="acc-notInEn-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'NotInEn',
                            hidden    : (this.userLang === 'en'),
                            items     : [ ui.component.NotInENGrid.getInstance() ],
                            collapsed : true
                        }, {
                            id        : 'acc-all-files',
                            title     : _('All files'),
                            layout    : 'fit',
                            iconCls   : 'AllFiles',
                            items     : [ ui.component.RepositoryTree.getInstance() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('AF-search').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-need-pendingCommit',
                            title     : _('Pending for commit') + ' - <em id="acc-pendingCommit-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'PendingCommit',
                            items     : [ ui.component.PendingCommitGrid.getInstance() ],
                            collapsed : true
                        }, {
                            id        : 'acc-need-pendingPatch',
                            title     : _('Pending Patch') + ' - <em id="acc-pendingPatch-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'PendingPatch',
                            items     : [ ui.component.PendingPatchGrid.getInstance() ],
                            collapsed : true
                        }]
                    }]
                }, {
                    // main panel
                    xtype             : 'tabpanel',
                    id                : 'main-panel',
                    region            : 'center',
                    activeTab         : 0,
                    enableTabScroll   : true,
                    layoutOnTabChange : true,
                    plugins           : new Ext.ux.TabCloseMenu(),
                    listeners : {
                        scope : this,
                        beforeremove : this.removeTabEvent
                    },
                    items : [{
                        xtype      : 'panel',
                        id         : 'MainInfoTabPanel',
                        title      : _('Home'),
                        baseCls    : 'MainInfoTabPanel',
                        autoScroll : true,
                        plain      : true,
                        items : [{
                            xtype  : 'panel',
                            border : false,
                            html   : '<div class="res-block">' +
                                        '<div class="res-block-inner">' +
                                            '<h3>' +
                                                ((this.userLogin != "anonymous") ? String.format(_('Connected as <em>{0}</em>'), this.userLogin) : String.format(_('Connected as <em>{0}</em>'), _('anonymous'))) +
                                                '<br/><br/>' +
                                                String.format(_('Last data update: <em id="lastUpdateTime">{0}</em>'), '-') +
                                            '</h3>' +
                                        '</div>' +
                                     '</div>'
                        }, {
                            xtype      : 'tabpanel',
                            activeTab  : 0,
                            plain      : true,
                            autoScroll : true,
                            height     : 400,
                            border     : false,
                            items      : mainContent,
                            defaults   : { border: true },
                            layoutOnTabChange : true
                        }]
                    }]
                }]
            });

            // Remove the global loading message
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({ remove : true });

            // Direct access to a file as anonymous user
            if (directAccess) {
                ui.component.RepositoryTree.getInstance().openFile(
                    directAccess.lang + directAccess.path,
                    directAccess.name
                );
            }
        } // drawInterface
    }; // Return
}();
Ext.EventManager.onDocumentReady(phpDoc.init, phpDoc, true);
