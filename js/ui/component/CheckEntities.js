Ext.namespace('ui','ui.component','ui.component._CheckEntities');

//------------------------------------------------------------------------------
// CheckDoc Internals

// CheckDoc Grid datastore
ui.component._CheckEntities.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCheckEntitiesData'
    }),
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
                name    : 'entities',
                mapping : 'entities'
            }, {
                name    : 'url',
                mapping : 'url'
            }, {
                name    : 'result',
                mapping : 'result'
            }, {
                name    : 'date',
                mapping : 'date',
                type       : 'date',
                dateFormat : 'Y-m-d H:i:s'
            }
        ])
    )
});
ui.component._CheckEntities.ds.setDefaultSort('entities', 'asc');

ui.component._CheckEntities.rendererEntities = function(value, metadata)
{
    return '&' + value + ';';
};

// CheckDoc Grid columns definition
ui.component._CheckEntities.columns = [
    new Ext.grid.RowNumberer(), 
    {
        id        : 'entities',
        header    : _('Entities'),
        sortable  : true,
        dataIndex : 'entities',
        width     : 30,
        renderer  : ui.component._CheckEntities.rendererEntities
    }, {
        header    : _('Url'),
        sortable  : true,
        dataIndex : 'url'
    }, {
        header    : _('Result'),
        width     : 30,
        sortable  : true,
        dataIndex : 'result'
    }, {
        header    : _('Date'),
        width     : 30,
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// CheckDoc Grid
ui.component.CheckEntities = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    store            : ui.component._CheckEntities.ds,
    columns          : ui.component._CheckEntities.columns,
    autoExpandColumn : 'url',
    sm               : new Ext.grid.RowSelectionModel({ singleSelect : true }),
    view             : new Ext.grid.GridView({ forceFit : true }),

    listeners: {
        render: function() {
            this.store.load.defer(20, this.store);
        }
    },

    openTab: function(rowIndex) {

        var storeRecord = this.store.getAt(rowIndex),
            url         = storeRecord.data.url;
            urlMd5      = Ext.util.md5(url),
            tabId       = 'tab-check-entities-'+urlMd5,
            tab         = Ext.getCmp(tabId);

        if( ! tab ) {

            Ext.getCmp('main-panel').add({
                id         : tabId,
                xtype      : 'panel',
                title      : Ext.util.Format.ellipsis(url,20),
                tabTip     : url,
                iconCls    : 'iconCheckEntities',
                closable   : true,
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-'+tabId, url: url }) ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab(tabId);

    },

    onRowdblclick: function(grid, rowIndex, e) {
        this.openTab(rowIndex);
    },

    onContextClick: function(grid, rowIndex, e)
    {

        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-checkentities',
                items : [{
                    scope   : this,
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'iconOpenInTab',
                    handler : function()
                    {
                        this.openTab(this.ctxRowIndex);
                        this.menu.hide();
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if( this.ctxRowIndex ) {
            this.ctxRowIndex  = null;
        }
        this.ctxRowIndex  = rowIndex;

        this.menu.showAt(e.getXY());


    },

    initComponent: function(config)
    {
        ui.component.CheckEntities.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowdblclick',    this.onRowdblclick,  this);
        this.on('rowcontextmenu', this.onContextClick, this);
    }
});
