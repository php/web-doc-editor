Ext.namespace('ui','ui.component');

ui.component.MainMenu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component.MainMenu.superclass.constructor.call(this);
};

Ext.extend(ui.component.MainMenu, Ext.menu.Menu,
{
    id : 'mainMenu',
    init : function()
    {
        Ext.apply(this,
        {
            items: [{
                text     : _('Refresh all data'),
                disabled : (phpDoc.userLogin === 'anonymous') ? true : false,
                iconCls  : 'refresh',
                handler  : function()
                {
                    // We test if there is an update in progress or not
                    Ext.getBody().mask(
                        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                        _('Verify if there is an update in progress. Please, wait...')
                    );

                    XHR({
                        params  : { task : 'getLastUpdate' },
                        success : function(response)
                        {
                            // Remove wait msg
                            Ext.getBody().unmask();

                            var o = Ext.util.JSON.decode(response.responseText), tmp;

                            if( o.lastupdate === 'in_progress' ) {
                                Ext.MessageBox.show({
                                    title   : _('Status'),
                                    msg     : _('There is currently an update in progress.<br/>' +
                                                'You can\'t perform an update now.'),
                                    buttons : Ext.MessageBox.OK,
                                    icon    : Ext.MessageBox.INFO
                                });
                            } else {
                                tmp = new ui.component.SystemUpdatePrompt().show(Ext.get('acc-need-update'));
                            }
                        }
                    });
                }
            }, {
                text     : _('Check Build'),
                disabled : (phpDoc.userLogin === 'anonymous') ? true : false,
                iconCls  : 'checkBuild',
                handler  : function()
                {
                    // We test if there is a check in progress for this language
                    Ext.getBody().mask(
                        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                        _('Verify if there is a check in progress. Please, wait...')
                    );

                    XHR({
                        params  :
                        {
                            task     : 'checkLockFile',
                            lockFile : 'lock_check_build_' + phpDoc.userLang
                        },
                        success : function()
                        {
                            // Remove wait msg
                            Ext.getBody().unmask();

                            Ext.MessageBox.show({
                                title   : _('Status'),
                                msg     : _('There is currently a check in progress for this language.<br/>' +
                                            'You can\'t perform a new check now.'),
                                buttons : Ext.MessageBox.OK,
                                icon    : Ext.MessageBox.INFO
                            });
                        },
                        failure : function()
                        {
                            // Remove wait msg
                            Ext.getBody().unmask();

                            var tmp = new ui.component.CheckBuildPrompt().show(
                                Ext.get('acc-need-update')
                            );

                        }
                    });
                }
            }, {
                text    : _('EN tools'),
                handler : function() { return false; },
                menu : new Ext.menu.Menu({
                    items : [{
                        text    : _('Last failed build'),
                        iconCls : 'BuildStatus',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-build-status');

                            if (tab === undefined ) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-build-status',
                                    title    : _('Last failed build'),
                                    iconCls  : 'BuildStatus',
                                    layout   : 'fit',
                                    closable : true,
                                    html     : 'nothing'
                                });
                                tab = Ext.getCmp('tab-build-status');
                            }

                            if (tab.items) {
                                tab.removeAll(true);
                            }
                            tab.add(new ui.component.BuildStatus());
                            tab.doLayout(); // render the grid

                            Ext.getCmp('main-panel').setActiveTab('tab-build-status');
                        }
                    }, {
                        text    : _('Script Check doc'),
                        iconCls : 'CheckDoc',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-check-doc');

                            if (tab === undefined) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-check-doc',
                                    title    : 'Check Doc',
                                    iconCls  : 'CheckDoc',
                                    layout   : 'fit',
                                    closable : true,
                                    html     : 'nothing'
                                });
                                tab = Ext.getCmp('tab-check-doc');
                            }

                            if (tab.items) {
                                tab.removeAll(true);
                            }
                            tab.add(new ui.component.CheckDoc());
                            tab.doLayout(); // render the grid

                            Ext.getCmp('main-panel').setActiveTab('tab-check-doc');
                        }
                    }]
                })
            }, '-', {
                text    : _('Configure'),
                iconCls : 'iconConf',
                tooltip : '<b>Configure</b> this tool',
                id      : 'winconf-btn',
                handler : function()
                {
                    var tmp = new ui.component.EditorConf().show(Ext.get('winconf-btn'));
                }
            }, '-', {
                text     : _('Erase my personal data'),
                disabled : (phpDoc.userLogin === 'anonymous') ? true : false,
                iconCls  : 'iconErasePersonalData',
                handler  : function()
                {
                    Ext.MessageBox.confirm(_('Confirm'),
                        _('This action will erase your personal data. All content about this account will be deleted definitively. Are you sure you want to do that ?'),
                        function(btn)
                        {
                            if (btn === 'yes') {
                                Ext.getBody().mask(
                                    '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                                    _('Please, wait...')
                                );

                                XHR({
                                    params  : { task : 'erasePersonalData' },
                                    success : function(response)
                                    {
                                        Ext.getBody().unmask();

                                        Ext.MessageBox.show({
                                            title   : _('Thanks !'),
                                            msg     : _('Thank you for using this application !'),
                                            icon    : Ext.MessageBox.INFO,
                                            buttons : Ext.MessageBox.OK,
                                            fn      : function()
                                            {
                                                window.location.href = './do/logout';
                                            }
                                        });
                                    },
                                    failure : function(response)
                                    {
                                        phpDoc.winForbidden();
                                    }
                                });
                            } // btn yes
                        }
                    );
                }
            }, '-', {
                text    : _('Log out'),
                iconCls : 'iconLogOut',
                handler : function()
                {
                    Ext.MessageBox.confirm(_('Confirm'),
                        _('Are you sure you want to logout?'),
                        function(btn)
                        {
                            if (btn === 'yes') {
                                window.location.href = './do/logout';
                            }
                        }
                    );
                }
            }, '-', {
                id      : 'tab-report-bug-btn',
                text    : _('Report bugs'),
                iconCls : 'iconBugs',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('tab-report-bug')) {

                        Ext.getCmp('main-panel').add({
                            id         : 'tab-report-bug',
                            xtype      : 'panel',
                            title      : _('Report bugs'),
                            iconCls    : 'iconBugs',
                            closable   : true,
                            layout     : 'fit',
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-report-bug', url: 'http://bugs.php.net/' }) ]
                        });

                        Ext.getCmp('main-panel').setActiveTab('tab-report-bug');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('tab-report-bug');
                    }
                }
            }, {
                id      : 'tab-documentation-btn',
                text    : _('Documentation'),
                iconCls : 'iconBook',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('tab-documentation')) {

                        Ext.getCmp('main-panel').add({
                            id         : 'tab-documentation',
                            xtype      : 'panel',
                            title      : _('Documentation'),
                            iconCls    : 'iconBook',
                            closable   : true,
                            layout     : 'fit',
                            items: [ new Ext.ux.IFrameComponent({ id: 'frame-tab-documentation', url: 'http://wiki.php.net/doc/editor/' }) ]
                        });

                        Ext.getCmp('main-panel').setActiveTab('tab-documentation');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('tab-documentation');
                    }
                }
            }, '-', {
                id      : 'winabout-btn',
                text    : _('About'),
                iconCls : 'iconHelp',
                handler : function()
                {
                    var tmp = new ui.component.About().show(Ext.get('winabout-btn'));
                }
            }]
        });
    }
});
