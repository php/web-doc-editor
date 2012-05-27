Ext.define('phpdoe.view.main.config.cards.needReview', {
    extend  : 'Ext.tab.Panel',
    id         : 'conf-card-need-review',
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
                                id          : 'config-reviewed-nbDisplay',
                                hideLabel : true,
                                size      : 6,
                                name       : 'reviewed.nbDisplay',
                                value      : config.user.conf.reviewed.nbDisplay || 300,
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
                                id          : 'config-reviewed-syncScrollbars',
                                hideLabel : true,
                                name : 'reviewed.syncScrollbars',
                                checked : config.user.conf.reviewed.syncScrollbars,
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
                                id          : 'config-reviewed-toolsPanelLogLoad',
                                hideLabel : true,
                                name : 'reviewed.toolsPanelLogLoad',
                                checked : config.user.conf.reviewed.toolsPanelLogLoad,
                                boxLabel : 'Automatically load the log when displaying the file'
                            },
                            {
                                xtype   : 'fieldset',
                                title   : 'Start with the panel open',
                                id: 'config-reviewed-toolsPanelDisplay',
                                checkboxToggle: true,
                                checkboxName: 'reviewed.toolsPanelDisplay',
                                collapsed : !config.user.conf.reviewed.toolsPanelDisplay,
                                items   : [
                                    {
                                        xtype      : 'numberfield',
                                        id          : 'config-reviewed-toolsPanelWidth',
                                        hideLabel : true,
                                        size      : 6,
                                        name       : 'reviewed.toolsPanelWidth',
                                        value      : config.user.conf.reviewed.toolsPanelWidth || 375,
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