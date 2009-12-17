Ext.namespace('ui','ui.component','ui.component._PendingReviewGrid');

//------------------------------------------------------------------------------
// PendingReviewGrid internals

// PendingReviewGrid store
ui.component._PendingReviewGrid.store = Ext.extend(Ext.data.GroupingStore,
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
                name    : 'reviewed',
                mapping : 'reviewed'
            }, {
                name    : 'maintainer',
                mapping : 'maintainer'
            }, {
                name    : 'needcommit',
                mapping : 'needcommit'
            }
        ])
    ),
    sortInfo : {
        field     : 'name',
        direction : "ASC"
    },
    groupField : 'path',
    listeners : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-need-reviewed-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingReviewGrid columns definition
ui.component._PendingReviewGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Reviewed'),
    width     : 45,
    sortable  : true,
    dataIndex : 'reviewed'
}, {
    header    : _('Maintainer'),
    width     : 45,
    sortable  : true,
    dataIndex : 'maintainer'
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// PendingReviewGrid view
ui.component._PendingReviewGrid.view = new Ext.grid.GroupingView({
    forceFit     : true,
    startCollapsed: true,
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    getRowClass  : function(record, numIndex, rowParams, store)
    {
        if (record.data.needcommit) {
            return 'file-need-commit';
        }
    },
    emptyText : '<div style="text-align: center;">' + _('No Files') + '</div>'
});

Ext.namespace('ui.component._PendingReviewGrid.menu');
// PendingReviewGrid diff menu
// config - { rowIdx, fpath, fname }
ui.component._PendingReviewGrid.menu.diff = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingReviewGrid.menu.diff.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingReviewGrid.menu.diff, Ext.menu.Item,
{
    text    : _('View Diff'),
    iconCls : 'iconViewDiff',
    init : function()
    {
        Ext.apply(this,
        {
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
                    html       : '<div id="diff_content_' + this.rowIdx + '" class="diff-content"></div>'
                });
                Ext.getCmp('main-panel').setActiveTab('diff_panel_' + this.rowIdx);

                Ext.get('diff_panel_' + this.rowIdx).mask(
                    '<img src="themes/img/loading.gif" ' +
                        'style="vertical-align: middle;" /> ' +
                    _('Please, wait...')
                );

                // Load diff data
                XHR({
                    scope   : this,
                    params  : {
                        task     : 'getDiff',
                        FilePath : phpDoc.userLang + this.fpath,
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
        });
    }
});

// PendingReviewGrid refence group menu
// config - { gname }
ui.component._PendingReviewGrid.menu.group = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingReviewGrid.menu.group.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingReviewGrid.menu.group, Ext.menu.Item,
{
    iconCls : 'iconViewDiff',
    init : function()
    {
        Ext.apply(this,
        {
            text    : String.format(
                _('Open all files about {0} extension'), this.gname
            ),
            handler : function()
            {
                Ext.getBody().mask(
                    '<img src="themes/img/loading.gif" ' +
                        'style="vertical-align: middle;" /> ' +
                    String.format(_('Open all files about {0} extension'), this.gname) + '. ' +
                    _('Please, wait...')
                );

                XHR({
                    params  : {
                        task    : 'getAllFilesAboutExtension',
                        ExtName : this.gname
                    },
                    success : function(response)
                    {
                        var o = Ext.util.JSON.decode(response.responseText);

                        phpDoc.filePendingOpen = [];

                        for (var i = 0; i < o.files.length; i = i + 1) {
                            phpDoc.filePendingOpen[i] = {
                                fpath : phpDoc.userLang + o.files[i].path,
                                fname : o.files[i].name
                            };
                        }

                        // Start the first
                        ui.component.RepositoryTree.getInstance().openFile(
                            phpDoc.filePendingOpen[0].fpath,
                            phpDoc.filePendingOpen[0].fname
                        );

                        Ext.getBody().unmask();
                    }
                });
            }
        });
    }
});

// PendingReviewGrid menu
// config - { hideDiff, hideGroup, gname, grid, rowIdx, event, fpath, fname }
ui.component._PendingReviewGrid.menu.main = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingReviewGrid.menu.main.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingReviewGrid.menu.main, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [
                {
                    text    : '<b>'+_('Edit in a new Tab')+'</b>',
                    iconCls : 'FilesNeedReviewed',
                    scope   : this,
                    handler : function()
                    {
                        this.grid.fireEvent('rowdblclick',
                            this.grid, this.rowIdx, this.event
                        );
                    }
                }, new ui.component._PendingReviewGrid.menu.diff({
                    fpath  : this.fpath,
                    fname  : this.fname,
                    rowIdx : this.rowIdx,
                    hidden : this.hideDiff
                }), '-', new ui.component._PendingReviewGrid.menu.group({
                    gname  : this.gname,
                    hidden : this.hideGroup
                })
            ]
        });
    }
});

