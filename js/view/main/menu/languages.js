Ext.define('phpdoe.view.main.menu.languages', {
    extend  : 'Ext.menu.Menu',

    initComponent: function() {

        this.items = [
            {
                id: 'main-menu-switch-lang',
                text: this.itemText.SwitchLang,
                iconCls: 'iconSwitchLang',
                menu: Ext.Create(
                    'Ext.menu.Menu',
                    {
                    //items will be loaded in main controller
                    }
                )
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
