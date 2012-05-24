Ext.define('phpdoe.controller.login', {
    extend: 'Ext.app.Controller',
    requires  : 'Ext.util.Cookies',
    onLaunch: function() {
        this.control({
            '#login-button': {
                click: this.doLogin
            },
            '#login-form-auth-service': {
                change: this.changeAuthService
            },
            '#login-form-request-button': {
                click: this.requestAccount
            }
        });

        this.loadStores(['Projects', 'Languages', 'AuthServices']);
    },


    requestAccount: function(button) {
        var projectInput = Ext.getCmp('login-form-project'),
            url = projectInput.store.getById(projectInput.getValue()).get('request_account_uri');

        Ext.Msg.show({
            title   : 'Request an account',
            msg     : '<div style="text-align: center;">' +
                'To request a VCS account please read:<br>' +
                '<a href="' + url + '" target="_blank">' + url + '</a>' +
                '</div>',
            buttons : Ext.Msg.OK,
            icon    : Ext.Msg.INFO
        });
    },


    loadStoresCount: 0,
    onLoadStore: function() {
        this.loadStoresCount--;
        if (this.loadStoresCount <= 0) {
            this.initApplication();
        }
    },
    loadStores: function(storeNames) {

        this.loadStoresCount = storeNames.length;

        //async loading stores
        for (var i = 0; i < storeNames.length; i++) {
            Ext.getStore(storeNames[i]).load({scope: this, callback: this.onLoadStore});

        }
    },

    initApplication: function() {
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