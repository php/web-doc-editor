Ext.namespace('ui','ui.component','ui.component._PortletInfo');

//------------------------------------------------------------------------------
// PortletInfo Internals

// Store : storeInfo
ui.component._PortletInfo.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getInfos'
    }),
    baseParams : {
        start:0,
        limit:10
    },
    autoLoad: true,
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
                name    : 'field',
                mapping : 'field'
            }, {
                name    : 'value',
                mapping : 'value'
            }, {
                name    : 'date',
                mapping : 'date'
            }
        ])
    )
});
ui.component._PortletInfo.store.setDefaultSort('date', 'desc');

// PortletInfo cell renderer for type column
ui.component._PortletInfo.typeRenderer = function(value, md, record)
{
    switch (value) {
        case 'logout' :
            return record.data.value.user + ' is log out';
        break;

        case 'login' :
            return record.data.value.user + ' is log in !';
        break;

    }
};

// PortletInfo grid's columns definition
ui.component._PortletInfo.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id        : 'Type',
        header    : _('Type'),
        width     : 180,
        sortable  : true,
        dataIndex : 'field',
        renderer  : ui.component._PortletInfo.typeRenderer
    }, {
        header    : _('Date'),
        width     : 110,
        sortable  : true,
        dataIndex : 'date'
    }
];

//------------------------------------------------------------------------------
// PortletInfo grid
ui.component._PortletInfo.grid = Ext.extend(Ext.grid.GridPanel,
{
    autoExpandColumn : 'Type',
    loadMask   : true,
    autoScroll : true,
    autoHeight : true,
    store      : ui.component._PortletInfo.store,
    columns    : ui.component._PortletInfo.gridColumns,
    view       : ui.component._PortletInfo.gridView,

    initComponent: function(config)
    {
        
        Ext.apply(this, {
            bbar: new Ext.PagingToolbar({
                pageSize: 10,
                store: this.store,
                displayInfo: true
            })
        });
        
        ui.component._PortletInfo.grid.superclass.initComponent.call(this);
        
        this.on('rowdblclick', this.onRowdblclick, this);
    }
});

//------------------------------------------------------------------------------
// PortletInfo
ui.component.PortletInfo = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Info'),
    iconCls : '',
    layout  : 'fit',
    store   : ui.component._PortletInfo.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this grid'),
        handler: function() {
            ui.component._PortletInfo.store.reload();
        }
    }],

    initComponent: function(config)
    {
        ui.component.PortletInfo.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.add(new ui.component._PortletInfo.grid());

    }
});

// singleton
ui.component._PortletInfo.instance = null;
ui.component.PortletInfo.getInstance = function(config)
{
    if (!ui.component._PortletInfo.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletInfo.instance = new ui.component.PortletInfo(config);
    }
    return ui.component._PortletInfo.instance;
};
