Ext.namespace('ui','ui.cmp','ui.cmp._EditorConf','ui.cmp._EditorCmd2Conf');

//------------------------------------------------------------------------------
// EditorConf Win internals

// EditorConf Win-Menu template
ui.cmp._EditorConf.tplMenu = new Ext.XTemplate(
    '<tpl for=".">',
        '<div class="menu-wrap" id="tplMenu-{id}">',
            '<div class="menu {card}"></div>',
            '<span>{label}</span>',
        '</div>',
    '</tpl>'
);
ui.cmp._EditorConf.tplMenu.compile();

// EditorConf Win-Menu items definition for EN
ui.cmp._EditorConf.menuDefEn = [
    ['1', 'card1', _('Main')],
    ['4', 'card4', _('Module "Files with error"')],
    ['6', 'card6', _('Module "All files"')]
];

// EditorConf Win-Menu items definition for Non-EN
ui.cmp._EditorConf.menuDefNonEn = [
    ['1', 'card1', _('Main')],
    ['2', 'card2', _('Module "Files need translate"')],
    ['3', 'card3', _('Module "Files need update"')],
    ['4', 'card4', _('Module "Files with error"')],
    ['5', 'card5', _('Module "Files need reviewed"')],
    ['6', 'card6', _('Module "All files"')]
];

// EditorConf Win-Menu items store
ui.cmp._EditorConf.menuStore = new Ext.data.SimpleStore({
    id     : 0,
    fields : [
        { name : 'id'},
        { name : 'card'},
        { name : 'label'}
    ]
});

// EditorConf Win-Menu view
ui.cmp._EditorConf.viewMenu = Ext.extend(Ext.DataView,
{
    id           : 'conf-menu-view',
    tpl          : ui.cmp._EditorConf.tplMenu,
    singleSelect : true,
    overClass    : 'x-view-over',
    itemSelector : 'div.menu-wrap',
    store        : ui.cmp._EditorConf.menuStore,
    listeners : {
        selectionchange : function(view)
        {
            var r = view.getSelectedRecords();
            Ext.getCmp('confCard').layout.setActiveItem('conf-card-' + r[0].data.id);
        }
    }
});

// CodeMirror2 Theme datastore
ui.cmp._EditorCmd2Conf.themeStore = new Ext.data.SimpleStore({
    fields : ['themeFile', {
        name : 'themeName',
        type : 'string'
    }],
    data : [
        [false,       _('No theme')],
        ['default',   _('Default theme')],
        ['cobalt',    _('Cobalt')],
        ['eclipse',   _('Eclipse')],
        ['elegant',   _('Elegant')],
        ['monokai',   _('Monokai')],
        ['neat',      _('Neat')],
        ['night',     _('Night')],
        ['rubyblue',  _('RubyBlue')]
    ]
});

// doc-editor Theme datastore
ui.cmp._EditorConf.themeStore = new Ext.data.SimpleStore({
    fields : ['themeFile', {
        name : 'themeName',
        type : 'string'
    }],
    data : [
        ['themes/ExtJsThemes/black/css/xtheme-black.css',                     _('Black')],
        ['themes/empty.css',                                                  _('Default')],
        ['themes/ExtJsThemes/darkgray/css/xtheme-darkgray.css',               _('DarkGray')],
        ['js/ExtJs/resources/css/xtheme-gray.css',                            _('Gray')],
        ['themes/ExtJsThemes/gray-extend/css/xtheme-gray-extend.css',         _('Gray Extend')],
        ['themes/ExtJsThemes/indigo/css/xtheme-indigo.css',                   _('Indigo')],
        ['themes/ExtJsThemes/midnight/css/xtheme-midnight.css',               _('Midnight')],
        ['themes/ExtJsThemes/olive/css/xtheme-olive.css',                     _('Olive')],
        ['themes/ExtJsThemes/purple/css/xtheme-purple.css',                   _('Purple')],
        ['themes/ExtJsThemes/silverCherry/css/xtheme-silverCherry.css',       _('SilverCherry')],
        ['themes/ExtJsThemes/ubuntu_human/css/xtheme-human.css',              _('Ubuntu Human')]
    ]
});

