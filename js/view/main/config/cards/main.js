Ext.define('phpdoe.view.main.config.cards.main', {
    extend  : 'Ext.tab.Panel',
    id         : 'conf-card-main',
    activeTab: 0,      // First tab active by default,
    defaults   : {
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
                        title   : 'Left panel',
                        iconCls : 'iconMenu',
                        items   : [
                            {
                                xtype      : 'numberfield',
                                id          : 'config-left-panel-width',
                                size      : 6,
                                name       : 'main.mainMenuWidth',
                                value      : config.user.conf.main.mainMenuWidth || 300,
                                fieldLabel : 'Left panel width',
                                minValue   : 0,
                                maxValue   : 10000,
                                enableKeyEvents : true
                            }
                        ]
                    },
                    {
                        xtype   : 'fieldset',
                        iconCls : 'iconThemes',
                        title   : 'Appearance',
                        items   : [
                            {
                                xtype          : 'combo',
                                id           : 'config-theme',
                                name         : 'main.theme',
                                store        : 'Themes',
                                queryMode    : 'local',
                                displayField : 'name',
                                valueField   : 'id',
                                fieldLabel   : 'Choose a theme<br>(required reload)',
                                allowBlank   : false,
                                autoSelect   : true,
                                editable     : false,
                                value        :  config.user.conf.main.theme
                            },
                            {
                                xtype         : 'combo',
                                id           : 'config-lang',
                                name         : 'main.uiLang',
                                store        : 'UILanguages',
                                queryMode    : 'local',
                                displayField : 'name',
                                valueField   : 'id',
                                fieldLabel   : 'Force an UI language<br>(required reload)',
                                allowBlank   : false,
                                autoSelect   : true,
                                editable     : false,
                                value        : config.user.conf.main.uiLang
                            }
                        ]
                    },
                    {
                        xtype      : 'fieldset',
                        title      : 'On save file',
                        iconCls    : 'iconSaveFile',
                        autoHeight : true,
                        items      : [
                            {
                                xtype: 'radiogroup',
                                hideLabel: true,
                                name: 'main.onSaveFile',
                                defaults   : { name: 'main.onSaveFile' },
                                columns: 1,
                                id      : 'config-on-save-file',
                                items: [
                                    {
                                        boxLabel: 'Ask me if I want to check for error before saving the file',
                                        inputValue: 'ask-me',
                                        checked:
                                            config.user.conf.main.onSaveFile == 'ask-me' ||
                                                config.user.conf.main.onSaveFile == ''
                                    },
                                    {
                                        boxLabel: 'Always check for error before saving the file',
                                        inputValue: 'always',
                                        checked: config.user.conf.main.onSaveFile == 'always'
                                    },
                                    {
                                        boxLabel: 'Never check for error before saving the file',
                                        inputValue: 'never',
                                        checked: config.user.conf.main.onSaveFile == 'never'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        xtype      : 'fieldset',
                        title      : 'EN work',
                        autoHeight : true,
                        items      : [
                            {
                                xtype       : 'checkbox',
                                id          : 'config-display-en-work',
                                name        : 'main.displayENWork',
                                checked     : config.user.conf.main.displayENWork,
                                boxLabel    : 'Display EN work in "Work in progress" & "Patches for review" modules'
                            }
                        ]
                    }
                ]
            },
            {
                title : 'External Data',
                iconCls : 'iconExternalData',
                labelAlign: 'top',
                layout:'form',
                items : [
                    {
                        xtype : 'fieldset',
                        title : 'About mails',
                        iconCls : 'iconMailing',
                        defaultType : 'checkbox',
                        items : [
                            {
                                id: 'config-load-mails',
                                autoHeight : true,
                                hideLabel : true,
                                name : 'main.loadMailsAtStartUp',
                                checked : config.user.conf.main.loadMailsAtStartUp,
                                boxLabel : 'Load mail at startUp'
                            }
                        ]
                    },
                    {
                        xtype : 'fieldset',
                        title : 'About bugs',
                        iconCls : 'iconBugs',
                        defaultType : 'checkbox',
                        items : [
                            {
                                id: 'config-load-bugs',
                                autoHeight : true,
                                hideLabel : true,
                                name : 'main.loadBugsAtStartUp',
                                checked : config.user.conf.main.loadBugsAtStartUp,
                                boxLabel : 'Load bugs at startUp'
                            }
                        ]
                    }
                ]
            },
            {
                title : 'Editor',
                iconCls : 'iconEditor',
                labelAlign: 'top',
                layout:'form',
                items : [
                    {
                        xtype : 'fieldset',
                        title : 'Editor theme',
                        iconCls : 'iconThemes',
                        items : [
                            {
                                xtype          : 'combo',
                                id           : 'config-cm2-theme',
                                name         : 'main.editorTheme',
                                store        : 'EditorThemes',
                                queryMode    : 'local',
                                displayField : 'name',
                                valueField   : 'id',
                                fieldLabel   : 'Choose a theme',
                                allowBlank   : false,
                                autoSelect   : true,
                                editable     : false,
                                value        :  config.user.conf.main.editorTheme || 'default'
                            }
                        ]
                    }
                ]
            }
        ];

        this.callParent();
    }
});