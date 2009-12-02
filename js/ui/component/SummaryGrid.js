Ext.namespace('ui','ui.component','ui.component._SummaryGrid');

//------------------------------------------------------------------------------
// SummaryGrid Internals

// Store : storeSummary with Informations like Revcheck second table
ui.component._SummaryGrid.store = new Ext.data.Store({
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
                    case 2: record.set('libel', _('Old files'));                       break;
                    case 3: record.set('libel', _('Critical files'));                  break;
                    case 4: record.set('libel', _('Files without revision tag'));      break;
                    case 5: record.set('libel', _('Files available for translation')); break;
                    case 6: record.set('libel', _('Total'));                           break;
                    default: record.set('libel', '');                                  break;
                }
                record.commit();
            });
        }
    }
});

// SummaryGrid columns definition
ui.component._SummaryGrid.columns = [
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

// SummaryGrid gridview
ui.component._SummaryGrid.view = new Ext.grid.GridView({
    getRowClass : function(record, numIndex, rowParams, store)
    {
        switch (record.data.id) {
            case 1: return 'summary_1';
            case 2: return 'summary_2';
            case 3: return 'summary_3';
            case 4: return 'summary_4';
            case 5: return 'summary_5';
            default: return '';
        }
    }
});

//------------------------------------------------------------------------------
// SummaryGrid
ui.component.SummaryGrid = Ext.extend(Ext.grid.GridPanel,
{
    title      : _('Summary'),
    loadMask   : true,
    autoScroll : true,
    height     : 400,
    width      : 800,
    store      : ui.component._SummaryGrid.store,
    columns    : ui.component._SummaryGrid.columns,
    view       : ui.component._SummaryGrid.view,

    listeners : {
        rowdblclick : function ( grid, rowIndex, e )
        {
            var id = grid.store.getAt(rowIndex).data.id;

            // Up to date files, Old files, Criticals files
            if( id === 1 || id === 2 || id === 3) {
                Ext.getCmp('acc-need-update').expand();
            }
            
            // Available for translation
            if( id === 5 ) {
                Ext.getCmp('acc-need-translate').expand();
            }
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            iconCls : 'flag-' + phpDoc.userLang
        });
        ui.component.SummaryGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._SummaryGrid.instance = null;
ui.component.SummaryGrid.getInstance = function(config)
{
    if (!ui.component._SummaryGrid.instance) {
        if (!config) {
			config = {};
		}
        ui.component._SummaryGrid.instance = new ui.component.SummaryGrid(config);
    }
    return ui.component._SummaryGrid.instance;
};