// doc-editor UI Lang datastore
ui.cmp._EditorConf.uiLangStore = new Ext.data.SimpleStore({
    fields : ['uiLang', {
        name : 'uiLangName',
        type : 'string'
    }],
    data : [
        ['default', _('Default language, if available')],
        ['en',      _('English')],
        ['fr',      _('French')],
        ['ru',      _('Russian')],
        ['es',      _('Spanish')],
        ['ar',      _('Arabic')],
        ['uk',      _('Ukrainian')]
    ]
});

ui.cmp._EditorConf.CommitChange = new Ext.util.DelayedTask(function()
{
    new ui.task.UpdateConfTask({
        module   : this.module,
        itemName : this.itemName,
        value    : this.getValue()
    });
});

// EditorConf card1 - mainApp
ui.cmp._EditorConf.card1 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-1',
    autoScroll : true,
    activeTab  : 0,
    defaults   : { bodyStyle: 'padding: 5px;', autoHeight : true, autoScroll : true },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('User Interface'),
                iconCls : 'iconUI',
                labelAlign: 'top',
                layout:'form',
                items   : [{
                    xtype   : 'fieldset',
                    title   : _('Main menu'),
                    iconCls : 'iconMenu',
                    items   : [{
                        xtype      : 'spinnerfield',
                        width      : 60,
                        name       : 'PhDOE.user.conf.main.mainMenuWidth',
                        module     : 'main',
                        itemName   : 'mainMenuWidth',
                        value      : PhDOE.user.conf.main.mainMenuWidth || 300,
                        fieldLabel : _('Main menu width'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                    var cmp = Ext.getCmp('main-menu-panel'),
                                        val = this.getValue();
                                    PhDOE.user.conf.main.mainMenuWidth = val;
                                    cmp.setWidth(val);
                                    cmp.ownerCt.doLayout();

                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                    var cmp = Ext.getCmp('main-menu-panel'),
                                        val = this.getValue();
                                    PhDOE.user.conf.main.mainMenuWidth = val;
                                    cmp.setWidth(val);
                                    cmp.ownerCt.doLayout();

                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }
                    }]
                }, {
                    xtype   : 'fieldset',
                    iconCls : 'iconThemes',
                    title   : _('Appearance'),
                    items   : [{
                        xtype          : 'combo',
                        fieldLabel     : _('Choose a theme'),
                        id             : 'conf-combo-theme',
                        valueField     : 'themeFile',
                        displayField   : 'themeName',
                        triggerAction  : 'all',
                        mode           : 'local',
                        forceSelection : true,
                        editable       : false,
                        value          : PhDOE.user.conf.main.theme,
                        store          : ui.cmp._EditorConf.themeStore,
                        listeners      : {
                            render : function()
                            {
                                Ext.getCmp('conf-combo-theme').store.sort('themeName');
                            },
                            select : function(c)
                            {
                                var hrefTheme = c.getValue();

                                Ext.get('appTheme').dom.href = hrefTheme;

                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'theme',
                                    value    : hrefTheme
                                });
                            }
                        }
                    },{
                        xtype          : 'combo',
                        fieldLabel     : _('Force an UI language'),
                        id             : 'conf-combo-ui-lang',
                        valueField     : 'uiLang',
                        displayField   : 'uiLangName',
                        triggerAction  : 'all',
                        mode           : 'local',
                        forceSelection : true,
                        editable       : false,
                        value          : PhDOE.user.conf.main.uiLang || 'default',
                        store          : ui.cmp._EditorConf.uiLangStore,
                        listeners      : {
                            select : function(c)
                            {
                                var uiLang = c.getValue();

                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'uiLang',
                                    value    : uiLang
                                });
                            }
                        }
                    }]
                }, {
                    xtype      : 'fieldset',
                    title      : _('On save file'),
                    iconCls    : 'iconSaveFile',
                    autoHeight : true,
                    defaults   : { hideLabel: true },
                    defaultType: 'radio',
                    items      : [{
                        autoHeight : true,
                        name       : 'PhDOE.user.conf.main.onSaveFile',
                        module     : 'main',
                        itemName   : 'onSaveFile',
                        checked    : (PhDOE.user.conf.main.onSaveFile === "ask-me") ? true : false,
                        boxLabel   : _('Ask me if I want to check for error before saving the file'),
                        inputValue : 'ask-me',
                        listeners  : {
                            check  : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'main',
                                        itemName : 'onSaveFile',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }, {
                        autoHeight : true,
                        name       : 'PhDOE.user.conf.main.onSaveFile',
                        module     : 'main',
                        itemName   : 'onSaveFile',
                        checked    : (PhDOE.user.conf.main.onSaveFile === "always") ? true : false,
                        boxLabel   : _('Always check for error before saving the file'),
                        inputValue : 'always',
                        listeners  : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'main',
                                        itemName : 'onSaveFile',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }, {
                        autoHeight : true,
                        name       : 'PhDOE.user.conf.main.onSaveFile',
                        module     : 'main',
                        itemName   : 'onSaveFile',
                        checked    : (PhDOE.user.conf.main.onSaveFile === "never") ? true : false,
                        boxLabel   : _('Never check for error before saving the file'),
                        inputValue : 'never',
                        listeners  : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'main',
                                        itemName : 'onSaveFile',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }]
                 },{
                        xtype       : 'checkbox',
                        name        : 'PhDOE.user.conf.main.displayENWork',
                        checked     : PhDOE.user.conf.main.displayENWork,
                        boxLabel    : _('Display EN work in "Work in progress" & "Patches for review" modules'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'displayENWork',
                                    value : field.getValue()
                                });
                            }
                        }
                 }]
             }, {
                title   : _('External Data'),
                iconCls : 'iconExternalData',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('About mails'),
                    iconCls     : 'iconMailing',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        autoHeight  : true,
                        name        : 'PhDOE.user.conf.main.loadMailsAtStartUp',
                        checked     : PhDOE.user.conf.main.loadMailsAtStartUp,
                        boxLabel    : _('Load mail at startUp'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'loadMailsAtStartUp',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('About bugs'),
                    iconCls     : 'iconBugs',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        autoHeight  : true,
                        name        : 'PhDOE.user.conf.main.loadBugsAtStartUp',
                        checked     : PhDOE.user.conf.main.loadBugsAtStartUp,
                        boxLabel    : _('Load bugs at startUp'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'loadBugsAtStartUp',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
             }, {
                title   : _('Editor'),
                iconCls : 'iconEditor',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Editor theme'),
                    iconCls     : 'iconThemes',
                    items       : [{
                        xtype          : 'combo',
                        fieldLabel     : _('Choose a theme'),
                        id             : 'conf-combo-cm2-theme',
                        valueField     : 'themeFile',
                        displayField   : 'themeName',
                        triggerAction  : 'all',
                        mode           : 'local',
                        forceSelection : true,
                        editable       : false,
                        value          : (PhDOE.user.conf.main.editorTheme || 'default'),
                        store          : ui.cmp._EditorCmd2Conf.themeStore,
                        listeners      : {
                            select : function(c)
                            {
                                var themeValue = c.getValue();

                                new ui.task.UpdateConfTask({
                                    module   : 'main',
                                    itemName : 'editorTheme',
                                    value    : themeValue
                                });
                            }
                        }
                    }]
                }]
             }]
        });
        ui.cmp._EditorConf.card1.superclass.initComponent.call(this);
    }
});

