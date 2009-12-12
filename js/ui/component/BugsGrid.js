Ext.namespace('ui','ui.component','ui.component._BugsGrid');

//------------------------------------------------------------------------------
// BugsGrid internals

// Store : All open bugs for documentation
ui.component._BugsGrid.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getOpenBugs'
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
            }
        ])
    )
});

// BugsGrid columns definition
ui.component._BugsGrid.columns = [{
    id        : 'GridBugTitle',
    header    : "Title",
    sortable  : true,
    dataIndex : 'title'
}];

ui.component._BugsGrid.view = new Ext.grid.GridView({
    forceFit      : true,
    emptyText     : _('No open Bugs'),
    enableRowBody : true,
    getRowClass   : function(record, rowIndex, p, store)
    {
        p.body = '<p class="bug-desc">' + record.data.description + '</p>';
        return 'x-grid3-row-expanded';
    }
});

//------------------------------------------------------------------------------
// BugsGrid
ui.component.BugsGrid = Ext.extend(Ext.grid.GridPanel,
{
    iconCls          : 'iconBugs',
    loadMask         : true,
    stripeRows       : true,
    autoScroll       : true,
    width            : 800,
    autoExpandColumn : 'GridBugTitle',
    store            : ui.component._BugsGrid.store,
    columns          : ui.component._BugsGrid.columns,
    view             : ui.component._BugsGrid.view,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    listeners : {
        render : function(grid)
        {
            grid.store.load.defer(20, grid.store);
        },
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
            var BugsId    = grid.store.getAt(rowIndex).data.id,
                BugsUrl   = grid.store.getAt(rowIndex).data.link,
                BugsTitle = grid.store.getAt(rowIndex).data.title;

            if (!Ext.getCmp('main-panel').findById('mifp_bugs_' + BugsId)) {

                Ext.getCmp('main-panel').add({
                    id         : 'mifp_bugs_' + BugsId,
                    xtype      : 'iframepanel',
                    title      : _('Loading...'),
                    tabTip     : BugsTitle,
                    iconCls    : 'iconBugs',
                    loadMask   : true,
                    defaultSrc : BugsUrl,
                    listeners : {
                        documentloaded : function(frame)
                        {
                            frame.ownerCt.setTitle(Ext.util.Format.substr(BugsTitle, 0, 20) + '...');
                        }
                    }
                });
                Ext.getCmp('main-panel').setActiveTab('mifp_bugs_' + BugsId);

            } else {
                Ext.getCmp('main-panel').setActiveTab('mifp_bugs_' + BugsId);
            }
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            title : String.format(_('Open bugs for {0}'), 'doc-' + phpDoc.userLang),
            tbar  : [{
                scope: this,
                tooltip : _('Refresh this grid'),
                iconCls : 'refresh',
                handler : function()
                {
                    this.store.reload();
                }
            }]
        });
        ui.component.BugsGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._BugsGrid.instance = null;
ui.component.BugsGrid.getInstance = function(config)
{
    if (!ui.component._BugsGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.component._BugsGrid.instance = new ui.component.BugsGrid(config);
    }
    return ui.component._BugsGrid.instance;
};
