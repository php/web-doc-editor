Ext.namespace('ui','ui.component','ui.component._NotInENGrid');

//------------------------------------------------------------------------------
// NotInENGrid internals

// NotInENGrid store
ui.component._NotInENGrid.store = Ext.extend(Ext.data.GroupingStore,
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
                name    : 'needcommit',
                mapping : 'needcommit'
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
            Ext.getDom('acc-notInEn-nb').innerHTML = ds.getCount();
        }
    }
});

// NotInENGrid columns definition
ui.component._NotInENGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// NotInENGrid view
ui.component._NotInENGrid.view = new Ext.grid.GroupingView({
    forceFit     : true,
    startCollapsed: true,
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    deferEmptyText: false,
    emptyText    : '<div style="text-align: center;">' + _('No Files') + '</div>',
    getRowClass  : function(record, numIndex, rowParams, store)
    {
        if (record.data.needcommit) {
            return 'file-need-commit';
        }
    }
});

// NotInENGrid context menu
// config - { grid, rowIdx, event }
ui.component._NotInENGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._NotInENGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.component._NotInENGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>'+_('View in a new Tab')+'</b>',
                iconCls : 'iconView',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }, {
                scope   : this,
                text    : _('Remove this file'),
                iconCls : 'iconDelete',
                handler : function()
                {
                   var storeRecord = this.grid.store.getAt(this.rowIdx),
                       FilePath    = storeRecord.data.path,
                       FileName    = storeRecord.data.name;

                   new ui.task.MarkDeleteTask({
                       fpath       : FilePath,
                       fname       : FileName,
                       storeRecord : storeRecord
                   });
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// NotInENGrid
ui.component.NotInENGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',
    enableDragDrop   : true,
    ddGroup          : 'mainPanelDDGroup',
    view             : ui.component._NotInENGrid.view,
    columns          : ui.component._NotInENGrid.columns,

    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
    
        grid.getSelectionModel().selectRow(rowIndex);

        if (!grid.store.getAt(rowIndex).data.needcommit)
        {
            new ui.component._NotInENGrid.menu({
                grid   : grid,
                rowIdx : rowIndex,
                event  : e
            }).showAt(e.getXY());
        }
    },

    onRowDblClick: function(grid, rowIndex, e)
    {
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },

    openFile: function(rowId)
    {
        var storeRecord = this.store.getById(rowId),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileID      = Ext.util.md5('FNIEN-' + PhDOE.userLang + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNIEN-' + FileID))
        {
            Ext.getCmp('main-panel').add(
            {
                id             : 'FNIEN-' + FileID,
                layout         : 'border',
                title          : FileName,
                originTitle    : FileName,
                iconCls        : 'iconTabView',
                closable       : true,
                panLANGLoaded  : false, // Use to monitor if the LANG panel is loaded
                defaults       : { split : true },
                tabTip         : String.format(
                    _('Not In EN: in {0}'), FilePath
                ),
                items : [
                   new ui.component.FilePanel(
                    {
                        id             : 'FNIEN-NotInEN-PANEL-' + FileID,
                        region         : 'center',
                        title          : _('File: ') + FilePath + FileName,
                        prefix         : 'FNIEN',
                        ftype          : 'NotInEN',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        readOnly       : true,
                        lang           : PhDOE.userLang,
                        parser         : 'xml',
                        storeRecord    : '',
                        syncScroll     : false
                    })
                ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNIEN-' + FileID);
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : new ui.component._NotInENGrid.store({
                proxy : new Ext.data.HttpProxy({
                    url : './do/getFilesNotInEn'
                })
            })
        });
        ui.component.NotInENGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

// singleton
ui.component._NotInENGrid.instance = null;
ui.component.NotInENGrid.getInstance = function(config)
{
    if (!ui.component._NotInENGrid.instance) {
        if (!config) {
           config = {};
        }
        ui.component._NotInENGrid.instance = new ui.component.NotInENGrid(config);
    }
    return ui.component._NotInENGrid.instance;
};
