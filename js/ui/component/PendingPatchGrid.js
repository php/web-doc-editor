Ext.namespace('ui','ui.component','ui.component._PendingPatchGrid');

//------------------------------------------------------------------------------
// PendingPatchGrid internals

// PendingPatchGrid store
ui.component._PendingPatchGrid.store = Ext.extend(Ext.data.GroupingStore,
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
                name    : 'by',
                mapping : 'by'
            }, {
                name    : 'uniqID',
                mapping : 'uniqID'
            }, {
                name       : 'date',
                mapping    : 'date',
                type       : 'date',
                dateFormat : 'Y-m-d H:i:s'
            }
        ])
    ),
    sortInfo : {
        field     : 'name',
        direction : "ASC"
    },
    groupField : 'path',
    listeners : {
        add : function(ds)
        {
            Ext.getDom('acc-pendingPatch-nb').innerHTML = ds.getCount();
        },
        datachanged : function(ds)
        {
            Ext.getDom('acc-pendingPatch-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingPatchGrid columns definition
ui.component._PendingPatchGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Posted by'),
    width     : 45,
    sortable  : true,
    dataIndex : 'by'
}, {
    header    : _('Date'),
    width     : 45,
    sortable  : true,
    dataIndex : 'date',
    renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
}, {
    header    : _('Path'),
    dataIndex : 'path',
    'hidden'  : true
}];

// PendingPatchGrid view
ui.component._PendingPatchGrid.view = new Ext.grid.GroupingView({
    forceFit     : true,
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    emptyText    : '<div style="text-align: center;">' + _('No pending Patch') + '</div>',
    deferEmptyText: false
});

// PendingPatchGrid context menu
// config - { grid, rowIdx, event, fid, fpath, fname, fuid }
ui.component._PendingPatchGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingPatchGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingPatchGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>' + _('Edit in a new Tab') + '</b>',
                iconCls : 'PendingPatch',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }, '-', {
                scope   : this,
                text    : _('Reject this patch'),
                disabled : (phpDoc.userLogin === 'anonymous'),
                iconCls : 'iconPageDelete',
                handler : function()
                {
                    var tmp = new ui.task.RejectPatchTask({
                        fid         : this.fid,
                        fuid        : this.fuid,
                        storeRecord : this.grid.store.getAt(this.rowIdx)
                    });
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// PendingPatchGrid
ui.component.PendingPatchGrid = Ext.extend(Ext.grid.GridPanel,
{
    store            : ui.component._PendingPatchGrid.store,
    columns          : ui.component._PendingPatchGrid.columns,
    view             : ui.component._PendingPatchGrid.view,
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',

    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {

            e.stopEvent();

            var FilePath   = grid.store.getAt(rowIndex).data.path,
                FileName   = grid.store.getAt(rowIndex).data.name,
                FileUniqID = grid.store.getAt(rowIndex).data.uniqID,
                FileID     = Ext.util.md5('PP-' + FileUniqID + FilePath + FileName),
                tmp;

            grid.getSelectionModel().selectRow(rowIndex);

            tmp = new ui.component._PendingPatchGrid.menu({
                grid   : grid,
                rowIdx : rowIndex,
                event  : e,
                fid    : FileID,
                fpath  : FilePath,
                fname  : FileName,
                fuid   : FileUniqID
            }).showAt(e.getXY());
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var storeRecord = grid.store.getAt(rowIndex),
                FilePath    = storeRecord.data.path,
                FileName    = storeRecord.data.name,
                FileUniqID  = storeRecord.data.uniqID,
                FileID      = Ext.util.md5('PP-' + FileUniqID + FilePath + FileName);

            // Render only if this tab don't exist yet
            if (!Ext.getCmp('main-panel').findById('PP-' + FileID)) {

                Ext.getCmp('main-panel').add({
                    id          : 'PP-' + FileID,
                    layout      : 'border',
                    iconCls     : 'PendingPatch',
                    title       : FileName,
                    originTitle : FileName,
                    tabTip      : String.format(_('Patch for {0}'), FilePath + FileName),
                    closable    : true,
                    defaults    : { split : true },
                    items       : [
                        {
                            xtype       : 'panel',
                            id          : 'PP-patch-desc-' + FileID,
                            title       : _('Patch content'),
                            layout      : 'fit',
                            region      : 'north',
                            border      : false,
                            height      : 250,
                            autoScroll  : true,
                            collapsible : true,
                            collapsed   : true,
                            html        : '<div id="diff_content_' + FileID + '" class="diff-content"></div>',
                            listeners   : {
                                render : function()
                                {
                                    // Load diff data
                                    XHR({
                                        params  : {
                                            task     : 'getDiff',
                                            FilePath : FilePath,
                                            FileName : FileName,
                                            type     : 'patch',
                                            uniqID   : FileUniqID
                                        },
                                        success : function(response)
                                        {
                                            var o = Ext.util.JSON.decode(response.responseText);
                                            // We display in diff div
                                            Ext.get('diff_content_' + FileID).dom.innerHTML = o.content;
                                        }
                                    });
                                }
                            }
                        }, {
                            region      : 'west',
                            xtype       : 'panel',
                            title       : _('VCSLog'),
                            layout      : 'fit',
                            bodyBorder  : false,
                            collapsible : true,
                            collapsed   : true,
                            width       : 375,
                            items       : {
                                xtype       : 'tabpanel',
                                activeTab   : 0,
                                tabPosition : 'bottom',
                                defaults    : { autoScroll : true },
                                items       : new ui.component.VCSLogGrid({
                                    layout    : 'fit',
                                    title     : _('Log'),
                                    prefix    : 'PP',
                                    fid       : FileID,
                                    fpath     : FilePath,
                                    fname     : FileName,
                                    loadStore : phpDoc.userConf["patchDisplayLog"]
                                })
                            }
                        }, new ui.component.FilePanel(
                        {
                            id             : 'PP-PATCH-PANEL-' + FileID,
                            region         : 'center',
                            title          : String.format(_('Proposed Patch for {0}'), FilePath + FileName),
                            prefix         : 'PP',
                            ftype          : 'PATCH',
                            fid            : FileID,
                            fpath          : FilePath,
                            fname          : FileName,
                            isPatch        : true,
                            fuid           : FileUniqID,
                            parser         : 'xml',
                            storeRecord    : storeRecord,
                            syncScrollCB   : true,
                            syncScroll     : true,
                            syncScrollConf : 'patchScrollbars'
                        }), new ui.component.FilePanel(
                        {
                            id             : 'PP-ORIGIN-PANEL-' + FileID,
                            region         : 'east',
                            width          : 575,
                            title          : _('Original File: ') + FilePath + FileName,
                            prefix         : 'PP',
                            ftype          : 'ORIGIN',
                            fid            : FileID,
                            fpath          : FilePath,
                            fname          : FileName,
                            lang           : '',
                            readOnly       : true,
                            parser         : 'xml',
                            syncScroll     : true,
                            syncScrollConf : 'patchScrollbars'
                        })
                    ]
                });

                // Set the bg image for north collapsed el
                if (Ext.getCmp('PP-' + FileID).getLayout().north.collapsedEl) {
                    Ext.getCmp('PP-' + FileID).getLayout().north.collapsedEl.addClass(
                        'x-layout-collapsed-east-patch-desc'
                    );
                }
            }
            Ext.getCmp('main-panel').setActiveTab('PP-' + FileID);
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : new ui.component._PendingPatchGrid.store({
                proxy : new Ext.data.HttpProxy({
                    url : './do/getFilesPendingPatch'
                })
            })
        });
        ui.component.PendingPatchGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._PendingPatchGrid.instance = null;
ui.component.PendingPatchGrid.getInstance = function(config)
{
    if (!ui.component._PendingPatchGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PendingPatchGrid.instance = new ui.component.PendingPatchGrid(config);
    }
    return ui.component._PendingPatchGrid.instance;
};
