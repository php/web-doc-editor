Ext.application({
    name      : 'phpdoe',
    appFolder : 'js',
    stores: ['Files', 'Languages', 'ConfigCards'],
    models: ['File', 'Language', 'ConfigCard'],
    requires  : ['phpdoe.util.ajax' , 'phpdoe.util.config', 'phpdoe.view.window.msg'],
    controllers: [ 'main.load', 'main', 'main.menu'],
    launch    : function () {

        Ext.create('phpdoe.view.main').show();

        Msg = Ext.create('phpdoe.view.window.msg');
    }
});