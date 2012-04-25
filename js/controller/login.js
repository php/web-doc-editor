Ext.define('phpdoe.controller.login', {
    extend: 'Ext.app.Controller',
    requires  : 'Ext.util.Cookies',
    init: function() {
        this.control({
            '#login-button': {
                click: this.doLogin
            }
        });


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