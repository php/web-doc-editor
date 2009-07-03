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
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
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
}
Ext.extend(ui.component._NotInENGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : _('Remove this file'),
                iconCls : 'iconDelete',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
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
    bodyBorder       : false,
    autoExpandColumn : 'name',
    view             : ui.component._NotInENGrid.view,
    columns          : ui.component._NotInENGrid.columns,

    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {
            grid.getSelectionModel().selectRow(rowIndex);

            if (!grid.store.getAt(rowIndex).data.needcommit) {

                new ui.component._NotInENGrid.menu({
                    grid   : grid,
                    rowIdx : rowIndex,
                    event  : e
                }).showAt(e.getXY());
            }
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var storeRecord = grid.store.getAt(rowIndex),
                FilePath    = storeRecord.data.path,
                FileName    = storeRecord.data.name;

            new ui.task.MarkDeleteTask({
                fpath       : FilePath,
                fname       : FileName,
                storeRecord : storeRecord
            });
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : new ui.component._NotInENGrid.store({
                autoLoad : (phpDoc.userLang === 'en') ? false : true,
                proxy : new Ext.data.HttpProxy({
                    url : './php/controller.php'
                }),
                baseParams : { task : 'getFilesNotInEn' }
            })
        });
        ui.component.NotInENGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._NotInENGrid.instance = null;
ui.component.NotInENGrid.getInstance = function(config)
{
    if (!ui.component._NotInENGrid.instance) {
        if (!config) config = {};
        ui.component._NotInENGrid.instance = new ui.component.NotInENGrid(config);
    }
    return ui.component._NotInENGrid.instance;
}
