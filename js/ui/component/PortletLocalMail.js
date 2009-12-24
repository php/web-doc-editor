Ext.namespace('ui','ui.component','ui.component._PortletLocalMail');

//------------------------------------------------------------------------------
// PortletLocalMail internals

// Store : Mailing with Informations about phpdoc-LANG mailing
ui.component._PortletLocalMail.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getLastNews'
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
                name    : 'title',
                mapping : 'title'
            }, {
                name    : 'link',
                mapping : 'link'
            }, {
                name    : 'description',
                mapping : 'description'
            }, {
                name       : 'pubDate',
                mapping    : 'pubDate',
                type       : 'date',
                dateFormat : 'Y/m/d H:i:s'
            }
        ])
    )
});
ui.component._PortletLocalMail.store.setDefaultSort('pubDate', 'desc');

// PortletLocalMail columns definition
ui.component._PortletLocalMail.columns = [
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
ui.component._PortletLocalMail.grid = Ext.extend(Ext.grid.GridPanel,
{
    autoHeight       : true,
    loadMask         : true,
    autoScroll       : true,
    autoExpandColumn : 'GridMailingTitle',
    id               : 'PortletLocalMail-grid-id',
    store            : ui.component._PortletLocalMail.store,
    columns          : ui.component._PortletLocalMail.columns,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    view             : new Ext.grid.GridView({
                           forceFit:true,
                           enableRowBody:true,
                           ignoreAdd: true,
                           emptyText: '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
                           deferEmptyText: false
                       }),
    listeners : {
        rowdblclick : function(grid, rowIndex, e)
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
                    iconCls    : 'home-mailing-title',
                    closable   : true,
                    layout     : 'fit',
                    items: [ new Ext.ux.IFrameComponent({ id: 'frame-mail-' + MailId, url: MailUrl }) ]
                });
                Ext.getCmp('main-panel').setActiveTab('mail-' + MailId);

            } else {
                Ext.getCmp('main-panel').setActiveTab('mail-' + MailId);
            }
        }
    },

    onContextClick : function(grid, rowIndex, e)
    {

        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-mail',
                items : [{
                    scope   : this,
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'openInTab',
                    handler : function()
                    {
                        this.fireEvent('rowdblclick', grid, this.ctxIndex, e);
                        this.menu.hide();
                    }
                }, '-', {
                    scope   : this,
                    text    : _('Refresh this grid'),
                    iconCls : 'refresh',
                    handler : function()
                    {
                        this.ctxIndex = null;
                        ui.component._PortletLocalMail.reloadData();
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
        ui.component._PortletLocalMail.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
    }
});

ui.component._PortletLocalMail.reloadData = function() {
    ui.component._PortletLocalMail.store.reload({
        callback: function(r,o,success) {
          if( !success ) {
              Ext.getCmp('PortletLocalMail-grid-id').getView().mainBody.update('<div id="PortletLocalMail-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">' + _('Error when loading mails from this mailing list !') + '</div>');
              Ext.get('PortletLocalMail-grid-defaultMess-id').highlight();

          }
        }
    });
};

//------------------------------------------------------------------------------
// PortletLocalMail
ui.component.PortletLocalMail = Ext.extend(Ext.ux.Portlet,
{
    title   : '',
    iconCls : 'home-mailing-title',
    layout  : 'fit',
    store   : ui.component._PortletLocalMail.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this grid'),
        handler: function() {
            phpDoc.notification();
            ui.component._PortletLocalMail.reloadData();
        }
    }],
    initComponent: function(config) {

        ui.component.PortletLocalMail.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.title = String.format(_('Mails from {0}'), 'doc-' + this.lang);
        this.add(new ui.component._PortletLocalMail.grid());

    }
});

// singleton
ui.component._PortletLocalMail.instance = null;
ui.component.PortletLocalMail.getInstance = function(config)
{
    if (!ui.component._PortletLocalMail.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletLocalMail.instance = new ui.component.PortletLocalMail(config);
    }
    return ui.component._PortletLocalMail.instance;
};
