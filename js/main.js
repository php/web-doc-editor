Ext.define("config",{
    singleton   : true,
    NAME    : "Php Docbook Online Editor"
});

Ext.application({
    name      : 'phpdoe',
    appFolder : 'js',
    stores: ['Files'],
    models: ['File'],
//    controllers: ['main'],
    launch    : function () {

        Ext.create('phpdoe.view.main').show();
        // Remove the global loading message
        Ext.get('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove : true });
    }
});