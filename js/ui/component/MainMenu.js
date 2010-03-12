Ext.namespace('ui','ui.component','ui.component._MainMenu');

ui.component.MainMenu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component.MainMenu.superclass.constructor.call(this);
};


// Load all available language
ui.component._MainMenu.store = new Ext.data.Store({
    proxy    : new Ext.data.HttpProxy({
        url : './do/getAvailableLanguage'
    }),
    reader   : new Ext.data.JsonReader(
        {
            root          : 'Items',
            totalProperty : 'nbItems',
            id            : 'code'
        }, Ext.data.Record.create([
            {
                name    : 'code',
                mapping : 'code'
            }, {
                name    : 'iconCls',
                mapping : 'iconCls'
            }, {
                name    : 'name',
                mapping : 'name'
            }
        ])
    )
});

ui.component._MainMenu.store.on('load', function(store)
{
    // We put the lang libel into Info-Language
    Ext.getDom('Info-Language').innerHTML = store.getById(PhDOE.userLang).data.name;

    store.each(function(record) {

        new Ext.menu.Item({
            text    : record.data.name,
            iconCls : 'mainMenuLang flags ' + record.data.iconCls,
            disabled: (record.data.code === PhDOE.userLang),
            handler : function() {
                
                XHR({
                    params  : { task : 'switchLang', lang: record.data.code },
                    success : function()
                    {
                        window.location.reload();
                    }
                });
            }
        });

        Ext.getCmp('MenuLang-ct').add(tmp);
    });

}, this);

Ext.extend(ui.component.MainMenu, Ext.menu.Menu,
{
    id : 'mainMenu',
    init : function()
    {
        var MenuLang = new Ext.menu.Menu({id: 'MenuLang-ct'});

        Ext.apply(this,
        {
            items: [{
                text     : _('Refresh all data'),
                disabled : (PhDOE.userLogin === 'anonymous') ? true : false,
                iconCls  : 'iconRefresh',
                handler  : function()
                {
                    // We test if there is an update in progress or not
                    Ext.getBody().mask(
                        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                        _('Verify if there is an update in progress. Please, wait...')
                    );

                    XHR({
                        params  : {
                            task : 'getLastUpdate',
                            type : 'data'
                        },
                        success : function(response)
                        {
                            // Remove wait msg
                            Ext.getBody().unmask();

                            var o = Ext.util.JSON.decode(response.responseText);

                            if( o.lastupdate === 'in_progress' ) {
                                Ext.MessageBox.show({
                                    title   : _('Status'),
                                    msg     : _('There is currently an update in progress.<br/>' +
                                                'You can\'t perform an update now.'),
                                    buttons : Ext.MessageBox.OK,
                                    icon    : Ext.MessageBox.INFO
                                });
                            } else {
                                new ui.component.SystemUpdatePrompt().show(Ext.get('acc-need-update'));
                            }
                        }
                    });
                }
            }, {
                text    : _('Build tools'),
                handler : function() { return false; },
                menu : new Ext.menu.Menu({
                    items : [{
                        text     : _('Check Build'),
                        disabled : (PhDOE.userLogin === 'anonymous'),
                        iconCls  : 'iconCheckBuild',
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
                                    lockFile : 'project_' + PhDOE.project + '_lock_check_build_' + PhDOE.userLang
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

                                    new ui.component.CheckBuildPrompt().show(
                                        Ext.get('acc-need-update')
                                    );
                                }
                            });
                        }
                    }, {
                        text    : _('Last failed build'),
                        iconCls : 'iconBuildStatus',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-build-status');

                            if (! tab ) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-build-status',
                                    title    : _('Last failed build'),
                                    iconCls  : 'iconBuildStatus',
                                    layout   : 'fit',
                                    closable : true,
                                    items    : [ new ui.component.BuildStatus() ]
                                });
                            }

                            Ext.getCmp('main-panel').setActiveTab('tab-build-status');
                        }
                    }]
                })
            }, {
                text    : _('EN tools'),
                handler : function() { return false; },
                menu : new Ext.menu.Menu({
                    items : [{
                        text    : _('Script Check Entities'),
                        iconCls : 'iconCheckEntities',
                        handler : function() { return false; },
                        menu    : new Ext.menu.Menu({
                            items   : [{
                                text    : _('View the last result'),
                                id      : 'btn-check-entities-view-last-result',
                                iconCls : 'iconTabView',
                                handler : function()
                                {
                                    var tab = Ext.getCmp('tab-check-entities');

                                    if ( ! tab ) {
                                        // if tab not exist, create new tab
                                        Ext.getCmp('main-panel').add({
                                            id       : 'tab-check-entities',
                                            title    : _('Check Entities'),
                                            iconCls  : 'iconCheckEntities',
                                            layout   : 'fit',
                                            closable : true,
                                            items    : [new ui.component.CheckEntities()]
                                        });
                                    }
                                    Ext.getCmp('main-panel').setActiveTab('tab-check-entities');
                                }
                            }, {
                                text    : _('Run this script'),
                                iconCls : 'iconRun',
                                disabled: (PhDOE.userLogin === 'anonymous'),
                                handler : function()
                                {
                                    // We test if there is a check in progress for this language
                                    Ext.getBody().mask(
                                        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                                        _('Verify if there is an entities check in progress. Please, wait...')
                                    );

                                    XHR({
                                        params  :
                                        {
                                            task     : 'checkLockFile',
                                            lockFile : 'project_' + PhDOE.project + '_lock_check_entities'
                                        },
                                        success : function()
                                        {
                                            // Remove wait msg
                                            Ext.getBody().unmask();

                                            Ext.MessageBox.show({
                                                title   : _('Status'),
                                                msg     : _('There is currently a check in progress for the entities.<br/>You can\'t perform a new check now.'),
                                                buttons : Ext.MessageBox.OK,
                                                icon    : Ext.MessageBox.INFO
                                            });
                                        },
                                        failure : function()
                                        {
                                            // Remove wait msg
                                            Ext.getBody().unmask();

                                            if( ! Ext.getCmp('win-check-entities') ) {
                                                new ui.component.CheckEntitiesPrompt();
                                            }
                                            Ext.getCmp('win-check-entities').show(Ext.get('mainMenu'));

                                        }
                                    });
                                }
                            }]
                        })
                    }, {
                        text    : _('Script Check doc'),
                        iconCls : 'iconCheckDoc',
                        handler : function()
                        {
                            var tab = Ext.getCmp('tab-check-doc');

                            if ( ! tab ) {
                                // if tab not exist, create new tab
                                Ext.getCmp('main-panel').add({
                                    id       : 'tab-check-doc',
                                    title    : 'Check Doc',
                                    iconCls  : 'iconCheckDoc',
                                    layout   : 'fit',
                                    closable : true,
                                    items    : [ new ui.component.CheckDoc() ]
                                });
                            }
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
                    if( ! Ext.getCmp('win-conf') ) {
                        new ui.component.EditorConf();
                    }
                    Ext.getCmp('win-conf').show(Ext.get('mainMenu'));

                }
            }, '-', {
                id      : 'menuLang',
                iconCls : 'iconSwitchLang',
                text    : _('Switch to language...'),
                handler : function() { return false; },
                menu    : MenuLang
            }, {
                text     : _('Erase my personal data'),
                disabled : (PhDOE.userLogin === 'anonymous') ? true : false,
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
                                        PhDOE.winForbidden();
                                    }
                                });
                            } // btn yes
                        }
                    );
                }
            }, {
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
                    new ui.component.About().show(Ext.get('winabout-btn'));
                }
            }]
        });
    }
});
