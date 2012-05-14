Ext.define('phpdoe.controller.login', {
    extend: 'Ext.app.Controller',
    requires  : 'Ext.util.Cookies',
    init: function() {
        this.control({
            '#login-button': {
                click: this.doLogin
            },
            '#login-form-auth-service': {
                change: this.changeAuthService
            }
        });

        this.loadStores();
    },

    loadStoresCount: 0,
    onLoadStore: function() {
        this.loadStoresCount++;
        if (this.loadStoresCount == 3) {
            this.initForm();
        }
    },
    loadStores: function(callback) {

        //async loading stores
        Ext.getStore('Projects').load({scope: this, callback: this.onLoadStore});
        Ext.getStore('Languages').load({scope: this, callback: this.onLoadStore});
        Ext.getStore('AuthServices').load({scope: this, callback: this.onLoadStore});
    },

    initForm: function() {
        var authServiceField = Ext.getCmp('login-form-auth-service'),
            authServiceId = Ext.util.Cookies.get("authService");

        if (
            authServiceId &&
            (
                (authServiceId != 'google' && authServiceId != 'facebook') ||
                Ext.getStore('AuthServices').getById(authServiceId).get('userId') != ''
            )
        ) {
            // we restore service field on google and facebook only if it auth successful
            authServiceField.setValue(authServiceId)
        }
        this.changeAuthService(Ext.getCmp('login-form-auth-service'));
        Ext.getCmp('login-form').getForm().checkValidity();

        // Remove the global loading message
        Ext.get('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove : true });
    },

    changeAuthService: function(authComboBox) {

        var authServiceId = authComboBox.getValue(),
            authService = authComboBox.store.getById(authServiceId),
            emailField = Ext.getCmp('login-form-email'),
            loginField = Ext.getCmp('login-form-login'),
            passwordField = Ext.getCmp('login-form-password');

        Ext.util.Cookies.set("authService", authServiceId);

        if (authService.get('userId') == '') {
            if (authServiceId == 'google') {
                location.href = googleAuthUrl;
            } else if (authServiceId == 'facebook') {
                location.href = FBAuthUrl;
            }
        }

        emailField.setValue(authService.get('email'));
        emailField.allowBlank = (authServiceId == 'VCS');
        emailField.setDisabled(authServiceId != 'anonymous');

        loginField.setValue(authService.get('login'));
        loginField.setDisabled(authServiceId != 'VCS');

        passwordField.allowBlank = !(authServiceId == 'VCS');
        passwordField.setDisabled(authServiceId != 'VCS');

        // fix for dinamically change allowBlank config
        Ext.getCmp('login-form').doComponentLayout().getForm().checkValidity();
    },

    doLogin: function (button) {
        var form = button.up('form').getForm();
        if (form.isValid()) {
            form.submit({
                method    : 'POST',
                waitTitle : 'Connecting',
                waitMsg   : 'Sending data...',
                success   : function () {
                    window.location.reload();
                },
                failure   : function (form, action) {
                    var msg;
                    switch (action.failureType) {
                        case Ext.form.action.Action.CLIENT_INVALID:
                            msg = 'Form fields may not be submitted with invalid values';
                            break;
                        case Ext.form.action.Action.CONNECT_FAILURE:
                            msg = 'Ajax communication failed';
                            break;
                        case Ext.form.action.Action.SERVER_INVALID:
                            msg = action.result.msg;
                    }
                    Ext.Msg.show({
                        title    : 'Error',
                        msg      : msg,
                        closable : false,
                        buttons  : Ext.Msg.OK,
                        icon     : Ext.MessageBox.ERROR,
                        fn       : function () {
                            Ext.getCmp('login-form-vcsLogin').focus(true);
                        }
                    });

                }
            });
        }
    }

});