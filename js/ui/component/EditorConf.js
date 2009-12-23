Ext.namespace('ui','ui.component','ui.component._EditorConf');

//------------------------------------------------------------------------------
// EditorConf Win internals

// EditorConf Win-Menu template
ui.component._EditorConf.tplMenu = new Ext.XTemplate(
    '<tpl for=".">',
        '<div class="thumb-wrap" id="tplMenu-{id}">',
            '<div class="thumb"><img src="themes/img/{img}" title=""></div>',
            '<span>{label}</span>',
        '</div>',
    '</tpl>'
);
ui.component._EditorConf.tplMenu.compile();

// EditorConf Win-Menu items definition for EN
ui.component._EditorConf.menuDefEn = [
    ['1', 'go-home.png', _('Main')],
    ['5', 'view-list-tree.png', _('Module "All files"')],
    ['6', 'view-media-playlist.png', _('Module "Pending Patch"')]
];

// EditorConf Win-Menu items definition for Non-EN
ui.component._EditorConf.menuDefNonEn = [
    ['1', 'go-home.png', _('Main')],
    ['2', 'edit-redo.png', _('Module "Files Need Update"')],
    ['3', 'dialog-cancel.png', _('Module "Files with Error"')],
    ['4', 'document-properties.png', _('Module "Files need Reviewed"')],
    ['5', 'view-list-tree.png', _('Module "All files"')],
    ['6', 'view-media-playlist.png', _('Module "Pending Patch"')]
];

// EditorConf Win-Menu items store
ui.component._EditorConf.menuStore = new Ext.data.SimpleStore({
    id     : 0,
    fields : [
        { name : 'id'    },
        { name : 'img'   },
        { name : 'label' }
    ]
});

// EditorConf Win-Menu view
ui.component._EditorConf.viewMenu = Ext.extend(Ext.DataView,
{
    id           : 'conf-menu-view',
    tpl          : ui.component._EditorConf.tplMenu,
    singleSelect : true,
    overClass    : 'x-view-over',
    itemSelector : 'div.thumb-wrap',
    store        : ui.component._EditorConf.menuStore,

    listeners : {
        selectionchange : function(view, select)
        {
            var r = view.getSelectedRecords();
            Ext.getCmp('confCard').layout.setActiveItem('conf-card-' + r[0].data.id);
        }
    }
});

// doc-editor Theme datastore
ui.component._EditorConf.themeStore = new Ext.data.SimpleStore({
    fields : ['themeFile', {
        name : 'themeName',
        type : 'string'
    }],
    data : [
        ['themes/black/css/xtheme-black.css', _('Black')],
        ['themes/empty.css', _('Default')],
        ['themes/darkgray/css/xtheme-darkgray.css', _('DarkGray')],
        ['js/extjs/resources/css/xtheme-gray.css', _('Gray')],
        ['themes/gray-extend/css/xtheme-gray-extend.css', _('Gray Extend')],
        ['themes/indigo/css/xtheme-indigo.css', _('Indigo')],
        ['themes/midnight/css/xtheme-midnight.css', _('Midnight')],
        ['themes/olive/css/xtheme-olive.css', _('Olive')],
        ['themes/purple/css/xtheme-purple.css', _('Purple')],
        ['js/extjs/resources/css/xtheme-slate.css', _('Slate')],
        ['themes/silverCherry/css/xtheme-silverCherry.css', _('SilverCherry')],
        ['themes/ubuntu_human/css/xtheme-human.css', _('Ubuntu Human')]
    ]
});

