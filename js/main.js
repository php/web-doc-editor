Ext.Loader.setPath('Ext.ux', './extjs/ux')
Ext.application({
    name      : 'phpdoe',
    appFolder : 'js',
    stores: ['Files', 'Languages', 'ConfigCards', 'Themes', 'EditorThemes', 'UILanguages'],
    models: ['File', 'Language', 'ConfigCard', 'Theme', 'UILanguage'],
    requires  : ['phpdoe.util.ajax' , 'phpdoe.util.config', 'phpdoe.view.window.msg'],
    controllers: [ 'main.load', 'main', 'main.menu', 'main.config'],
    launch    : function () {

        Msg = Ext.create('phpdoe.view.window.msg');

        // all we need - run in main controller
    }
});