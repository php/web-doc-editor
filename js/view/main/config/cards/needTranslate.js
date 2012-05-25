Ext.define('phpdoe.view.main.config.cards.needTranslate', {
    extend  : 'Ext.tab.Panel',
    id         : 'conf-card-need-translate',
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
                iconCls : 'iconUI',
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
                                id          : 'config-newFile-nbDisplay',
                                hideLabel : true,
                                size      : 6,
                                name       : 'newFile.nbDisplay',
                                value      : config.user.conf.newFile.nbDisplay || 300,
                                boxLabel : 'files to display',
                                minValue   : 0,
                                maxValue   : 10000,
                                enableKeyEvents : true
                            },
                            {
                                xtype : 'displayfield',
                                value : '0 means no limit',
                                style : {
                                    fontStyle : 'italic'
                                }
                            }
                        ]
                    }
                ]
            }
        ];

        this.callParent();
    }
});