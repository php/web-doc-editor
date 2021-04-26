var PhDOE_loginPage = function()
{
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'js/ExtJs/resources/images/default/s.gif';

    return {

        storeLang    : '',
        storeProject : '',
        storeFlickr : '',
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

            // Load Flickr elephpants
            this.storeFlickr = new Ext.data.Store({
                autoLoad: false,
                proxy    : new Ext.data.HttpProxy({
                    url : './do/getElephpants'
                }),
                reader : new Ext.data.JsonReader({
                    root          : 'Items',
                    fields        : [
                        {name : 'img'},
                        {name : 'link'}
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
                    width       : 440,
                    height      : 300,
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
                        }),
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
                        height      : 170,
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
                            fieldLabel      : 'Login',
                            name            : 'vcsLogin',
                            value           : ( loginApp ) ? loginApp : '',
                            id              : 'login-form-vcsLogin',
                            enableKeyEvents : true,
                            listeners       : {
                                keypress : function(field, e)
                                {
                                    if (e.getKey() == e.ENTER) {
                                        Ext.getCmp('login-form-vcsPasswd').focus();
                                    }
                                },
                            }
                        }, {
                            fieldLabel      : 'Password',
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
                        },{
                            xtype           : 'label',
                            fieldLabel      : 'Auth. Service',
                            id              : 'login-form-auth',
                            name            : 'authService',
                            html            : '<img src="themes/img/auth_php.png" style="vertical-align: middle" /> <b>Php.net</b>'
                        },{
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
                                    if( directAccess.lang )
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
                        text     : 'Help',
                        iconCls  : 'iconHelp2',
                        tabIndex : -1,
                        tooltip  :'A little reference to this application',
                        handler  : function() {
                            window.open("https://wiki.php.net/doc/editor", "_blank");
                        }
                    },{
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
                        text      :  'Login',
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
                    }]
                });
            }

            win.show();

            //

            // Remove the global loading message
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({ remove : true });

            // We load flickR
            this.storeFlickr.load({

                callback: function() {

                    // We put the elephpants !
                    Ext.each(this.data.items, function(item) {

                        Ext.DomHelper.append('elephpants-images', {
                            tag: 'a',
                            href: item.data.link,
                            html: '<img src="'+ item.data.img +'" />',
                            target: '_blank'
                        });
                    });
                }
            });
        }
    };
}();

Ext.EventManager.onDocumentReady(PhDOE_loginPage.init, PhDOE_loginPage, true);