// EditorConf card1 - Theme Config
ui.component._EditorConf.card1 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-1',
    bodyStyle : 'padding: 10px;',

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype      : 'fieldset',
                title      : _('Themes'),
                autoHeight : true,
                defaults   : { hideLabel: true },
                items      : [{
                    xtype          : 'combo',
                    id             : 'conf-combo-theme',
                    valueField     : 'themeFile',
                    displayField   : 'themeName',
                    triggerAction  : 'all',
                    mode           : 'local',
                    forceSelection : true,
                    editable       : false,
                    value          : phpDoc.userConf["theme"],
                    store          : ui.component._EditorConf.themeStore,

                    listeners : {
                        render : function()
                        {
                            Ext.getCmp('conf-combo-theme').store.sort('themeName');
                        },
                        select : function(c, record, numIndex)
                        {
                            var hrefTheme = c.getValue(),
                            tmp;

                            Ext.get('appTheme').dom.href = hrefTheme;
                            tmp = new ui.task.UpdateConfTask({
                                item  : 'theme',
                                value : hrefTheme
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card1.superclass.initComponent.call(this);
    }
});

// EditorConf card2 - Module "Files Need Update" Config
ui.component._EditorConf.card2 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-2',
    bodyStyle : 'padding: 10px;',

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Diff view'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'radio',
                items       : [{
                    autoHeight : true,
                    name       : 'needUpdateDiff',
                    checked    : (phpDoc.userConf["needUpdateDiff"] === "using-viewvc") ? true : false,
                    boxLabel   : _('Using ViewVc from php web site'),
                    inputValue : 'using-viewvc',
                    listeners  : {
                        check  : function(field)
                        {
                            if (field.checked) {
                                var tmp = new ui.task.UpdateConfTask({
                                    item  : 'needUpdateDiff',
                                    value : field.getRawValue()
                                });
                            }
                        }
                    }
                }, {
                    autoHeight : true,
                    name       : 'needUpdateDiff',
                    checked    : (phpDoc.userConf["needUpdateDiff"] === "using-exec") ? true : false,
                    boxLabel   : _('Using diff -kk -u command line'),
                    inputValue : 'using-exec',
                    listeners : {
                        check : function(field)
                        {
                            if (field.checked) {
                                var tmp = new ui.task.UpdateConfTask({
                                    item  : 'needUpdateDiff',
                                    value : field.getRawValue()
                                });
                            }
                        }
                    }
                }]
            }, {
                xtype       : 'fieldset',
                title       : _('Editor'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight  : true,
                    name        : 'needUpdateScrollbars',
                    checked     : phpDoc.userConf["needUpdateScrollbars"],
                    boxLabel    : _('Synchronize scroll bars'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'needUpdateScrollbars',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight  : true,
                    name        : 'needUpdateDisplaylog',
                    checked     : phpDoc.userConf["needUpdateDisplaylog"],
                    boxLabel    : _('Automatically load the log when displaying the file'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'needUpdateDisplaylog',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card2.superclass.initComponent.call(this);
    }
});

// EditorConf card3 - Module "Files with Error" Config
ui.component._EditorConf.card3 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-3',
    bodyStyle : 'padding: 10px;',

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Error type'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight : true,
                    name       : 'errorSkipNbLiteralTag',
                    checked    : phpDoc.userConf["errorSkipNbLiteralTag"],
                    boxLabel   : _('Skip nbLiteralTag error'),
                    listeners  : {
                        check  : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'errorSkipNbLiteralTag',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }, {
                xtype       : 'fieldset',
                title       : _('Editor'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight : true,
                    name       : 'errorScrollbars',
                    checked    : phpDoc.userConf["errorScrollbars"],
                    boxLabel   : _('Synchronize scroll bars'),
                    listeners  : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'errorScrollbars',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight : true,
                    name       : 'errorDisplayLog',
                    checked    : phpDoc.userConf["errorDisplayLog"],
                    boxLabel   : _('Automatically load the log when displaying the file'),
                    listeners : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'errorDisplayLog',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card3.superclass.initComponent.call(this);
    }
});

// EditorConf card4 - Module "Files need Reviewed" Config
ui.component._EditorConf.card4 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-4',
    bodyStyle : 'padding: 10px;',

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Editor'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight : true,
                    name       : 'reviewedScrollbars',
                    checked    : phpDoc.userConf["reviewedScrollbars"],
                    boxLabel   : _('Synchronize scroll bars'),
                    listeners  : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'reviewedScrollbars',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight : true,
                    name       : 'reviewedDisplaylog',
                    checked    : phpDoc.userConf["reviewedDisplaylog"],
                    boxLabel   : _('Automatically load the log when displaying the file'),
                    listeners  : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'reviewedDisplaylog',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card4.superclass.initComponent.call(this);
    }
});

// EditorConf card5 - Module "All files" Config
ui.component._EditorConf.card5 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-5',
    bodyStyle : 'padding: 10px;',

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Editor'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight : true,
                    name       : 'allFilesDisplayLog',
                    checked    : phpDoc.userConf["allFilesDisplayLog"],
                    boxLabel   : _('Automatically load the log when displaying the file'),
                    listeners  : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'allFilesDisplayLog',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card5.superclass.initComponent.call(this);
    }
});

// EditorConf card6 - Module "Pending Patch" Config
ui.component._EditorConf.card6 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-6',
    bodyStyle : 'padding: 10px;',

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Editor'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight : true,
                    name       : 'patchScrollbars',
                    checked    : phpDoc.userConf["patchScrollbars"],
                    boxLabel   : _('Synchronize scroll bars'),
                    listeners  : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'patchScrollbars',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight : true,
                    name       : 'patchDisplayLog',
                    checked    : phpDoc.userConf["patchDisplayLog"],
                    boxLabel   : _('Automatically load the log when displaying the file'),
                    listeners : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'patchDisplayLog',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card6.superclass.initComponent.call(this);
    }
});

//------------------------------------------------------------------------------
// EditorConf Win
ui.component.EditorConf = Ext.extend(Ext.Window,
{
    id          : 'win-conf',
    layout      : 'border',
    width       : 550,
    height      : 400,
    iconCls     : 'iconConf',
    title       : _('Configuration'),
    modal       : true,
    plain       : true,
    buttons     : [{
        text    : _('Close'),
        handler : function()
        {
            Ext.getCmp('win-conf').close();
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
        if (phpDoc.userLang === 'en') {
            ui.component._EditorConf.menuStore.loadData(ui.component._EditorConf.menuDefEn);
        } else {
            ui.component._EditorConf.menuStore.loadData(ui.component._EditorConf.menuDefNonEn);
        }

        Ext.apply(this,
        {
            items : [{
                id         : 'confMenu',
                region     : 'west',
                width      : 190,
                autoScroll : true,
                items      : [new ui.component._EditorConf.viewMenu()]
            }, {
                id         : 'confCard',
                region     : 'center',
                layout     : 'card',
                width      : 375,
                frame      : true,
                activeItem : 0,

                bbar : new Ext.ux.StatusBar({
                    defaultText    : _('All changes take effect immediately'),
                    defaultIconCls : 'confStatusBar'
                }),

                items : [
                    new ui.component._EditorConf.card1(),
                    new ui.component._EditorConf.card2(),
                    new ui.component._EditorConf.card3(),
                    new ui.component._EditorConf.card4(),
                    new ui.component._EditorConf.card5(),
                    new ui.component._EditorConf.card6()
                ]
            }]
        });
        ui.component.EditorConf.superclass.initComponent.call(this);
    }
});
