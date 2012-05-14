Ext.application({
    name      : 'phpdoe',
    appFolder : 'js',
    stores: ['Projects', 'Languages', 'AuthServices'],
    models: ['Project', 'Language', 'AuthService'],
    controllers: ['login'],
    launch    : function () {

        Ext.create('phpdoe.view.login').show();

    }
});