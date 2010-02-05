Ext.namespace('ui','ui.component','ui.component._EditorConf');

//------------------------------------------------------------------------------
// EditorConf Win internals

// EditorConf Win-Menu template
ui.component._EditorConf.tplMenu = new Ext.XTemplate(
    '<tpl for=".">',
        '<div class="menu-wrap" id="tplMenu-{id}">',
            '<div class="menu {card}"></div>',
            '<span>{label}</span>',
        '</div>',
    '</tpl>'
);
ui.component._EditorConf.tplMenu.compile();

// EditorConf Win-Menu items definition for EN
ui.component._EditorConf.menuDefEn = [
    ['1', 'card1', _('Main')],
    ['6', 'card6', _('Module "All files"')],
    ['7', 'card7', _('Module "Pending Patch"')]
];

// EditorConf Win-Menu items definition for Non-EN
ui.component._EditorConf.menuDefNonEn = [
    ['1', 'card1', _('Main')],
    ['2', 'card2', _('Module "Files Need Translate"')],
    ['3', 'card3', _('Module "Files Need Update"')],
    ['4', 'card4', _('Module "Files with Error"')],
    ['5', 'card5', _('Module "Files need Reviewed"')],
    ['6', 'card6', _('Module "All files"')],
    ['7', 'card7', _('Module "Pending Patch"')]
];

// EditorConf Win-Menu items store
ui.component._EditorConf.menuStore = new Ext.data.SimpleStore({
    id     : 0,
    fields : [
        { name : 'id'    },
        { name : 'card'   },
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
    itemSelector : 'div.menu-wrap',
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
        ['themes/ExtJsThemes/black/css/xtheme-black.css', _('Black')],
        ['themes/empty.css', _('Default')],
        ['themes/ExtJsThemes/darkgray/css/xtheme-darkgray.css', _('DarkGray')],
        ['js/extjs/resources/css/xtheme-gray.css', _('Gray')],
        ['themes/ExtJsThemes/gray-extend/css/xtheme-gray-extend.css', _('Gray Extend')],
        ['themes/ExtJsThemes/indigo/css/xtheme-indigo.css', _('Indigo')],
        ['themes/ExtJsThemes/midnight/css/xtheme-midnight.css', _('Midnight')],
        ['themes/ExtJsThemes/olive/css/xtheme-olive.css', _('Olive')],
        ['themes/ExtJsThemes/purple/css/xtheme-purple.css', _('Purple')],
        ['themes/ExtJsThemes/silverCherry/css/xtheme-silverCherry.css', _('SilverCherry')],
        ['themes/ExtJsThemes/ubuntu_human/css/xtheme-human.css', _('Ubuntu Human')]
    ]
});

// EditorConf card1 - mainApp
ui.component._EditorConf.card1 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-1',
    autoScroll: true,
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
            },{
                xtype       : 'fieldset',
                title       : _('External Data'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight  : true,
                    name        : 'mainAppLoadMailsAtStartUp',
                    checked     : phpDoc.userConf["mainAppLoadMailsAtStartUp"],
                    boxLabel    : _('Load Mails at startUp'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'mainAppLoadMailsAtStartUp',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight  : true,
                    name        : 'mainAppLoadBugsAtStartUp',
                    checked     : phpDoc.userConf["mainAppLoadBugsAtStartUp"],
                    boxLabel    : _('Load Bugs at startUp'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'mainAppLoadBugsAtStartUp',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            },{
                xtype      : 'fieldset',
                title      : _('On save lang file'),
                autoHeight : true,
                defaults   : { hideLabel: true },
                defaultType : 'radio',
                items      : [{
                    autoHeight : true,
                    name       : 'onSaveLangFile',
                    checked    : (phpDoc.userConf["onSaveLangFile"] === "ask-me") ? true : false,
                    boxLabel   : _('Ask me if I want to check for error before saving the file'),
                    inputValue : 'ask-me',
                    listeners  : {
                        check  : function(field)
                        {
                            if (field.checked) {
                                var tmp = new ui.task.UpdateConfTask({
                                    item  : 'onSaveLangFile',
                                    value : field.getRawValue()
                                });
                            }
                        }
                    }
                }, {
                    autoHeight : true,
                    name       : 'onSaveLangFile',
                    checked    : (phpDoc.userConf["onSaveLangFile"] === "always") ? true : false,
                    boxLabel   : _('Always check for error before saving the file'),
                    inputValue : 'always',
                    listeners : {
                        check : function(field)
                        {
                            if (field.checked) {
                                var tmp = new ui.task.UpdateConfTask({
                                    item  : 'onSaveLangFile',
                                    value : field.getRawValue()
                                });
                            }
                        }
                    }
                }, {
                    autoHeight : true,
                    name       : 'onSaveLangFile',
                    checked    : (phpDoc.userConf["onSaveLangFile"] === "never") ? true : false,
                    boxLabel   : _('Never check for error before saving the file'),
                    inputValue : 'never',
                    listeners : {
                        check : function(field)
                        {
                            if (field.checked) {
                                var tmp = new ui.task.UpdateConfTask({
                                    item  : 'onSaveLangFile',
                                    value : field.getRawValue()
                                });
                            }
                        }
                    }
                }]
             }]
        });
        ui.component._EditorConf.card1.superclass.initComponent.call(this);
    }
});