// EditorConf card2 - Module "Files Need Translate" Config
ui.cmp._EditorConf.card2 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-2',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    items       : [{
                        xtype      : 'spinnerfield',
                        width      : 60,
                        name       : 'PhDOE.user.conf.newFile.nbDisplay',
                        module     : 'newFile',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.newFile.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }
                    }, {
                        xtype : 'displayfield',
                        value : _('0 means no limit'),
                        style : { fontStyle: 'italic'}
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'PhDOE.user.conf.newFile.syncScrollbars',
                        checked     : PhDOE.user.conf.newFile.syncScrollbars,
                        boxLabel    : _('Synchronize scroll bars'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                },{
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.newFile.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'newFile.toolsPanelWidth',
                            module     : 'newFile',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.newFile.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Right panel'),
                    iconCls     : 'iconUI',
                    defaults    : { hideLabel: true },
                    defaultType : 'radio',
                    items       : [
                    /*{
                        name: 'PhDOE.user.conf.newFile.secondPanel',
                        boxLabel: _('Display the Google Translation Panel'),
                        inputValue: 'google',
                        checked: (PhDOE.user.conf.newFile.secondPanel === 'google') ? true : false,
                        listeners: {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'newFile',
                                        itemName : 'secondPanel',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    },*/
                    {
                        name     : 'PhDOE.user.conf.newFile.secondPanel',
                        boxLabel : _('Display the original file'),
                        inputValue: 'originalFile',
                        checked: (PhDOE.user.conf.newFile.secondPanel === 'originalFile') ? true : false,
                        listeners   : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'newFile',
                                        itemName : 'secondPanel',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    },{
                        name     : 'PhDOE.user.conf.newFile.secondPanel',
                        boxLabel : _('Do not display a right panel'),
                        inputValue: 'none',
                        checked: (!Ext.isDefined(PhDOE.user.conf.newFile.secondPanel) || PhDOE.user.conf.newFile.secondPanel === 'none') ? true : false,
                        listeners   : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'newFile',
                                        itemName : 'secondPanel',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card2.superclass.initComponent.call(this);
    }
});

// EditorConf card3 - Module "Files Need Update" Config
ui.cmp._EditorConf.card3 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-3',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    defaultType : 'spinnerfield',
                    items       : [{
                        width      : 60,
                        name       : 'PhDOE.user.conf.needUpdate.nbDisplay',
                        module     : 'needUpdate',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.needUpdate.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }

                    }, {
                        xtype : 'displayfield',
                        value : _('0 means no limit'),
                        style : { fontStyle: 'italic'}
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'needUpdate.syncScrollbars',
                        checked     : PhDOE.user.conf.needUpdate.syncScrollbars,
                        boxLabel    : _('Synchronize scroll bars'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name        : 'needUpdate.toolsPanelLogLoad',
                        checked     : PhDOE.user.conf.needUpdate.toolsPanelLogLoad,
                        boxLabel    : _('Automatically load the log when displaying the file'),
                        listeners   : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.needUpdate.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'needUpdate.toolsPanelWidth',
                            module     : 'needUpdate',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.needUpdate.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Diff view'),
                    iconCls     : 'iconDiffView',
                    defaults    : { hideLabel: true },
                    defaultType : 'radio',
                    items       : [{
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.needUpdate.diffPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'needUpdate.diffPanelHeight',
                            module     : 'needUpdate',
                            itemName   : 'diffPanelHeight',
                            value      : PhDOE.user.conf.needUpdate.diffPanelHeight || 150,
                            fieldLabel : _('Panel height'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }, {
                        name       : 'needUpdate.diffMethod',
                        checked    : (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc") ? true : false,
                        boxLabel   : _('Using ViewVc from php web site'),
                        inputValue : 'using-viewvc',
                        listeners  : {
                            check  : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'needUpdate',
                                        itemName : 'diffMethod',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }, {
                        name       : 'needUpdate.diffMethod',
                        checked    : (PhDOE.user.conf.needUpdate.diffMethod === "using-exec") ? true : false,
                        boxLabel   : _('Using diff -u command line'),
                        inputValue : 'using-exec',
                        listeners : {
                            check : function(field)
                            {
                                if (field.checked) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'needUpdate',
                                        itemName : 'diffMethod',
                                        value : field.getRawValue()
                                    });
                                }
                            }
                        }
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card3.superclass.initComponent.call(this);
    }
});

// EditorConf card4 - Module "Files with Error" Config
ui.cmp._EditorConf.card4 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-4',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    defaultType : 'spinnerfield',
                    items       : [{
                        width      : 60,
                        name       : 'PhDOE.user.conf.error.nbDisplay',
                        module     : 'error',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.error.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }

                    }, {
                        xtype : 'displayfield',
                        value : _('0 means no limit'),
                        style : { fontStyle: 'italic'}
                    }]
                }, {
                    hidden      : ( PhDOE.user.lang === 'en' ),
                    xtype       : 'fieldset',
                    title       : _('Error type'),
                    iconCls     : 'iconFilesError',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'error.skipNbLiteralTag',
                        checked    : PhDOE.user.conf.error.skipNbLiteralTag,
                        boxLabel   : _('Skip nbLiteralTag error'),
                        listeners  : {
                            check  : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'skipNbLiteralTag',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'error.syncScrollbars',
                        checked    : PhDOE.user.conf.error.syncScrollbars,
                        boxLabel   : _('Synchronize scroll bars'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'error.toolsPanelLogLoad',
                        checked    : PhDOE.user.conf.error.toolsPanelLogLoad,
                        boxLabel   : _('Automatically load the log when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name       : 'error.toolsPanelEntitiesLoad',
                        checked    : PhDOE.user.conf.error.toolsPanelEntitiesLoad,
                        boxLabel   : _('Automatically load entities data when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelEntitiesLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name       : 'error.toolsPanelAcronymsLoad',
                        checked    : PhDOE.user.conf.error.toolsPanelAcronymsLoad,
                        boxLabel   : _('Automatically load acronyms data when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelAcronymsLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.error.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items: [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'error.toolsPanelWidth',
                            module     : 'error',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.error.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Error description'),
                    iconCls     : 'iconFilesError',
                    defaults    : { hideLabel: true },
                    defaultType : 'radio',
                    items       : [{
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.error.descPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'descPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'error',
                                    itemName : 'descPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'error.descPanelHeight',
                            module     : 'error',
                            itemName   : 'descPanelHeight',
                            value      : PhDOE.user.conf.error.descPanelHeight || 150,
                            fieldLabel : _('Panel height'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card4.superclass.initComponent.call(this);
    }
});

// EditorConf card5 - Module "Files need Reviewed" Config
ui.cmp._EditorConf.card5 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-5',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('Menu'),
                iconCls : 'iconMenu',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Nb files to display'),
                    iconCls     : 'iconFilesToDisplay',
                    defaults    : { hideLabel: true },
                    defaultType : 'spinnerfield',
                    items       : [{
                        width      : 60,
                        name       : 'reviewed.nbDisplay',
                        module     : 'reviewed',
                        itemName   : 'nbDisplay',
                        value      : PhDOE.user.conf.reviewed.nbDisplay || 0,
                        boxLabel   : _('files to display'),
                        minValue   : 0,
                        maxValue   : 10000,
                        accelerate : true,
                        enableKeyEvents : true,
                        listeners  : {
                            keyup : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            },
                            spin : function()
                            {
                                ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                            }
                        }

                    }, {
                        xtype: 'displayfield',
                        value: _('0 means no limit'),
                        style: { fontStyle: 'italic'}
                    }]
                }]
            }, {
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('ScrollBars'),
                    iconCls     : 'iconScrollBar',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'reviewed.syncScrollbars',
                        checked    : PhDOE.user.conf.reviewed.syncScrollbars,
                        boxLabel   : _('Synchronize scroll bars'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'syncScrollbars',
                                    value : field.getValue()
                                });
                            }
                        }
                    }]
                }, {
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'reviewed.toolsPanelLogLoad',
                        checked    : PhDOE.user.conf.reviewed.toolsPanelLogLoad,
                        boxLabel   : _('Automatically load the log when displaying the file'),
                        listeners : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.reviewed.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'reviewed',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items : [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'reviewed.toolsPanelWidth',
                            module     : 'reviewed',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.reviewed.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card5.superclass.initComponent.call(this);
    }
});

