Ext.namespace('ui','ui.component','ui.component._StaleFileGrid');

//------------------------------------------------------------------------------
// StaleFileGrid data store
ui.component._StaleFileGrid.store = Ext.extend(Ext.data.GroupingStore,
{
    reader : new Ext.data.JsonReader(
        {
            root          : 'Items',
            totalProperty : 'nbItems',
            id            : 'id'
        }, Ext.data.Record.create([
            {
                name    : 'id',
                mapping : 'id'
            }, {
                name    : 'path',
                mapping : 'path'
            }, {
                name    : 'name',
                mapping : 'name'
            }, {
                name    : 'revision',
                mapping : 'revision'
            }, {
                name    : 'en_revision',
                mapping : 'en_revision'
            }, {
                name    : 'maintainer',
                mapping : 'maintainer'
            }, {
                name    : 'needcommit',
                mapping : 'needcommit'
            }, {
                name    : 'isCritical',
                mapping : 'isCritical'
            }
        ])
    ),
    sortInfo : {
        field     : 'path',
        direction : "ASC"
    },
    groupField : 'path',
    listeners : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-need-update-nb').innerHTML = ds.getCount();
        }
    }
});

// StaleFileGrid view
ui.component._StaleFileGrid.view = new Ext.grid.GroupingView({
    forceFit     : true,
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    getRowClass : function(record, numIndex, rowParams, store)
    {
        if (record.data.needcommit) {
            return 'file-need-commit';
        }
        if (record.data.isCritical) {
            return 'file-critical';
        }
    },
    emptyText : '<div style="text-align: center;">' + _('No Files') + '</div>'
});

// StaleFileGrid columns definition
ui.component._StaleFileGrid.columns = [
    {
        id        : 'name',
        header    : _('Files'),
        sortable  : true,
        dataIndex : 'name'
    }, {
        header    : _('EN revision'),
        width     : 45,
        sortable  : true,
        dataIndex : 'en_revision'
    }, {
        header    : '', // bounded in StaleFileGrid.initComponent
        width     : 45,
        sortable  : true,
        dataIndex : 'revision'
    }, {
        header    : _('Maintainer'),
        width     : 45,
        sortable  : true,
        dataIndex : 'maintainer'
    }, {
        header    : _('Path'),
        dataIndex : 'path',
        'hidden'  : true
    }
];

// StaleFileGrid context menu
// config - { hideCommit, grid, rowIdx, event, lang, fpath, fname }
ui.component._StaleFileGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._StaleFileGrid.menu.superclass.constructor.call(this);
}
Ext.extend(ui.component._StaleFileGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items: [{
                scope   : this,
                text    : '<b>'+_('Edit in a new Tab')+'</b>',
                iconCls : 'iconTabNeedUpdate',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }, {
                scope   : this,
                hidden  : this.hideCommit,
                text    : _('View Diff'),
                iconCls : 'iconViewDiff',
                handler : function()
                {
                    // Add tab for the diff
                    Ext.getCmp('main-panel').add({
                        xtype      : 'panel',
                        id         : 'diff_panel_' + this.rowIdx,
                        title      : _('Diff'),
                        tabTip     : _('Diff'),
                        closable   : true,
                        autoScroll : true,
                        iconCls    : 'iconTabLink',
                        html: '<div id="diff_content_' + this.rowIdx +
                              '" class="diff-content"></div>'
                    });
                    Ext.getCmp('main-panel').setActiveTab('diff_panel_' + this.rowIdx);

                    Ext.get('diff_panel_' + this.rowIdx).mask(
                        '<img src="themes/img/loading.gif" ' +
                        'style="vertical-align: middle;" />' +
                        _('Please, wait...')
                    );

                    // Load diff data
                    XHR({
                        scope   : this,
                        url     : './php/controller.php',
                        params  : {
                            task     : 'getDiff',
                            FilePath : this.lang + this.fpath,
                            FileName : this.fname
                        },
                        success : function(response)
                        {
                            var o = Ext.util.JSON.decode(response.responseText);
                            // We display in diff div
                            Ext.get('diff_content_' + this.rowIdx).dom.innerHTML = o.content;
                            Ext.get('diff_panel_' + this.rowIdx).unmask();
                        }
                    });
                }
            }]
        });
    }
});