//------------------------------------------------------------------------------
// PendingReviewGrid
ui.component.PendingReviewGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'name',
    columns          : ui.component._PendingReviewGrid.columns,
    view             : ui.component._PendingReviewGrid.view,

    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {

            e.stopEvent();

            var storeRecord = grid.store.getAt(rowIndex),
                FilePath    = storeRecord.data.path,
                FileName    = storeRecord.data.name,
                fpath_split = FilePath.split('/'),
                tmp;

            grid.getSelectionModel().selectRow(rowIndex);

            tmp = new ui.component._PendingReviewGrid.menu.main({
                grid      : grid,
                rowIdx    : rowIndex,
                event     : e,
                fpath     : FilePath,
                fname     : FileName,
                hideDiff  : (!storeRecord.data.needcommit),
                hideGroup : (fpath_split[1] !== 'reference'),
                gname     : fpath_split[2]
            }).showAt(e.getXY());
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            this.openFile(grid.store.getAt(rowIndex).data.id);
        }
    },

    openFile : function(rowId)
    {
        var storeRecord = this.store.getById(rowId),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileID      = Ext.util.md5('FNR-' + phpDoc.userLang + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNR-' + FileID)) {

            Ext.getCmp('main-panel').add({
                id          : 'FNR-' + FileID,
                title       : FileName,
                layout      : 'border',
                iconCls     : 'iconTabNeedReviewed',
                closable    : true,
                originTitle : FileName,
                defaults    : { split : true },
                tabTip      : String.format(
                    _('Need Reviewed in: {0}'), FilePath
                ),
                items : [
                    {
                        region      : 'west',
                        xtype       : 'panel',
                        title       : _('VCSLog'),
                        collapsible : true,
                        collapsed   : true,
                        layout      : 'fit',
                        bodyBorder  : false,
                        width       : 375,
                        items : {
                            xtype       : 'tabpanel',
                            activeTab   : 0,
                            tabPosition : 'bottom',
                            defaults    : { autoScroll : true },
                            items       : [
                                new ui.component.VCSLogGrid({
                                    layout    : 'fit',
                                    title     : phpDoc.userLang,
                                    prefix    : 'FNR-LANG',
                                    fid       : FileID,
                                    fpath     : phpDoc.userLang + FilePath,
                                    fname     : FileName,
                                    loadStore : phpDoc.userConf["reviewedDisplaylog"]
                                }), new ui.component.VCSLogGrid({
                                    layout    : 'fit',
                                    title     : 'en',
                                    prefix    : 'FNR-EN',
                                    fid       : FileID,
                                    fpath     : 'en' + FilePath,
                                    fname     : FileName,
                                    loadStore : phpDoc.userConf["reviewedDisplaylog"]
                                })
                            ]
                        }
                    }, new ui.component.FilePanel(
                    {
                        id             : 'FNR-LANG-PANEL-' + FileID,
                        region         : 'center',
                        title          : String.format(_('{0} File: '), phpDoc.userLang) + FilePath + FileName,
                        prefix         : 'FNR',
                        ftype          : 'LANG',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : phpDoc.userLang,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScrollCB   : true,
                        syncScroll     : true,
                        syncScrollConf : 'reviewedScrollbars'
                    }), new ui.component.FilePanel(
                    {
                        id             : 'FNR-EN-PANEL-' + FileID,
                        region         : 'east',
                        width          : 575,
                        title          : _('en File: ') + FilePath + FileName,
                        prefix         : 'FNR',
                        ftype          : 'EN',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : 'en',
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScroll     : true,
                        syncScrollConf : 'reviewedScrollbars'
                    })
                ]
            });
            Ext.getCmp('main-panel').setActiveTab('FNR-' + FileID);

        } else {
            // This tab already exist. We focus it.
            Ext.getCmp('main-panel').setActiveTab('FNR-' + FileID);
        }

    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : new ui.component._PendingReviewGrid.store({
                proxy : new Ext.data.HttpProxy({
                    url : './do/getFilesNeedReviewed'
                })
            }),
            tbar : [
                _('Filter: '), ' ',
                new Ext.form.TwinTriggerField({
                    id              : 'FNR-filter',
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class : 'x-form-clear-trigger',
                    trigger2Class : 'x-form-search-trigger',
                    listeners : {
                        keypress : function(field, e)
                        {
                            if (e.getKey() == e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click : function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        ui.component._PendingReviewGrid.instance.store.clearFilter();
                    },
                    onTrigger2Click : function()
                    {
                        var v = this.getValue();

                        if( v === '' || v.length < 3) {
                            this.markInvalid(
                                _('Your filter must contain at least 3 characters')
                            );
                            return;
                        }
                        this.clearInvalid();
                        this.triggers[0].show();
                        ui.component._PendingReviewGrid.instance.store.filter('maintainer', v);
                    }
                })
            ]
        });
        ui.component.PendingReviewGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._PendingReviewGrid.instance = null;
ui.component.PendingReviewGrid.getInstance = function(config)
{
    if (!ui.component._PendingReviewGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PendingReviewGrid.instance = new ui.component.PendingReviewGrid(config);
    }
    return ui.component._PendingReviewGrid.instance;
};
