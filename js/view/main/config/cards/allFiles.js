Ext.define('phpdoe.view.main.config.cards.allFiles', {
    extend  : 'Ext.tab.Panel',
    id         : 'conf-card-all-files',
    activeTab: 0,      // First tab active by default,
    defaults   : {
        bodyStyle: 'padding: 5px;',
        bodyStyle: 'padding: 5px;',
        autoHeight : true,
        overflowY: 'scroll'
    },

    initComponent : function () {

        this.items = [
            {
                title   : 'User Interface',
                iconCls : 'iconUI',
                labelAlign: 'top',
                layout:'form',
                items   : [
                    {
                        xtype   : 'fieldset',
                        title   : 'Tools',
                        iconCls : 'iconConf',
                        items   : [
                            {
                                xtype       : 'checkbox',
                                id          : 'config-allFiles-toolsPanelLogLoad',
                                hideLabel : true,
                                name : 'allFiles.toolsPanelLogLoad',
                                checked : config.user.conf.allFiles.toolsPanelLogLoad,
                                boxLabel : 'Automatically load the log when displaying the file'
                            },
                            {
                                xtype       : 'checkbox',
                                id          : 'config-allFiles-toolsPanelEntitiesLoad',
                                hideLabel : true,
                                name : 'allFiles.toolsPanelEntitiesLoad',
                                checked : config.user.conf.allFiles.toolsPanelEntitiesLoad,
                                boxLabel : 'Automatically load entities data when displaying the file'
                            },
                            {
                                xtype       : 'checkbox',
                                id          : 'config-allFiles-toolsPanelAcronymsLoad',
                                hideLabel : true,
                                name : 'allFiles.toolsPanelAcronymsLoad',
                                checked : config.user.conf.allFiles.toolsPanelAcronymsLoad,
                                boxLabel : 'Automatically load acronyms data when displaying the file'
                            },
                            {
                                xtype   : 'fieldset',
                                title   : 'Start with the panel open',
                                id: 'config-allFiles-toolsPanelDisplay',
                                checkboxToggle: true,
                                checkboxName: 'allFiles.toolsPanelDisplay',
                                collapsed : !config.user.conf.allFiles.toolsPanelDisplay,
                                items   : [
                                    {
                                        xtype      : 'numberfield',
                                        id          : 'config-allFiles-toolsPanelWidth',
                                        hideLabel : true,
                                        size      : 6,
                                        name       : 'allFiles.toolsPanelWidth',
                                        value      : config.user.conf.allFiles.toolsPanelWidth || 375,
                                        minValue   : 0,
                                        maxValue   : 10000,
                                        enableKeyEvents : true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        this.callParent();
    }
});