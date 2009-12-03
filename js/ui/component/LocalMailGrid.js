Ext.namespace('ui','ui.component','ui.component._LocalMailGrid');

//------------------------------------------------------------------------------
// LocalMailGrid internals

// Store : Mailing with Informations about phpdoc-LANG mailing
ui.component._LocalMailGrid.store = new Ext.data.Store({
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
ui.component._LocalMailGrid.store.setDefaultSort('pubDate', 'desc');

// LocalMailGrid columns definition
ui.component._LocalMailGrid.columns = [
    new Ext.grid.RowNumberer(), {
        id        : 'GridMailingTitle',
        header    : _('Title'),
        sortable  : true,
        dataIndex : 'title'
    }, {
        header    : _('By'),
        width     : 110,
        sortable  : true,
        dataIndex : 'description'
    }, {
        header    : _('Date'),
        width     : 140,
        sortable  : true,
        dataIndex : 'pubDate',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// LocalMailGrid
ui.component.LocalMailGrid = Ext.extend(Ext.grid.GridPanel,
{
    iconCls          : 'home-mailing-title',
    height           : 400,
    width            : 800,
    loadMask         : true,
    autoScroll       : true,
    autoExpandColumn : 'GridMailingTitle',
    store            : ui.component._LocalMailGrid.store,
    columns          : ui.component._LocalMailGrid.columns,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {

            e.stopEvent();
        
            grid.getSelectionModel().selectRow(rowIndex);

            var tmp = new Ext.menu.Menu({
                id    : 'submenu',
                items : [{
                    text    : '<b>'+_('Open in a new Tab')+'</b>',
                    iconCls : 'openInTab',
                    handler : function()
                    {
                        grid.fireEvent('rowdblclick', grid, rowIndex, e);
                    }
                }, '-', {
                    text    : _('Refresh this grid'),
                    iconCls : 'refresh',
                    handler : function()
                    {
                        grid.store.reload();
                    }
                }]
            }).showAt(e.getXY());
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var MailId    = grid.store.getAt(rowIndex).data.pubDate,
                MailUrl   = grid.store.getAt(rowIndex).data.link,
                MailTitle = grid.store.getAt(rowIndex).data.title;

            Ext.getCmp('main-panel').add({
                xtype      : 'iframepanel',
                id         : 'mifp_' + MailId,
                title      : _('Loading...'),
                tabTip     : MailTitle,
                iconCls    : 'home-mailing-title',
                loadMask   : true,
                defaultSrc : MailUrl,
                listeners : {
                    documentloaded : function(frame)
                    {
                        frame.ownerCt.setTitle(
                            Ext.util.Format.substr(MailTitle, 0, 20) + '...'
                        );
                    }
                }
            });
            Ext.getCmp('main-panel').setActiveTab('mifp_' + MailId);
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            title : String.format(_('Mails from {0}'), 'doc-' + phpDoc.userLang),
            tbar : [{
				scope: this,
                tooltip : _('Refresh this grid'),
                iconCls : 'refresh',
                handler : function()
                {
					this.store.reload();
                }
            }]
        });
        ui.component.LocalMailGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._LocalMailGrid.instance = null;
ui.component.LocalMailGrid.getInstance = function(config)
{
    if (!ui.component._LocalMailGrid.instance) {
        if (!config) {
			config = {};
		}
        ui.component._LocalMailGrid.instance = new ui.component.LocalMailGrid(config);
    }
    return ui.component._LocalMailGrid.instance;
};