// EditorConf card2 - Module "Files Need Translate" Config
ui.component._EditorConf.card2 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-2',
    autoScroll: true,
    bodyStyle : 'padding: 10px;',

    poolCommitChange : new Ext.util.DelayedTask(function(args) {

        var tmp = new ui.task.UpdateConfTask({
            item  : this.name,
            value : this.getValue()
        });

    }),

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Nb files to display'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'spinnerfield',
                items       : [{
                    autoHeight : true,
                    width      : 60,
                    name       : 'newFileNbDisplay',
                    value      : phpDoc.userConf["newFileNbDisplay"] || 0,
                    boxLabel   : _('files to display'),
                    minValue   : 0,
                    maxValue   : 10000,
                    accelerate : true,
                    enableKeyEvents : true,
                    listeners  : {
                        keyup : function(field)
                        {
                            this.ownerCt.ownerCt.poolCommitChange.delay(1000, null, this);
                        },
                        spin : function(field)
                        {
                            this.ownerCt.ownerCt.poolCommitChange.delay(1000, null, this);
                        }
                    }
                }, {
                    xtype: 'displayfield',
                    value: _('0 means no limit'),
                    style: { fontStyle: 'italic'}
                }]
            }, {
                xtype       : 'fieldset',
                title       : _('Editor'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'checkbox',
                items       : [{
                    autoHeight  : true,
                    name        : 'newFileSpellCheck',
                    checked     : phpDoc.userConf["newFileSpellCheck"],
                    boxLabel    : _('Enable spellChecking'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'newFileSpellCheck',
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

// EditorConf card3 - Module "Files Need Update" Config
ui.component._EditorConf.card3 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-3',
    autoScroll: true,
    bodyStyle : 'padding: 10px;',

    poolCommitChange : new Ext.util.DelayedTask(function(args) {

        var tmp = new ui.task.UpdateConfTask({
            item  : this.name,
            value : this.getValue()
        });

    }),

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Nb files to display'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'spinnerfield',
                items       : [{
                    autoHeight : true,
                    width      : 60,
                    name       : 'needUpdateNbDisplay',
                    value      : phpDoc.userConf["needUpdateNbDisplay"] || 0,
                    boxLabel   : _('files to display'),
                    minValue   : 0,
                    maxValue   : 10000,
                    accelerate : true,
                    enableKeyEvents : true,
                    listeners  : {
                        keyup : function(field)
                        {
                            this.ownerCt.ownerCt.poolCommitChange.delay(1000, null, this);
                        },
                        spin : function(field)
                        {
                            this.ownerCt.ownerCt.poolCommitChange.delay(1000, null, this);
                        }
                    }

                }, {
                    xtype: 'displayfield',
                    value: _('0 means no limit'),
                    style: { fontStyle: 'italic'}
                }]
            }, {
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
                }, {
                    autoHeight  : true,
                    name        : 'needUpdateSpellCheckEn',
                    checked     : phpDoc.userConf["needUpdateSpellCheckEn"],
                    boxLabel    : String.format(_('Enable spellChecking for the <b>{0}</b> file'), 'EN'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'needUpdateSpellCheckEn',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight  : true,
                    name        : 'needUpdateSpellCheckLang',
                    checked     : phpDoc.userConf["needUpdateSpellCheckLang"],
                    boxLabel    : String.format(_('Enable spellChecking for the <b>{0}</b> file'), Ext.util.Format.uppercase(phpDoc.userLang)),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'needUpdateSpellCheckLang',
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

// EditorConf card4 - Module "Files with Error" Config
ui.component._EditorConf.card4 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-4',
    autoScroll: true,
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
                }, {
                    autoHeight  : true,
                    name        : 'errorSpellCheckEn',
                    checked     : phpDoc.userConf["errorSpellCheckEn"],
                    boxLabel    : String.format(_('Enable spellChecking for the <b>{0}</b> file'), 'EN'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'errorSpellCheckEn',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight  : true,
                    name        : 'errorSpellCheckLang',
                    checked     : phpDoc.userConf["errorSpellCheckLang"],
                    boxLabel    : String.format(_('Enable spellChecking for the <b>{0}</b> file'), Ext.util.Format.uppercase(phpDoc.userLang)),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'errorSpellCheckLang',
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

// EditorConf card5 - Module "Files need Reviewed" Config
ui.component._EditorConf.card5 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-5',
    autoScroll: true,
    bodyStyle : 'padding: 10px;',

    poolCommitChange : new Ext.util.DelayedTask(function(args) {

        var tmp = new ui.task.UpdateConfTask({
            item  : this.name,
            value : this.getValue()
        });

    }),

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype       : 'fieldset',
                title       : _('Nb files to display'),
                autoHeight  : true,
                defaults    : { hideLabel: true },
                defaultType : 'spinnerfield',
                items       : [{
                    autoHeight : true,
                    width      : 60,
                    name       : 'reviewedNbDisplay',
                    value      : phpDoc.userConf["reviewedNbDisplay"] || 0,
                    boxLabel   : _('files to display'),
                    minValue   : 0,
                    maxValue   : 10000,
                    accelerate : true,
                    enableKeyEvents : true,
                    listeners  : {
                        keyup : function(field)
                        {
                            this.ownerCt.ownerCt.poolCommitChange.delay(1000, null, this);
                        },
                        spin : function(field)
                        {
                            this.ownerCt.ownerCt.poolCommitChange.delay(1000, null, this);
                        }
                    }

                }, {
                    xtype: 'displayfield',
                    value: _('0 means no limit'),
                    style: { fontStyle: 'italic'}
                }]
            }, {
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
                }, {
                    autoHeight  : true,
                    name        : 'reviewedSpellCheckEn',
                    checked     : phpDoc.userConf["reviewedSpellCheckEn"],
                    boxLabel    : String.format(_('Enable spellChecking for the <b>{0}</b> file'), 'EN'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'reviewedSpellCheckEn',
                                value : field.getValue()
                            });
                        }
                    }
                }, {
                    autoHeight  : true,
                    name        : 'reviewedSpellCheckLang',
                    checked     : phpDoc.userConf["reviewedSpellCheckLang"],
                    boxLabel    : String.format(_('Enable spellChecking for the <b>{0}</b> file'), Ext.util.Format.uppercase(phpDoc.userLang)),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'reviewedSpellCheckLang',
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

// EditorConf card6 - Module "All files" Config
ui.component._EditorConf.card6 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-6',
    autoScroll: true,
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
                }, {
                    autoHeight  : true,
                    name        : 'allFilesSpellCheck',
                    checked     : phpDoc.userConf["allFilesSpellCheck"],
                    boxLabel    : _('Enable spellChecking'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'allFilesSpellCheck',
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

// EditorConf card7 - Module "Pending Patch" Config
ui.component._EditorConf.card7 = Ext.extend(Ext.form.FormPanel,
{
    id        : 'conf-card-7',
    autoScroll: true,
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
                }, {
                    autoHeight  : true,
                    name        : 'patchSpellCheck',
                    checked     : phpDoc.userConf["patchSpellCheck"],
                    boxLabel    : _('Enable spellChecking'),
                    listeners   : {
                        check : function(field)
                        {
                            var tmp = new ui.task.UpdateConfTask({
                                item  : 'patchSpellCheck',
                                value : field.getValue()
                            });
                        }
                    }
                }]
            }]
        });
        ui.component._EditorConf.card7.superclass.initComponent.call(this);
    }
});

//------------------------------------------------------------------------------
// EditorConf Win
ui.component.EditorConf = Ext.extend(Ext.Window,
{
    id          : 'win-conf',
    layout      : 'border',
    width       : 600,
    height      : 470,
    iconCls     : 'iconConf',
    title       : _('Configuration'),
    modal       : true,
    plain       : true,
    bodyBorder  : false,
    closeAction : 'hide',
    buttons     : [{
        text    : _('Close'),
        handler : function()
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
                border     : false,
                width      : 190,
                autoScroll : true,
                items      : [new ui.component._EditorConf.viewMenu()]
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
                    new ui.component._EditorConf.card1(),
                    new ui.component._EditorConf.card2(),
                    new ui.component._EditorConf.card3(),
                    new ui.component._EditorConf.card4(),
                    new ui.component._EditorConf.card5(),
                    new ui.component._EditorConf.card6(),
                    new ui.component._EditorConf.card7()
                ]
            }]
        });
        ui.component.EditorConf.superclass.initComponent.call(this);
    }
});
