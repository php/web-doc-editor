Ext.namespace('ui','ui.cmp','ui.cmp._PortletLocalMail');

//------------------------------------------------------------------------------
// PortletLocalMail internals

// Store : Mailing with Informations about phpdoc-LANG mailing
ui.cmp._PortletLocalMail.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getLastNews'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'title'},
            {name : 'link'},
            {name : 'description'},
            {name : 'pubDate', type : 'date',dateFormat : 'Y/m/d H:i:s' }
        ]

    })
});
ui.cmp._PortletLocalMail.store.setDefaultSort('pubDate', 'desc');

// PortletLocalMail columns definition
ui.cmp._PortletLocalMail.columns = [
    new Ext.grid.RowNumberer(), {
        id        : 'GridMailingTitle',
        header    : _('Title'),
        sortable  : true,
        dataIndex : 'title'
    }, {
        header    : _('By'),
        width     : 100,
        sortable  : true,
        dataIndex : 'description'
    }, {
        header    : _('Date'),
        width     : 100,
        sortable  : true,
        dataIndex : 'pubDate',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// _PortletLocalMail
ui.cmp._PortletLocalMail.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    height           : 250,
    autoExpandColumn : 'GridMailingTitle',
    id               : 'PortletLocalMail-grid-id',
    store            : ui.cmp._PortletLocalMail.store,
    columns          : ui.cmp._PortletLocalMail.columns,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    view             : new Ext.grid.GridView({
                           forceFit:true,
                           enableRowBody:true,
                           ignoreAdd: true,
                           emptyText: '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
                           deferEmptyText: false
                       }),

    onRowDblClick : function(grid, rowIndex)
    {
        var MailId    = grid.store.getAt(rowIndex).data.pubDate,
            MailUrl   = grid.store.getAt(rowIndex).data.link,
            MailTitle = grid.store.getAt(rowIndex).data.title;

        if (!Ext.getCmp('main-panel').findById('mail-' + MailId)) {

            Ext.getCmp('main-panel').add({
                xtype      : 'panel',
                id         : 'mail-' + MailId,
                title      : Ext.util.Format.substr(MailTitle, 0, 20) + '...',
                tabTip     : MailTitle,
                iconCls    : 'iconMailing',
                closable   : true,
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-mail-' + MailId, url: MailUrl }) ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('mail-' + MailId);
    },

    onContextClick : function(grid, rowIndex, e)
    {
        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-mail',
                items : [{
                    scope   : this,
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'iconOpenInTab',
                    handler : function()
                    {
                        this.fireEvent('rowdblclick', grid, this.ctxIndex, e);
                        this.menu.hide();
                    }
                }, '-', {
                    scope   : this,
                    text    : _('Refresh this grid'),
                    iconCls : 'iconRefresh',
                    handler : function()
                    {
                        this.ctxIndex = null;
                        ui.cmp._PortletLocalMail.reloadData();
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if(this.ctxIndex){
            this.ctxIndex = null;
        }

        this.ctxIndex = rowIndex;
        this.menu.showAt(e.getXY());

    },

    initComponent : function(config)
    {
        ui.cmp._PortletLocalMail.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

ui.cmp._PortletLocalMail.reloadData = function() {
    ui.cmp._PortletLocalMail.store.reload({
        callback: function(r,o,s) {
          if( !s ) {
              Ext.getCmp('PortletLocalMail-grid-id').getView().mainBody.update('<div id="PortletLocalMail-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">' + _('Error when loading mails from this mailing list !') + '</div>');
              Ext.get('PortletLocalMail-grid-defaultMess-id').highlight();

          }
        }
    });
};

//------------------------------------------------------------------------------
// PortletLocalMail
ui.cmp.PortletLocalMail = Ext.extend(Ext.ux.Portlet,
{
    title      : '',
    iconCls    : 'iconMailing',
    layout     : 'fit',
    store      : ui.cmp._PortletLocalMail.store,
    reloadData : ui.cmp._PortletLocalMail.reloadData,
    tools      : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletLocalMail.reloadData();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletLocalMailCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletLocalMailCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletLocalMailCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        this.id = 'portletLocalMail';

        Ext.apply(this, config);
        ui.cmp.PortletLocalMail.superclass.initComponent.apply(this);

        this.title = String.format(_('Mail from {0}'), 'doc-' + this.lang);
        this.add(new ui.cmp._PortletLocalMail.grid());
    }
});

// singleton
ui.cmp._PortletLocalMail.instance = null;
ui.cmp.PortletLocalMail.getInstance = function(config)
{
    if (!ui.cmp._PortletLocalMail.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletLocalMail.instance = new ui.cmp.PortletLocalMail(config);
    }
    return ui.cmp._PortletLocalMail.instance;
};
