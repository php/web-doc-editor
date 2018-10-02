Ext.namespace('ui','ui.cmp','ui.cmp._PortletSummary');

//------------------------------------------------------------------------------
// PortletSummary Internals

// Store : storeSummary with Informations like Revcheck second table
ui.cmp._PortletSummary.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getSummaryInfo'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'libel'},
            {name : 'nbFiles'},
            {name : 'percentFiles'},
            {name : 'sizeFiles'},
            {name : 'percentSize'}
        ]
    }),
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
ui.cmp._PortletSummary.gridColumns = [
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
ui.cmp._PortletSummary.gridView = new Ext.grid.GridView({
    getRowClass : function(r)
    {
        switch (r.data.id) {
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
ui.cmp._PortletSummary.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask   : true,
    autoScroll : true,
    autoHeight : true,
    store      : ui.cmp._PortletSummary.store,
    columns    : ui.cmp._PortletSummary.gridColumns,
    view       : ui.cmp._PortletSummary.gridView,

    onRowdblclick : function ( grid, rowIndex )
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
        ui.cmp._PortletSummary.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.on('rowdblclick', this.onRowdblclick, this);
    }
});

//------------------------------------------------------------------------------
// PortletSummary
ui.cmp.PortletSummary = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Summary'),
    iconCls : '',
    layout  : 'fit',
    store   : ui.cmp._PortletSummary.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletSummary.store.reload();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletSummaryCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletSummaryCollapsed',
                    value : true,
                    notify: false
                });
            }
        }
    },

    initComponent : function(config)
    {
        this.id = 'portletSummary';

        Ext.apply(this, config);
        ui.cmp.PortletSummary.superclass.initComponent.apply(this);

        this.add(new ui.cmp._PortletSummary.grid());

    },

    afterRender : function()
    {
        ui.cmp.PortletSummary.superclass.afterRender.call(this);
        var countries = { cs: 'cz', sr: 'rs', sv: 'se' }; // copied from ui.cmp._BuildStatus.rendererLanguage

        this.header.insertFirst({
            tag   : 'div',
            id    : Ext.id(),
            style : 'float: left; margin-right: 2px;',
            cls   : 'flags flag-'+(countries[this.lang] || this.lang)
        }, 'first');

        if( PhDOE.user.conf.portletSummaryCollapsed ) {
            this.collapse();
        } else {
            this.expand();
        }
    }
});

// singleton
ui.cmp._PortletSummary.instance = null;
ui.cmp.PortletSummary.getInstance = function(config)
{
    if (!ui.cmp._PortletSummary.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletSummary.instance = new ui.cmp.PortletSummary(config);
    }
    return ui.cmp._PortletSummary.instance;
};
