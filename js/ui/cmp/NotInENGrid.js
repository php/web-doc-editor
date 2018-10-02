Ext.namespace('ui','ui.cmp','ui.cmp._NotInENGrid');

//------------------------------------------------------------------------------
// NotInENGrid internals

// NotInENGrid store
ui.cmp._NotInENGrid.store = new Ext.data.GroupingStore(
{
    proxy : new Ext.data.HttpProxy({
        url : './do/getFilesNotInEn'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'name'},
            {name : 'fileModified'}
        ]
    }),
    sortInfo : {
        field     : 'path',
        direction : 'ASC'
    },
    groupField : 'path',
    listeners  : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-notInEn-nb').innerHTML = ds.getCount();
        }
    }
});

// NotInENGrid columns definition
ui.cmp._NotInENGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name',
    renderer  : function(v, m, r)
    {
        if( r.data.fileModified ) {

            var info = Ext.util.JSON.decode(r.data.fileModified);

            if(info.user === PhDOE.user.login && info.anonymousIdent === PhDOE.user.anonymousIdent) {
                return "<span ext:qtip='" + _('File removed by me') + "'>" + v + "</span>";
            } else {
                return "<span ext:qtip='" + String.format(_('File removed by {0}'), info.user) + "'>" + v + "</span>";
            }
        } else {
            return v;
        }
    }
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// NotInENGrid view
ui.cmp._NotInENGrid.view = new Ext.grid.GroupingView({
    forceFit      : true,
    startCollapsed: true,
    groupTextTpl  : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    deferEmptyText: false,
    emptyText     : '<div style="text-align: center;">' + _('No Files') + '</div>',
    getRowClass   : function(r)
    {
        if ( r.data.fileModified ) {

            var info = Ext.util.JSON.decode(r.data.fileModified);

            return (info.user === PhDOE.user.login && info.anonymousIdent === PhDOE.user.anonymousIdent) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }
        return false;
    }
});

// NotInENGrid context menu
// config - { grid, rowIdx, event }
ui.cmp._NotInENGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._NotInENGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._NotInENGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>'+_('View in a new tab')+'</b>',
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
                hidden  : ( this.grid.store.getAt(this.rowIdx).data.fileModified ),
                iconCls : 'iconTrash',
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
ui.cmp.NotInENGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',
    enableDragDrop   : true,
    ddGroup          : 'mainPanelDDGroup',
    view             : ui.cmp._NotInENGrid.view,
    columns          : ui.cmp._NotInENGrid.columns,

    onRowContextMenu : function(grid, rowIndex, e)
    {
        e.stopEvent();

        grid.getSelectionModel().selectRow(rowIndex);

        new ui.cmp._NotInENGrid.menu({
            grid   : grid,
            rowIdx : rowIndex,
            event  : e
        }).showAt(e.getXY());
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
            FileID      = Ext.util.md5('FNIEN-' + PhDOE.user.lang + FilePath + FileName);

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
                tabLoaded      : false,
                panLANGLoaded  : false, // Use to monitor if the LANG panel is loaded
                defaults       : { split : true },
                tabTip         : String.format(
                    _('Not In EN: in {0}'), FilePath
                ),
                items : [
                   new ui.cmp.FilePanel(
                    {
                        id             : 'FNIEN-NotInEN-PANEL-' + FileID,
                        region         : 'center',
                        title          : _('File: ') + FilePath + FileName,
                        prefix         : 'FNIEN',
                        ftype          : 'NotInEN',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        original       : true,
                        readOnly       : true,
                        lang           : PhDOE.user.lang,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
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
            store : ui.cmp._NotInENGrid.store
        });
        ui.cmp.NotInENGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

// singleton
ui.cmp._NotInENGrid.instance = null;
ui.cmp.NotInENGrid.getInstance = function(config)
{
    if (!ui.cmp._NotInENGrid.instance) {
        if (!config) {
           config = {};
        }
        ui.cmp._NotInENGrid.instance = new ui.cmp.NotInENGrid(config);
    }
    return ui.cmp._NotInENGrid.instance;
};