//------------------------------------------------------------------------------
// StaleFileGrid
ui.component.StaleFileGrid = Ext.extend(Ext.grid.GridPanel,
{
    view             : ui.component._StaleFileGrid.view,
    loadMask         : true,
    autoExpandColumn : 'name',
    bodyBorder       : false,
    listeners        : {
        rowcontextmenu : function(grid, rowIndex, e)
        {
            var FilePath = grid.store.getAt(rowIndex).data.path,
                FileName = grid.store.getAt(rowIndex).data.name;

            grid.getSelectionModel().selectRow(rowIndex);

            new ui.component._StaleFileGrid.menu({
                hideCommit : (grid.store.getAt(rowIndex).data.needcommit === false),
                grid       : grid,
                event      : e,
                rowIdx     : rowIndex,
                lang       : phpDoc.userLang,
                fpath      : FilePath,
                fname      : FileName
            }).showAt(e.getXY());
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var storeRecord = grid.store.getAt(rowIndex),
                FilePath    = storeRecord.data.path,
                FileName    = storeRecord.data.name,
                en_revision = storeRecord.data.en_revision,
                revision    = storeRecord.data.revision,
                FileID      = Ext.util.md5('FNU-' + phpDoc.userLang + FilePath + FileName),
                diff        = '';

            // Render only if this tab don't exist yet
            if (!Ext.getCmp('main-panel').findById('FNU-' + FileID)) {

                if (phpDoc.userConf.conf_needupdate_diff === "using-viewvc") {
                    diff = ui.component.ViewVCDiff;
                } else if (phpDoc.userConf.conf_needupdate_diff === "using-exec") {
                    diff = ui.component.ExecDiff;
                }

                Ext.getCmp('main-panel').add(
                {
                    id             : 'FNU-' + FileID,
                    layout         : 'border',
                    title          : FileName,
                    originTitle    : FileName,
                    iconCls        : 'iconTabNeedUpdate',
                    closable       : true,
                    defaults       : { split : true },
                    tabTip         : String.format(
                        _('Need Update: in {0}'), FilePath
                    ),
                    items : [
                        new diff({
                            region      : 'north',
                            collapsible : true,
                            prefix      : 'FNU',
                            fid         : FileID,
                            fpath       : FilePath,
                            fname       : FileName,
                            rev1        : revision,
                            rev2        : en_revision
                        }), {
                            region      : 'west',
                            xtype       : 'panel',
                            title       : _('CvsLog'),
                            collapsible : true,
                            collapsed   : true,
                            layout      : 'fit',
                            bodyBorder  : false,
                            width       : 375,
                            items       : {
                                xtype       : 'tabpanel',
                                activeTab   : 0,
                                tabPosition : 'bottom',
                                defaults    : { autoScroll: true },
                                items       : [
                                    new ui.component.CVSLogGrid({
                                        layout    : 'fit',
                                        title     : phpDoc.userLang,
                                        prefix    : 'FNU-LANG',
                                        fid       : FileID,
                                        fpath     : phpDoc.userLang + FilePath,
                                        fname     : FileName,
                                        loadStore : (phpDoc.userConf.conf_needupdate_displaylog === "true")
                                    }),
                                    new ui.component.CVSLogGrid({
                                        layout    : 'fit',
                                        title     : 'en',
                                        prefix    : 'FNU-EN',
                                        fid       : FileID,
                                        fpath     : 'en' + FilePath,
                                        fname     : FileName,
                                        loadStore : (phpDoc.userConf.conf_needupdate_displaylog === "true")
                                    })
                                ]
                            }
                        }, new ui.component.FilePanel(
                        {
                            id             : 'FNU-LANG-PANEL-' + FileID,
                            region         : 'center',
                            title          : String.format(_('{0} File: '), phpDoc.userLang) + FilePath + FileName,
                            prefix         : 'FNU',
                            ftype          : 'LANG',
                            fid            : FileID,
                            fpath          : FilePath,
                            fname          : FileName,
                            lang           : phpDoc.userLang,
                            parser         : 'xml',
                            storeRecord    : storeRecord,
                            syncScrollCB   : true,
                            syncScroll     : true,
                            syncScrollConf : 'conf_needupdate_scrollbars'
                        }), new ui.component.FilePanel(
                        {
                            id             : 'FNU-EN-PANEL-' + FileID,
                            region         : 'east',
                            width          : 575,
                            title          : _('en File: ') + FilePath + FileName,
                            prefix         : 'FNU',
                            ftype          : 'EN',
                            fid            : FileID,
                            fpath          : FilePath,
                            fname          : FileName,
                            lang           : 'en',
                            parser         : 'xml',
                            storeRecord    : storeRecord,
                            syncScroll     : true,
                            syncScrollConf : 'conf_needupdate_scrollbars'
                        })
                    ]
                });
                Ext.getCmp('main-panel').setActiveTab('FNU-' + FileID);

            } else {
                // This tab already exist. We focus it.
                Ext.getCmp('main-panel').setActiveTab('FNU-' + FileID);
            }
        }
    },

    initComponent : function()
    {
        ui.component._StaleFileGrid.columns[2].header = String.format(
            _('{0} revision'), Ext.util.Format.uppercase(phpDoc.userLang)
        );

        Ext.apply(this,
        {
            columns : ui.component._StaleFileGrid.columns,
            store   : new ui.component._StaleFileGrid.store({
                autoLoad : (phpDoc.userLang !== 'en'),
                proxy : new Ext.data.HttpProxy({
                    url : './php/controller.php'
                }),
                baseParams : { task : 'getFilesNeedUpdate' }
            }),
            tbar:[
                _('Filter: '), ' ',
                new Ext.form.TwinTriggerField({
                    id              : 'FNU-filter',
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    listeners : {
                        keypress : function(field, e)
                        {
                            if (e.getKey() == e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click: function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        ui.component._StaleFileGrid.instance.store.clearFilter();
                    },
                    onTrigger2Click: function()
                    {
                        var v = this.getValue();

                        if (v == '' || v.length < 3) {
                            this.markInvalid(
                                _('Your filter must contain at least 3 characters')
                            );
                            return;
                        }
                        this.clearInvalid();
                        this.triggers[0].show();
                        ui.component._StaleFileGrid.instance.store.filter('maintainer', v);
                    }
                })
            ]
        });
        ui.component.StaleFileGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._StaleFileGrid.instance = null;
ui.component.StaleFileGrid.getInstance = function(config)
{
    if (!ui.component._StaleFileGrid.instance) {
        if (!config) config = {};
        ui.component._StaleFileGrid.instance = new ui.component.StaleFileGrid(config);
    }
    return ui.component._StaleFileGrid.instance;
}