// EditorConf card6 - Module "All files" Config
ui.cmp._EditorConf.card6 = Ext.extend(Ext.TabPanel,
{
    id         : 'conf-card-6',
    autoScroll : true,
    activeTab  : 0,
    defaults   : {
        bodyStyle  : 'padding: 5px;',
        autoHeight : true,
        autoScroll : true
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                title   : _('User Interface'),
                iconCls : 'iconUI',
                items   : [{
                    xtype       : 'fieldset',
                    title       : _('Tools'),
                    iconCls     : 'iconConf',
                    defaults    : { hideLabel: true },
                    defaultType : 'checkbox',
                    items       : [{
                        name       : 'allFiles.toolsPanelLogLoad',
                        checked    : PhDOE.user.conf.allFiles.toolsPanelLogLoad,
                        boxLabel   : _('Automatically load the log when displaying the file'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelLogLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        name       : 'allFiles.toolsPanelEntitiesLoad',
                        checked    : PhDOE.user.conf.allFiles.toolsPanelEntitiesLoad,
                        boxLabel   : _('Automatically load entities data when displaying the file'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelEntitiesLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    },{
                        name       : 'allFiles.toolsPanelAcronymsLoad',
                        checked    : PhDOE.user.conf.allFiles.toolsPanelAcronymsLoad,
                        boxLabel   : _('Automatically load acronyms data when displaying the file'),
                        listeners  : {
                            check : function(field)
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelAcronymsLoad',
                                    value : field.getValue()
                                });
                            }
                        }
                    }, {
                        xtype          : 'fieldset',
                        checkboxToggle : true,
                        collapsed      : !PhDOE.user.conf.allFiles.toolsPanelDisplay,
                        title          : _('Start with the panel open'),
                        listeners      : {
                            collapse : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelDisplay',
                                    value : false
                                });
                            },
                            expand : function()
                            {
                                new ui.task.UpdateConfTask({
                                    module   : 'allFiles',
                                    itemName : 'toolsPanelDisplay',
                                    value : true
                                });
                            }
                        },
                        items: [{
                            xtype      : 'spinnerfield',
                            width      : 60,
                            name       : 'allFiles.toolsPanelWidth',
                            module     : 'allFiles',
                            itemName   : 'toolsPanelWidth',
                            value      : PhDOE.user.conf.allFiles.toolsPanelWidth || 375,
                            fieldLabel : _('Panel width'),
                            minValue   : 0,
                            maxValue   : 10000,
                            accelerate : true,
                            enableKeyEvents : true,
                            listeners  : {
                                keyup : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                },
                                spin : function()
                                {
                                    ui.cmp._EditorConf.CommitChange.delay(1000, null, this);
                                }
                            }
                        }]
                    }]
                }]
            }]
        });
        ui.cmp._EditorConf.card6.superclass.initComponent.call(this);
    }
});

