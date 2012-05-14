Ext.define('phpdoe.view.login' ,{
    extend: 'Ext.Window',
    alias : 'widget.loginwindow',
    id    : 'login-window',
    layout    : 'border',
    width     : 370,
    height    : 300,
    closable  : false,
    draggable : false,
    resizable : false,
    plain     : true,
    title     : 'Control Access',
    iconCls   : 'iconKey',
    items     : [
        Ext.create('Ext.panel.Panel', {
            region  : 'north',
            baseCls : 'x-plain',
            margins : '4 4 4 8',
            height  : 60,
            html    : '<div id="app-logo"><img src="themes/img/php.png"></div><div id="app-title">PhD O.E.</div><div id="app-description">Php Docbook Online Editor</div>'
        }),
        Ext.create('Ext.form.Panel', {
            region      : 'center',
            id          : 'login-form',
            alias       : 'widget.loginform',
            url         : './do/login',
            bodyStyle   : 'padding:5px 5px 0',
            border      : false,
            // Fields will be arranged vertically, stretched to full width
            layout      : 'anchor',
            fieldDefaults    : {
                anchor : '100%',
                labelWidth : 110
            },
            defaultType : 'textfield',
            items       : [
                Ext.create('phpdoe.view.form.IconCombo', {
                    id           : 'login-form-project',
                    name         : 'project',
                    store        : 'Projects',
                    queryMode    : 'local',
                    displayField : 'name',
                    valueField   : 'code',
                    fieldLabel   : 'Project',
                    allowBlank   : false,
                    autoSelect   : true,
                    editable     : false,
                    iconClsField : 'iconCls',
                    value        : 'php'
                }),
                Ext.create('phpdoe.view.form.IconCombo', {
                    id           : 'login-form-lang',
                    name         : 'lang',
                    store        : 'Languages',
                    queryMode    : 'local',
                    displayField : 'name',
                    valueField   : 'code',
                    fieldLabel   : 'Language module',
                    allowBlank   : false,
                    autoSelect   : true,
                    editable     : false,
                    iconClsField : 'iconCls',
                    value        : Ext.util.Cookies.get("lang") || 'en'
                }),
                Ext.create('phpdoe.view.form.IconCombo', {
                    id           : 'login-form-auth-service',
                    name         : 'authService',
                    store        : 'AuthServices',
                    queryMode    : 'local',
                    displayField : 'name',
                    valueField   : 'id',
                    fieldLabel   : 'Auth Service',
                    allowBlank   : false,
                    autoSelect   : true,
                    editable     : false,
                    iconClsField : 'iconCls',
                    value        :  'VCS'
                }),
                Ext.create('Ext.form.field.Text', {
                    allowBlank : false,
                    fieldLabel : 'Login',
                    name       : 'vcsLogin',
                    value      : '',//Ext.util.Cookies.get("loginApp")
                    id         : 'login-form-login'
                }),
                Ext.create('Ext.form.field.Text', {
                    allowBlank : false,
                    fieldLabel : 'Password',
                    name       : 'vcsPassword',
                    id         : 'login-form-password',
                    inputType  : 'password'
                }),
                Ext.create('Ext.form.field.Text', {
                    allowBlank : false,
                    fieldLabel : 'Email',
                    name       : 'email',
                    value      : '',//Ext.util.Cookies.get("email")
                    id         : 'login-form-email',
                    vtype      : 'email'
                })
            ],
            buttonAlign : 'left',
            buttons     : [
                Ext.create('Ext.Button', {
                    text    : 'Request an account',
                    iconCls : 'iconHelp',
                    handler : function () {
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
                    }
                }),
                '->', // Ext.toolbar.Fill
                Ext.create('Ext.Button', {
                    id       : 'login-button',
                    text     : 'Login',
                    formBind : true
                }),
                Ext.create('Ext.Button', {
                    text     : 'Reset',
                    handler  : function () {
                        this.up('form').getForm().reset();
                    }
                })
            ]

        })
    ]

});
