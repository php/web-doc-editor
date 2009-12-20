var loginPage = function()
{
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'js/extjs/resources/images/default/s.gif';

    return {

        storeLang : '',

        init : function()
        {
            // Load all available language
            this.storeLang = new Ext.data.Store({
                autoLoad : true,
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

            this.drawForm();
        },

        drawForm : function()
        {
            var win;

            if (!win) {
                win = new Ext.Window({
                    layout      : 'border',
                    width       : 380,
                    height      : 250,
                    closable    : false,
                    closeAction : 'hide',
                    resizable   : false,
                    plain       : true,
                    title       : 'Control Access',
                    iconCls     : 'key',
                    plugins     : [
                        new Ext.ux.plugins.WindowDrawer({
                            html : 'If you want to request for a SVN account, please read this page :<div style="text-align: center; margin-top: 20px;"><a href="http://php.net/svn-php.php">http://php.net/svn-php.php</a></div>',
                            side : 's',
                            bodyStyle: 'margin: 10px;',
                            animate : true,
                            resizable : false,
                            height : 80
                        })
                    ],
                    listeners : {
                        render : function()
                        {
                            new Ext.util.DelayedTask(function() {
                                Ext.getCmp('login-form-vcsLogin').focus();
                            }).delay(200);
                        }
                    },
                    items : [{
                        xtype     : 'panel',
                        baseCls   : 'x-plain',
                        id        : 'login-logo',
                        region    : 'center',
                        bodyStyle : 'margin:4px 4px 4px 8px',
                        html      : '<img src="themes/img/logo.png" />'
                    }, {
                        xtype       : 'form',
                        region      : 'south',
                        id          : 'login-form',
                        url         : './do/login',
                        bodyStyle   : 'padding:5px 5px 0',
                        border      : false,
                        height      : 100,
                        width       : 350,
                        labelWidth  : 110,
                        defaults    : { width : 217 },
                        defaultType : 'textfield',
                        items : [{
                            fieldLabel : 'Vcs login',
                            name       : 'vcsLogin',
                            value      : 'anonymous',
                            id         : 'login-form-vcsLogin',
                            enableKeyEvents : true,
                            listeners : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-vcsPasswd').focus();
                                    }
                                }
                            }
                        }, {
                            fieldLabel : 'Vcs password',
                            name       : 'vcsPassword',
                            id         : 'login-form-vcsPasswd',
                            inputType  : 'password',
                            enableKeyEvents: true,
                            listeners : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-lang').focus();
                                    }
                                }
                            }
                        }, {
                            xtype      : 'combo',
                            width      : 235,
                            fieldLabel : 'Translate module',
                            store      : this.storeLang,
                            plugins       : new Ext.ux.plugins.IconCombo(),
                            valueField    : 'code',
                            listWidth     : 235,
                            maxHeight     : 150,
                            editable      : true,
                            id            : 'login-form-lang',
                            name          : 'langDisplay',
                            displayField  : 'name',
                            iconClsField  : 'iconCls',
                            triggerAction : 'all',
                            mode          : 'local'
                        }]
                    }],
                    buttonAlign: 'left',
                    buttons : [{
                        text    : 'Request an account',
                        iconCls : 'iconHelp',
                        tabIndex : -1,
                        handler : function() {
                            if( win.drawers.s.hidden ) {
                                win.drawers.s.show();
                            } else {
                                win.drawers.s.hide();
                            }
                        }
                    }, '->', {
                        text      : 'Login',
                        id        : 'login-btn',
                        disabled  : false,
                        listeners : {
                            click : function()
                            {
                                if (Ext.getCmp('login-form').getForm().isValid()) {

                                    Ext.getCmp('login-form').getForm().submit({
                                        method : 'POST',
                                        params : {
                                            lang : Ext.getCmp('login-form-lang').getValue()
                                        },
                                        waitTitle : 'Connecting',
                                        waitMsg   : 'Sending data...',
                                        success   : function(form, action)
                                        {
                                            window.location.href = './';
                                        },
                                        failure : function(form, action)
                                        {
                                            if (action.response) {
                                                var o = Ext.util.JSON.decode(action.response.responseText);

                                                if (o.msg == 'Bad vcs password' || o.msg == 'Bad db password') {
                                                    Ext.Msg.show({
                                                        title   : 'Error',
                                                        msg     : 'Bad password.<br>Please, try again.',
                                                        buttons : Ext.Msg.OK,
                                                        icon    : Ext.MessageBox.ERROR,
                                                        fn      : function()
                                                        {
                                                            Ext.getCmp('login-form-vcsPasswd').focus();
                                                        }
                                                    });
                                                }
                                                if (o.msg == 'unknow from vcs') {
                                                    Ext.Msg.show({
                                                        title   : 'Error',
                                                        msg     : 'This user is unknow from Php vcs server.<br>Please, try again.',
                                                        buttons : Ext.Msg.OK,
                                                        icon    : Ext.MessageBox.ERROR,
                                                        fn      : function()
                                                        {
                                                            Ext.getCmp('login-form-vcsPasswd').focus();
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    });

                                } // validate
                            }
                        }
                    }]
                });
            }

            win.show();

            // Remove the global loading message
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({ remove : true });
        }
    };
}();

Ext.EventManager.onDocumentReady(loginPage.init, loginPage, true);