//------------------------------------------------------------------------------
// EditorConf Win
ui.cmp.EditorConf = Ext.extend(Ext.Window,
{
    id          : 'win-conf',
    layout      : 'border',
    width       : 700,
    height      : 470,
    iconCls     : 'iconConf',
    title       : _('Configuration'),
    modal       : true,
    plain       : true,
    bodyBorder  : false,
    closeAction : 'hide',
    buttons     : [{
        text   : _('Close'),
        handler: function()
        {
            Ext.getCmp('win-conf').hide();
        }
    }],

    listeners : {
        show : function()
        {
            var view = Ext.getCmp('conf-menu-view');
            view.select(view.getNode(0));
        }
    },

    initComponent : function()
    {
        if (PhDOE.user.lang === 'en') {
            ui.cmp._EditorConf.menuStore.loadData(ui.cmp._EditorConf.menuDefEn);
        } else {
            ui.cmp._EditorConf.menuStore.loadData(ui.cmp._EditorConf.menuDefNonEn);
        }

        Ext.apply(this,
        {
            items : [{
                id         : 'confMenu',
                region     : 'west',
                border     : false,
                width      : 190,
                autoScroll : true,
                items      : [new ui.cmp._EditorConf.viewMenu()]
            }, {
                id         : 'confCard',
                region     : 'center',
                border     : false,
                layout     : 'card',
                width      : 375,
                frame      : true,
                activeItem : 0,

                bbar : new Ext.ux.StatusBar({
                    defaultText    : _('All changes take effect immediately'),
                    defaultIconCls : 'confStatusBar'
                }),

                items : [
                    new ui.cmp._EditorConf.card1(),
                    new ui.cmp._EditorConf.card2(),
                    new ui.cmp._EditorConf.card3(),
                    new ui.cmp._EditorConf.card4(),
                    new ui.cmp._EditorConf.card5(),
                    new ui.cmp._EditorConf.card6()
                ]
            }]
        });
        ui.cmp.EditorConf.superclass.initComponent.call(this);
    }
});
