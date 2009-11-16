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
                    var tmp = new ui.component.CheckBuildPrompt().show(
                        Ext.get('acc-need-update')
                    );
                }
            }, {
                text    : _('EN tools'),
                handler : function() { return false; },
                menu : new Ext.menu.Menu({
                    items : [{
                        text    : _('Translation build status'),
                        iconCls : 'BuildStatus',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-build-status');

                            if (tab === undefined ) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-build-status',
                                    title    : _('Translation build status'),
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
