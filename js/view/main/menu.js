Ext.define('phpdoe.view.main.menu', {
    extend  : 'Ext.Button',
    iconCls : 'iconHome',
    // menu:{}  skipped because we create it in "initComponent" for localization
    initComponent: function() {

        // add menu items in this method because we can't change .menu property directly in locale files
        // it's normal, see http://docs.sencha.com/ext-js/4-1/#!/guide/application_architecture "AM.view.user.Edit" declaration for example
        this.menu = [
            {
                id: 'main-menu-switch-lang',
                text: this.itemText.SwitchLang,
                iconCls: 'iconSwitchLang',
                menu: Ext.create('Ext.menu.Menu', {

                })
            },
            {
                id: 'main-menu-logout',
                text: this.itemText.LogOut,
                iconCls: 'iconLogOut'
            },
            '-',
            {
                id: 'main-menu-about',
                text: this.itemText.About,
                iconCls: 'iconHelp'
            }
        ];
        this.callParent();
    }
})

