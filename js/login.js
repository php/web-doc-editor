var PhDOE_loginPage = function()
{
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'http://extjs.cachefly.net/ext-3.2.0/resources/images/default/s.gif';

    return {

        storeLang    : '',
        storeProject : '',
		
		email : Ext.util.Cookies.get("email"),

        init : function()
        {
            // Load all available language
            this.storeLang = new Ext.data.Store({
                proxy    : new Ext.data.HttpProxy({
                    url : './do/getAvailableLanguage'
                }),
                reader   : new Ext.data.JsonReader({
                    root          : 'Items',
                    totalProperty : 'nbItems',
                    idProperty    : 'code',
                    fields        : [
                        {name : 'code'},
                        {name : 'iconCls'},
                        {name : 'name'}
                    ]
                })
            });

            this.storeLang.load({
                scope    : this,
                callback : function() {
                    this.storeProject.load();
                }
            });

            // Load all available language
            this.storeProject = new Ext.data.Store({
                proxy    : new Ext.data.HttpProxy({
                    url : './do/getAvailableProject'
                }),
                reader : new Ext.data.JsonReader({
                    root          : 'Items',
                    totalProperty : 'nbItems',
                    idProperty    : 'code',
                    fields        : [
                        {name : 'code'},
                        {name : 'iconCls'},
                        {name : 'name'},
                        {name : 'request_account_uri'}
                    ]


                })
            });

            this.storeProject.on('load', function() {
                this.drawForm();
            }, this);

        },

        drawForm : function()
        {
            var win;

            if (!win) {
                win = new Ext.Window({
                    layout      : 'border',
                    width       : 380,
                    height      : 270,
                    closable    : false,
                    closeAction : 'hide',
                    resizable   : false,
                    plain       : true,
                    title       : 'Control Access',
                    iconCls     : 'iconKey',
                    plugins     : [
                        new Ext.ux.plugins.WindowDrawer({
                            html      : 'To request a VCS account please read :<div style="text-align: center; margin-top: 20px;"><span id="request-account"></span></div>',
                            side      : 's',
                            bodyStyle : 'margin: 10px;',
                            animate   : true,
                            resizable : false,
                            height    : 80
                        })
                    ],
                    listeners : {
                        render : function(c)
                        {
                            var t = new Ext.util.DelayedTask(function() {
								
                                Ext.getCmp('login-form-vcsLogin').focus();
                            });

                            t.delay(200);
                        }
                    },
                    items : [{
                        xtype     : 'panel',
                        baseCls   : 'x-plain',
                        id        : 'login-logo',
                        region    : 'center',
                        bodyStyle : 'margin:4px 4px 4px 8px',
                        html      : '<div id="app-logo"><img src="themes/img/php.png"></div><div id="app-title">PhD O.E.</div><div id="app-description">Php Docbook Online Editor</div>'
                    }, {
                        xtype       : 'form',
                        region      : 'south',
                        id          : 'login-form',
                        url         : './do/login',
                        bodyStyle   : 'padding:5px 5px 0',
                        border      : false,
                        height      : 140,
                        width       : 350,
                        labelWidth  : 110,
                        defaults    : { width : 217 },
                        defaultType : 'textfield',
                        items : [{
                            xtype         : 'iconcombo',
                            width         : 235,
                            fieldLabel    : 'Project',
                            store         : this.storeProject,
                            triggerAction : 'all',
                            allowBlank    : false,
                            valueField    : 'code',
                            displayField  : 'name',
                            iconClsField  : 'iconCls',
                            iconClsBase   : 'project',
                            mode          : 'local',
                            listWidth     : 235,
                            maxHeight     : 150,
                            editable      : true,
                            id            : 'login-form-project',
                            name          : 'projectDisplay',
                            listeners     : {
                                afterrender : function(c) {
                                    if( directAccess )
                                    {
                                        c.focus();
                                        c.onLoad();
                                        c.setValue(directAccess.project);
                                        c.collapse();
                                        c.disable();
                                    } else {
                                        c.setValue('php');

                                        var url = c.store.getById('php').data.request_account_uri;
                                        Ext.get("request-account").dom.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
                                    }                                   

                                },
                                select : function(c, record) {
                                    var url = record.data.request_account_uri;
                                    Ext.get("request-account").dom.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
                                }
                            }
                        }, {
                            fieldLabel      : 'VCS login',
                            name            : 'vcsLogin',
                            value           : ( Ext.util.Cookies.get("loginApp") ) ? Ext.util.Cookies.get("loginApp") : 'anonymous',
                            id              : 'login-form-vcsLogin',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-vcsPasswd').focus();
                                    }
                                }
                            }
                        }, {
                            fieldLabel      : 'VCS password',
                            name            : 'vcsPassword',
                            id              : 'login-form-vcsPasswd',
                            inputType       : 'password',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-email').focus();
                                    }
                                }
                            }
                        }, {
                            fieldLabel      : 'Email',
                            name            : 'email',
                            id              : 'login-form-email',
							vtype           : 'email',
							value           : this.email,
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-lang').focus();
                                    }
                                }
                            }
                        }, {
                            xtype           : 'iconcombo',
                            width           : 235,
                            fieldLabel      : 'Language module',
                            store           : this.storeLang,
                            triggerAction   : 'all',
                            allowBlank      : false,
                            valueField      : 'code',
                            displayField    : 'name',
                            iconClsField    : 'iconCls',
                            iconClsBase     : 'flags',
                            mode            : 'local',
                            value           : 'en',
                            listWidth       : 235,
                            maxHeight       : 150,
                            editable        : true,
                            id              : 'login-form-lang',
                            name            : 'langDisplay',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-btn').fireEvent('click');
                                    }
                                },
                                afterrender : function(c) {
                                    if( directAccess )
                                    {
                                        c.focus();
                                        c.onLoad();
                                        c.setValue(directAccess.lang);
                                        c.collapse();
                                        c.disable();
                                    }
                                }
                            }
                        }]
                    }],
                    buttonAlign : 'left',
                    buttons     : [{
                        text     : 'Request an account',
                        iconCls  : 'iconHelp',
                        tabIndex : -1,
                        handler  : function() {
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
                                            lang    : Ext.getCmp('login-form-lang').getValue(),
                                            project : Ext.getCmp('login-form-project').getValue()
                                        },
                                        waitTitle : 'Connecting',
                                        waitMsg   : 'Sending data...',
                                        success   : function()
                                        {
                                            window.location.reload();
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

Ext.EventManager.onDocumentReady(PhDOE_loginPage.init, PhDOE_loginPage, true);