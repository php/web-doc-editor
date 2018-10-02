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

        externalCredentials : function(service, name, id, email) {

            this.authService = service;
            this.authServiceID = id;

            // Name is always given
            Ext.getCmp('login-form-vcsLogin').setValue(name);
            Ext.getCmp('login-form-vcsLogin').disable();
            Ext.getCmp('login-form-vcsPasswd').disable();
            Ext.getCmp('login-form-auth').setText('<img src="themes/img/auth_'+service+'.png" style="vertical-align: middle" /> <b>' + service.ucFirst() +'</b>', false);

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
                    width       : 440,
                    height      : 300,
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
                        },
                        afterrender: function(w) {

                            if( auth && auth.service ) {

                                PhDOE_loginPage.externalCredentials(auth.service, auth.login, auth.serviceID, auth.email);

                            }

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
                            width     : 210,
                            height    : 200,
                            bodyStyle : 'margin: 10px;',
                            html      : '<div id="auth-login">'+
                                        '<a href="?oauth=facebook" title="Facebook">'+
                                            '<img id="auth-img-fb" src="themes/img/auth_facebook_40.png" class="" />'+
                                        '</a> '+
                                        '<a href="?oauth=github" title="Github">'+
                                            '<img id="auth-img-github" src="themes/img/auth_github_40.png" class="" />'+
                                        '</a>'+
                                        '<a href="?oauth=google" title="Google">'+
                                            '<img id="auth-img-google" src="themes/img/auth_google_40.png" />'+
                                        '</a> '+
                                        '<br/>'+
                                        '<a href="?oauth=linkedin" title="Linkedin">'+
                                            '<img id="auth-img-linkedin" src="themes/img/auth_linkedin_40.png" />'+
                                        '</a>'+
                                        '<a href="?oauth=stackoverflow" title="Stackoverflow">'+
                                            '<img id="auth-img-stackoverflow" src="themes/img/auth_stackoverflow_40.png" />'+
                                        '</a>'+
                                        '<a href="?oauth=instagram" title="Instagram">'+
                                            '<img id="auth-img-instagram" src="themes/img/auth_instagram_40.png" />'+
                                        '</a>'+
                                        '<br/>'+
                                        '<a href="?oauth=twitter" title="Twitter">'+
                                            '<img id="auth-img-twitter" src="themes/img/auth_twitter_40.png" />'+
                                        '</a>'+
                                        '</div>',
                            listeners: {
                                    afterrender: function() {

                                        if( auth.service ) {

                                            switch(auth.service) {
                                                case "facebook" :
                                                    Ext.get('auth-img-fb').addClass('oauth-enable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "github" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-enable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "google" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-enable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "linkedin" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-enable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "stackoverflow" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-enable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "instagram" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-enable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-disable');
                                                    break;
                                                case "twitter" :
                                                    Ext.get('auth-img-fb').addClass('oauth-disable');
                                                    Ext.get('auth-img-github').addClass('oauth-disable');
                                                    Ext.get('auth-img-google').addClass('oauth-disable');
                                                    Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                                    Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                                    Ext.get('auth-img-instagram').addClass('oauth-disable');
                                                    Ext.get('auth-img-twitter').addClass('oauth-enable');
                                                    break;
                                            }

                                        } else {
                                            Ext.get('auth-img-fb').addClass('oauth-disable');
                                            Ext.get('auth-img-github').addClass('oauth-disable');
                                            Ext.get('auth-img-google').addClass('oauth-disable');
                                            Ext.get('auth-img-linkedin').addClass('oauth-disable');
                                            Ext.get('auth-img-stackoverflow').addClass('oauth-disable');
                                            Ext.get('auth-img-instagram').addClass('oauth-disable');
                                            Ext.get('auth-img-twitter').addClass('oauth-disable');
                                        }
                                    }
                            }
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
                            value           : ( loginApp ) ? loginApp : 'anonymous',
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
                        text      :  ( loginApp && loginApp != 'anonymous' ) ? 'Login' : 'Anonymous login',
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
                            Ext.getCmp('login-form-auth').setText('<img src="themes/img/auth_php.png" style="vertical-align: middle" /> <b>Php.net</b>', false);

                            this.authService = 'VCS';
                            this.authServiceID = '';

                            if( loginApp ) {
                                Ext.getCmp('login-form-vcsLogin').setValue(loginApp);
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
