Ext.application({
    name      : 'phpdoe',
    appFolder : 'js',
    stores: ['Files', 'Languages'],
    models: ['File', 'Language'],
    requires  : ['phpdoe.util.ajax' , 'phpdoe.util.config'],
    controllers: ['main', 'main.menu'],
    launch    : function () {

        Ext.create('phpdoe.view.main').show();

    }
});