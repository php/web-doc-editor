var PhDOE_loginPage = function()
{
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'js/ExtJs/resources/images/default/s.gif';

    return {

        storeLang    : '',
        storeProject : '',
        email : Ext.util.Cookies.get("email"),
        authService: 'VCS',
        authServiceID: '',

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

        externalCredentials : function(service, name, id, email) {
        
            this.authService = service;
            this.authServiceID = id;
            
            // Name is always given
            Ext.getCmp('login-form-vcsLogin').setValue(name);
            Ext.getCmp('login-form-vcsLogin').disable();
            Ext.getCmp('login-form-vcsPasswd').disable();
            
            if( email ) {
                Ext.getCmp('login-form-email').setValue(email);
            }
            
            Ext.getCmp('login-btn').setText('Anonymous login');
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
                    listeners: {
                        show: function(w) {
                            win.drawers.e.show();
                            win.drawers.e.setHeight(240);
                        }
                    },
                    plugins     : [
                        new Ext.ux.plugins.WindowDrawer({
                            html      : 'To request a VCS account please read :<div style="text-align: center; margin-top: 20px;"><span id="request-account"></span></div>',
                            side      : 's',
                            bodyStyle : 'margin: 10px;',
                            animate   : true,
                            resizable : false,
                            height    : 80
                        }),
                        new Ext.ux.plugins.WindowDrawer({
                            title:'&nbsp;&nbsp;Sign in with...',
                            side      : 'e',
                            animate   : true,
                            resizable : false,
                            width     : 270,
                            height    : 250,
                            items: [{
                                xtype:'panel',
                                layout:'accordion',
                                border: false,
                                autoHeight: true,
                                defaults: {
                                    bodyStyle: 'padding:15px;'
                                },
                                layoutConfig: {
                                    animate: true,
                                    border: false,
                                    height: 100
                                },
                                items: [{
                                    title: 'Facebook',
                                    id:'accordion-fb',
                                    layout:'fit',
                                    iconCls:'iconFacebook',
                                    html: '<div id="facebook-box"></div><div id="facebook-box2"></div>',
                                    listeners: {
                                        resize: function(c) {
                                            c.setHeight(100);
                                        },
                                        afterrender: function(c)
                                        {
                                            document.getElementById('facebook-box').innerHTML = FBInfo.libel;
                                            // Is there already a connection ?
                                            if( FBInfo.user )
                                            {
                                                document.getElementById('facebook-box2').innerHTML = '<a href="#" onclick="PhDOE_loginPage.externalCredentials(\'facebook\', \''+FBInfo.user.name+'\', \''+FBInfo.user.id+'\',  \''+FBInfo.user.email+'\')">Use this credentials</a>';
                                            }
                                            

                                        }
                                    }
                                },{
                                    scope: this,
                                    title: 'Google',
                                    iconCls:'iconGoogle',
                                    id:'accordion-google',
                                    html: '<div id="google-box"></div><div id="google-box2"></div>',
                                    listeners: {
                                        resize: function(c)
                                        {
                                            c.setHeight(100);
                                        },
                                        afterrender: function(cmp)
                                        {
                                            document.getElementById('google-box').innerHTML = googleInfo.libel;
                                            // Is there already a connection ?
                                            if( googleInfo.user )
                                            {
                                                //this.scope.externalCredentials('google', googleInfo.user.name, googleInfo.user.id, googleInfo.user.email);
                                                document.getElementById('google-box2').innerHTML = '<a href="#" onclick="PhDOE_loginPage.externalCredentials(\'google\', \''+googleInfo.user.name+'\', \''+googleInfo.user.id+'\',  \''+googleInfo.user.email+'\')">Use this credentials</a>';
                                            }
                                        }
                                    }
                                }
                                ]
                            }]
                        })
                    ],
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
                                        
                                        // Get the URI for svn account request
                                        var url = c.store.getById(directAccess.project.toLowerCase()).data.request_account_uri;
                                        Ext.get("request-account").dom.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
                                        
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
                                },
                                keyup: function(f,e)
                                {
                                    var v = this.getValue(),
                                        currentLoginText = Ext.getCmp('login-btn').getText();

                                    if( v == 'anonymous' || v == '' ) {
                                        if( currentLoginText != 'Anonymous login' ) {
                                            Ext.getCmp('login-btn').setText('Anonymous login');
                                        }
                                    } else {
                                        if( currentLoginText == 'Anonymous login' ) {
                                            Ext.getCmp('login-btn').setText('Login');
                                        }
                                    }

                                },
                                focus : function(f)
                                {
                                    var v = this.getValue();
                                    if( v == 'anonymous' )
                                    {
                                        this.setValue('');
                                        Ext.getCmp('login-btn').setText('Login');
                                    }

                                },
                                blur : function(f)
                                {
                                    var v = this.getValue();
                                    if( v == 'anonymous' || v == '' )
                                    {
                                        this.setValue('');
                                        Ext.getCmp('login-btn').setText('Anonymous login');
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
                            value           : ( Ext.util.Cookies.get("lang") ) ? Ext.util.Cookies.get("lang") : 'en',
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
                        text      :  ( Ext.util.Cookies.get("loginApp") && Ext.util.Cookies.get("loginApp") != 'anonymous' ) ? 'Login' : 'Anonymous login',
                        id        : 'login-btn',
                        disabled  : false,
                        listeners : {
                            click : function()
                            {
                                if (Ext.getCmp('login-form').getForm().isValid()) {

                                    Ext.getCmp('login-form').getForm().submit({
                                        method : 'POST',
                                        params : {
                                            vcsLogin: Ext.getCmp('login-form-vcsLogin').getValue(),
                                            vcsPassword: Ext.getCmp('login-form-vcsPasswd').getValue(),
                                            lang    : Ext.getCmp('login-form-lang').getValue(),
                                            project : Ext.getCmp('login-form-project').getValue(),
                                            authService: PhDOE_loginPage.authService,
                                            authServiceID: PhDOE_loginPage.authServiceID
                                            
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

                                                Ext.Msg.show({
                                                    title   : 'Error',
                                                    msg     : o.msg,
                                                    buttons : Ext.Msg.OK,
                                                    icon    : Ext.MessageBox.ERROR,
                                                    fn      : function()
                                                    {
                                                        Ext.getCmp('login-form-vcsPasswd').focus();
                                                    }
                                                });
                                            }
                                        }
                                    });

                                } // validate
                            }
                        }
                    },{
                        scope: this,
                        text: 'Reset',
                        handler: function() {
                        
                            Ext.getCmp('login-form-vcsLogin').enable();
                            
                            Ext.getCmp('login-form-vcsPasswd').enable();
                            Ext.getCmp('login-form-vcsPasswd').setValue('');
                            
                            this.authService = 'VCS';
                            this.authServiceID = '';
                            
                            if( Ext.util.Cookies.get("loginApp") ) {
                                Ext.getCmp('login-form-vcsLogin').setValue(Ext.util.Cookies.get("loginApp"));
                                Ext.getCmp('login-btn').setText('Login');
                                Ext.getCmp('login-form-email').setValue(Ext.util.Cookies.get("email"));
                                
                                
                            } else {
                                Ext.getCmp('login-form-vcsLogin').setValue('anonymous');
                                Ext.getCmp('login-btn').setText('Anonymous login');
                                Ext.getCmp('login-form-email').setValue('');
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
