Ext.namespace('ui','ui.component');

ui.component.MainMenu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component.MainMenu.superclass.constructor.call(this);
}

Ext.extend(ui.component.MainMenu, Ext.menu.Menu,
{
    id : 'mainMenu',
    init : function()
    {
        Ext.apply(this,
        {
            items: [{
                text     : _('Refresh all data'),
                disabled : (phpDoc.userLogin === 'cvsread') ? true : false,
                iconCls  : 'refresh',
                handler  : phpDoc.WinUpdate
            }, {
                text     : _('Check Build'),
                disabled : (phpDoc.userLogin === 'cvsread') ? true : false,
                iconCls  : 'checkBuild',
                handler  : phpDoc.WinCheckBuild
            }, {
                text    : _('EN tools'),
                handler : function() { return false },
                menu : new Ext.menu.Menu({
                    items : [{
                        text    : _('Translation build status'),
                        iconCls : 'BuildStatus',
                        handler : phpDoc.newTabBuildStatus
                    }, {
                        text    : _('Script Check doc'),
                        iconCls : 'CheckDoc',
                        handler : phpDoc.newTabCheckDoc
                    }]
                })
            }, '-', {
                text    : _('Configure'),
                iconCls : 'iconConf',
                tooltip : '<b>Configure</b> this tool',
                id      : 'winconf-btn',
                handler : phpDoc.WinConf
            }, '-', {
                text     : _('Erase my personal data'),
                disabled : (phpDoc.userLogin === 'cvsread') ? true : false,
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
                                    url     : './php/controller.php',
                                    params  : { task : 'erasePersonalData' },
                                    success : function(response)
                                    {
                                        Ext.getBody().unmask();

                                        var o = Ext.util.JSON.decode(response.responseText);

                                        Ext.MessageBox.show({
                                            title   : _('Thanks !'),
                                            msg     : _('Thank you for using this application !'),
                                            icon    : Ext.MessageBox.INFO,
                                            buttons : Ext.MessageBox.OK,
                                            fn      : function()
                                            {
                                                window.location.href = './php/controller.php?task=logout';
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
                                window.location.href = './php/controller.php?task=logout';
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
                    phpDoc.WinAbout();
                }
            }]
        });
    }
});
