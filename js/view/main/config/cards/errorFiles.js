Ext.define('phpdoe.view.main.config.cards.errorFiles', {
    extend  : 'Ext.tab.Panel',
    id         : 'conf-card-error-files',
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
                title   : 'Menu',
                iconCls : 'iconMenu',
                labelAlign: 'top',
                layout:'form',
                items   : [
                    {
                        xtype   : 'fieldset',
                        title   : 'Nb files to display',
                        iconCls : 'iconFilesToDisplay',
                        items   : [
                            {
                                xtype      : 'numberfield',
                                id          : 'config-error-nbDisplay',
                                hideLabel : true,
                                size      : 6,
                                name       : 'error.nbDisplay',
                                value      : config.user.conf.error.nbDisplay || 0,
                                minValue   : 0,
                                maxValue   : 10000,
                                enableKeyEvents : true
                            },
                            {
                                xtype : 'displayfield',
                                value : 'files to display (<span style="font-style:italic">0 means no limit</span>)'
                            }
                        ]
                    },
                    {
                        hidden : (config.user.lang === 'en'),
                        xtype   : 'fieldset',
                        title   : 'Error type',
                        iconCls : 'iconFilesError',
                        items   : [
                            {
                                xtype       : 'checkbox',
                                id          : 'config-error-skipNbLiteralTag',
                                hideLabel : true,
                                name : 'error.skipNbLiteralTag',
                                checked : config.user.conf.error.skipNbLiteralTag,
                                boxLabel : 'Skip nbLiteralTag error'
                            }
                        ]
                    }
                ]
            },
            {
                title   : 'User Interface',
                iconCls : 'iconUI',
                labelAlign: 'top',
                layout:'form',
                items   : [
                    {
                        xtype   : 'fieldset',
                        title   : 'ScrollBars',
                        iconCls : 'iconScrollBar',
                        items   : [
                            {
                                xtype       : 'checkbox',
                                id          : 'config-error-syncScrollbars',
                                hideLabel : true,
                                name : 'error.syncScrollbars',
                                checked : config.user.conf.error.syncScrollbars,
                                boxLabel : 'Synchronize scroll bars'
                            }
                        ]
                    },
                    {
                        xtype   : 'fieldset',
                        title   : 'Tools',
                        iconCls : 'iconConf',
                        items   : [
                            {
                                xtype       : 'checkbox',
                                id          : 'config-error-toolsPanelLogLoad',
                                hideLabel : true,
                                name : 'error.toolsPanelLogLoad',
                                checked : config.user.conf.error.toolsPanelLogLoad,
                                boxLabel : 'Automatically load the log when displaying the file'
                            },
                            {
                                xtype       : 'checkbox',
                                id          : 'config-error-toolsPanelEntitiesLoad',
                                hideLabel : true,
                                name : 'error.toolsPanelEntitiesLoad',
                                checked : config.user.conf.error.toolsPanelEntitiesLoad,
                                boxLabel : 'Automatically load entities data when displaying the file'
                            },
                            {
                                xtype       : 'checkbox',
                                id          : 'config-error-toolsPanelAcronymsLoad',
                                hideLabel : true,
                                name : 'error.toolsPanelAcronymsLoad',
                                checked : config.user.conf.error.toolsPanelAcronymsLoad,
                                boxLabel : 'Automatically load acronyms data when displaying the file'
                            },
                            {
                                xtype   : 'fieldset',
                                title   : 'Start with the panel open',
                                id: 'config-error-toolsPanelDisplay',
                                checkboxToggle: true,
                                checkboxName: 'error.toolsPanelDisplay',
                                collapsed : !config.user.conf.error.toolsPanelDisplay,
                                items   : [
                                    {
                                        xtype      : 'numberfield',
                                        id          : 'config-error-toolsPanelWidth',
                                        hideLabel : true,
                                        size      : 6,
                                        name       : 'error.toolsPanelWidth',
                                        value      : config.user.conf.error.toolsPanelWidth || 375,
                                        minValue   : 0,
                                        maxValue   : 10000,
                                        enableKeyEvents : true
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        xtype   : 'fieldset',
                        title   : 'Error description',
                        iconCls : 'iconFilesError',
                        items   : [
                            {
                                xtype   : 'fieldset',
                                title   : 'Start with the panel open',
                                id: 'config-error-descPanelDisplay',
                                checkboxToggle: true,
                                checkboxName: 'error.descPanelDisplay',
                                collapsed : !config.user.conf.error.descPanelDisplay,
                                items   : [
                                    {
                                        xtype      : 'numberfield',
                                        id          : 'config-error-descPanelHeight',
                                        hideLabel : true,
                                        size      : 6,
                                        name       : 'error.descPanelHeight',
                                        value      : config.user.conf.error.descPanelHeight || 150,
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