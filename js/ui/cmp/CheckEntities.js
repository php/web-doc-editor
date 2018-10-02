Ext.namespace('ui','ui.cmp','ui.cmp._CheckEntities');

//------------------------------------------------------------------------------
// CheckDoc Internals

// CheckDoc Grid datastore
ui.cmp._CheckEntities.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCheckEntitiesData'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'entities'},
            {name : 'url'},
            {name : 'result'},
            {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s'}
        ]
    })
});
ui.cmp._CheckEntities.ds.setDefaultSort('entities', 'asc');

ui.cmp._CheckEntities.rendererEntities = function(value, metadata)
{
    return '&' + value + ';';
};

// CheckDoc Grid columns definition
ui.cmp._CheckEntities.columns = [
    new Ext.grid.RowNumberer(),
    {
        id        : 'entities',
        header    : _('Entities'),
        sortable  : true,
        dataIndex : 'entities',
        width     : 30,
        renderer  : ui.cmp._CheckEntities.rendererEntities
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
ui.cmp.CheckEntities = Ext.extend(Ext.grid.GridPanel,
{
    id               : 'check-entities-grid',
    loadMask         : true,
    bodyBorder       : false,
    store            : ui.cmp._CheckEntities.ds,
    columns          : ui.cmp._CheckEntities.columns,
    autoExpandColumn : 'url',
    sm               : new Ext.grid.RowSelectionModel({ singleSelect : true }),
    view             : new Ext.grid.GridView({ forceFit : true }),

    onRender: function(ct, position)
    {
        ui.cmp.CheckEntities.superclass.onRender.call(this, ct, position);
        this.store.load.defer(20, this.store);
    },

    openTab: function(rowIndex)
    {
        var storeRecord = this.store.getAt(rowIndex),
            url         = storeRecord.data.url,
            urlMd5      = Ext.util.md5(url),
            tabId       = 'tab-check-entities-'+urlMd5,
            tab         = Ext.getCmp(tabId);

        if( ! tab )
        {
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

    onRowdblclick: function(grid, rowIndex)
    {
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
        this.tbar = [{
            xtype : 'label',
            text  : _('Status: ')
        }, {
            xtype         : 'combo',
            typeAhead     : true,
            triggerAction : 'all',
            lazyRender    :true,
            mode          : 'local',
            store         : new Ext.data.ArrayStore({
                id     : 0,
                fields : [
                    'myId',
                    'displayText'
                ],
                data: [
                       ['all',                 _('All status')],
                       ['FTP_CONNECT',         'FTP_CONNECT'],
                       ['FTP_LOGIN',           'FTP_LOGIN'],
                       ['FTP_NO_FILE',         'FTP_NO_FILE'],
                       ['HTTP_CONNECT',        'HTTP_CONNECT'],
                       ['HTTP_INTERNAL_ERROR', 'HTTP_INTERNAL_ERROR'],
                       ['HTTP_NOT_FOUND',      'HTTP_NOT_FOUND'],
                       ['HTTP_MOVED',          'HTTP_MOVED'],
                       ['HTTP_WRONG_HEADER',   'HTTP_WRONG_HEADER'],
                       ['SUCCESS',             'SUCCESS'],
                       ['UNKNOWN_HOST',        'UNKNOWN_HOST']
                      ]
            }),
            value         : 'all',
            valueField    : 'myId',
            displayField  : 'displayText',
            editable      : false,
            listeners: {
                select: function(c, record) {
                    var val = record.id;

                    if( val === 'all' ) {
                        Ext.getCmp('check-entities-grid').store.clearFilter();
                    } else {
                        Ext.getCmp('check-entities-grid').store.filter('result', record.id);
                    }
                }
            }
        }];

        ui.cmp.CheckEntities.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowdblclick,  this);
    }
});
