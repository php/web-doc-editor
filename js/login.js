Ext.application({
    name      : 'phpdoe',
    appFolder : 'js',
    stores: ['Projects', 'Languages'],
    models: ['Project', 'Language'],
    controllers: ['login'],
    launch    : function () {

        Ext.create('phpdoe.view.login').show();
        // Remove the global loading message
        Ext.get('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove : true });
    }
});