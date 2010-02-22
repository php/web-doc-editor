
Ext.namespace('ui','ui.component','ui.component._PortletSummary');

//------------------------------------------------------------------------------
// PortletSummary Internals

// Store : storeSummary with Informations like Revcheck second table
ui.component._PortletSummary.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getSummaryInfo'
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
                name    : 'libel',
                mapping : 'libel'
            }, {
                name    : 'nbFiles',
                mapping : 'nbFiles'
            }, {
                name    : 'percentFiles',
                mapping : 'percentFiles'
            }, {
                name    : 'sizeFiles',
                mapping : 'sizeFiles'
            }, {
                name    : 'percentSize',
                mapping : 'percentSize'
            }
        ])
    ),
    listeners : {
        load : function()
        {
            this.each(function(record)
            {
                switch (record.id) {
                    case 1: record.set('libel', _('Up to date files'));                break;
                    case 2: record.set('libel', _('Stale files'));                     break;
                    case 3: record.set('libel', _('Files available for translation')); break;
                    case 4: record.set('libel', _('Total'));                           break;
                    default: record.set('libel', '');                                  break;
                }
                record.commit();
            });
        }
    }
});

// PortletSummary grid's columns definition
ui.component._PortletSummary.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id        : 'StatusType',
        header    : _('File status type'),
        width     : 180,
        sortable  : true,
        dataIndex : 'libel'
    }, {
        header    : _('Number of files'),
        width     : 110,
        sortable  : true,
        dataIndex : 'nbFiles'
    }, {
        header    : _('Percent of files'),
        width     : 110,
        sortable  : true,
        dataIndex : 'percentFiles'
    }, {
        header    : _('Size of files (kB)'),
        width     : 110,
        sortable  : true,
        dataIndex : 'sizeFiles'
    }, {
        header    : _('Percent of size'),
        width     : 110,
        sortable  : true,
        dataIndex : 'percentSize'
    }
];

// PortletSummary gridview
ui.component._PortletSummary.gridView = new Ext.grid.GridView({
    getRowClass : function(record, numIndex, rowParams, store)
    {
        switch (record.data.id) {
            case 1: return 'summary_1';
            case 2: return 'summary_2';
            case 3: return 'summary_3';
            case 4: return 'summary_4';
            default: return '';
        }
    }
});

//------------------------------------------------------------------------------
// PortletSummary grid
ui.component._PortletSummary.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask   : true,
    autoScroll : true,
    autoHeight : true,
    store      : ui.component._PortletSummary.store,
    columns    : ui.component._PortletSummary.gridColumns,
    view       : ui.component._PortletSummary.gridView,

    onRowdblclick : function ( grid, rowIndex, e )
    {
        var id = grid.store.getAt(rowIndex).data.id;

        // Stales files
        if( id === 2 ) {
            Ext.getCmp('acc-need-update').expand();
        }
        
        // Available for translation
        if( id === 3 ) {
            Ext.getCmp('acc-need-translate').expand();
        }
    },
    initComponent: function(config)
    {
        ui.component._PortletSummary.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.on('rowdblclick',    this.onRowdblclick,  this);
    }
});

//------------------------------------------------------------------------------
// PortletSummary
ui.component.PortletSummary = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Summary'),
    iconCls : '',
    layout  : 'fit',
    store   : ui.component._PortletSummary.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this grid'),
        handler: function() {
            ui.component._PortletSummary.store.reload();
        }
    }],
    initComponent: function(config) {

        ui.component.PortletSummary.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.add(new ui.component._PortletSummary.grid());

    },

    afterRender: function() {

        ui.component.PortletSummary.superclass.afterRender.call(this);

        this.header.insertFirst({
            tag   : 'div',
            id    : Ext.id(),
            style : 'float: left; margin-right: 2px;',
            cls   : 'flags flag-'+this.lang,
        }, 'first');

    }

});

// singleton
ui.component._PortletSummary.instance = null;
ui.component.PortletSummary.getInstance = function(config)
{
    if (!ui.component._PortletSummary.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletSummary.instance = new ui.component.PortletSummary(config);
    }
    return ui.component._PortletSummary.instance;
};
