Ext.define('phpdoe.view.main.menu', {
    extend  : 'Ext.Button',
    iconCls : 'iconHome',
    // menu:{}  skipped because we create it in "initComponent" for localization
    initComponent: function() {

        // add menu items in this method because we can't change .menu property directly in locale files
        // it's normal, see http://docs.sencha.com/ext-js/4-1/#!/guide/application_architecture "AM.view.user.Edit" declaration for example
        this.menu = [
            {
                id: 'main-menu-refresh',
                text: this.itemText.RefreshAllData,
                iconCls: 'iconRefresh'
            },
            {
                id: 'main-menu-build',
                text: this.itemText.BuildTools,
                menu: [
                    {
                        id: 'main-menu-build-check',
                        text: this.itemText.CheckBuild,
                        iconCls: 'iconCheckBuild'
                    },
                    {
                        id: 'main-menu-build-failed',
                        text: this.itemText.LastFailedBuild,
                        iconCls: 'iconBuildStatus'
                    }
                ]
            },
            {
                id: 'main-menu-entools',
                text: this.itemText.EnTools,
                menu: [
                    {
                        id: 'main-menu-check-entities',
                        text: this.itemText.CheckEntities,
                        iconCls: 'iconCheckEntities',
                        menu: [
                            {
                                id: 'main-menu-entities-last-result',
                                text: this.itemText.LastResult,
                                iconCls: 'iconTabView'
                            },
                            {
                                id: 'main-menu-entities-run',
                                text: this.itemText.RunScript,
                                iconCls: 'iconRun'
                            }
                        ]
                    },
                    {
                        id: 'main-menu-check-document',
                        text: this.itemText.CheckDoc,
                        iconCls: 'iconCheckDoc'
                    }
                ]
            },
            '-',
            {
                id: 'main-menu-config',
                text: this.itemText.Configure,
                iconCls: 'iconConf'
            },
            '-',
            {
                id: 'main-menu-switch-lang',
                text: this.itemText.SwitchLang,
                iconCls: 'iconSwitchLang',
                menu: Ext.create('Ext.menu.Menu', {

                })
            },
            {
                id: 'main-menu-erase-personal',
                text: this.itemText.ErasePersonalData,
                iconCls: 'iconErasePersonalData'
            },
            {
                id: 'main-menu-logout',
                text: this.itemText.LogOut,
                iconCls: 'iconLogOut'
            },
            '-',
            {
                id: 'main-menu-report-bug',
                text: this.itemText.ReportBug,
                iconCls: 'iconBugs'
            },
            {
                id: 'main-menu-doc',
                text: this.itemText.Documentation,
                iconCls: 'iconBook'
            },
            {
                id: 'main-menu-chat',
                text: this.itemText.Chat,
                iconCls: 'iconChat'
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

