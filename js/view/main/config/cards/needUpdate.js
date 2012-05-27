Ext.define('phpdoe.view.main.config.cards.needUpdate', {
    extend  : 'Ext.tab.Panel',
    id         : 'conf-card-need-update',
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
                                id          : 'config-needUpdate-nbDisplay',
                                hideLabel : true,
                                size      : 6,
                                name       : 'needUpdate.nbDisplay',
                                value      : config.user.conf.needUpdate.nbDisplay || 300,
                                minValue   : 0,
                                maxValue   : 10000,
                                enableKeyEvents : true
                            },
                            {
                                xtype : 'displayfield',
                                value : 'files to display (<span style="font-style:italic">0 means no limit</span>)'
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
                                id          : 'config-needUpdate-syncScrollbars',
                                hideLabel : true,
                                name : 'needUpdate.syncScrollbars',
                                checked : config.user.conf.needUpdate.syncScrollbars,
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
                                id          : 'config-needUpdate-toolsPanelLogLoad',
                                hideLabel : true,
                                name : 'needUpdate.toolsPanelLogLoad',
                                checked : config.user.conf.needUpdate.toolsPanelLogLoad,
                                boxLabel : 'Automatically load the log when displaying the file'
                            },
                            {
                                xtype   : 'fieldset',
                                title   : 'Start with the panel open',
                                id: 'config-needUpdate-toolsPanelDisplay',
                                checkboxToggle: true,
                                checkboxName: 'needUpdate.toolsPanelDisplay',
                                collapsed : !config.user.conf.needUpdate.toolsPanelDisplay,
                                items   : [
                                    {
                                        xtype      : 'numberfield',
                                        id          : 'config-needUpdate-toolsPanelWidth',
                                        hideLabel : true,
                                        size      : 6,
                                        name       : 'needUpdate.toolsPanelWidth',
                                        value      : config.user.conf.needUpdate.toolsPanelWidth || 375,
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
                        title   : 'Diff view',
                        iconCls : 'iconDiffView',
                        items   : [
                            {
                                xtype   : 'fieldset',
                                title   : 'Start with the panel open',
                                id: 'config-needUpdate-diffPanelDisplay',
                                checkboxToggle: true,
                                checkboxName: 'needUpdate.diffPanelDisplay',
                                collapsed : !config.user.conf.needUpdate.diffPanelDisplay,
                                items   : [
                                    {
                                        xtype      : 'numberfield',
                                        id          : 'config-needUpdate-diffPanelHeight',
                                        hideLabel : true,
                                        size      : 6,
                                        name       : 'needUpdate.diffPanelHeight',
                                        value      : config.user.conf.needUpdate.diffPanelHeight || 375,
                                        minValue   : 0,
                                        maxValue   : 10000,
                                        enableKeyEvents : true
                                    }
                                ]
                            },
                            {
                                xtype: 'radiogroup',
                                hideLabel: true,
                                name: 'needUpdate.diffMethod',
                                defaults   : { name: 'needUpdate.diffMethod' },
                                columns: 1,
                                id      : 'config-needUpdate-diffMethod',
                                items: [
                                    {
                                        boxLabel: 'Using ViewVc from php web site',
                                        inputValue: 'using-viewvc',
                                        checked: config.user.conf.needUpdate.diffMethod == 'using-viewvc'
                                    },
                                    {
                                        boxLabel: 'Using diff -u command line',
                                        inputValue: 'using-exec',
                                        checked: config.user.conf.needUpdate.diffMethod == 'using-exec'
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