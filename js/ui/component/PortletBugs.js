Ext.namespace('ui','ui.component','ui.component._PortletBugs');

//------------------------------------------------------------------------------
// PortletBugs internals

// Store : All open bugs for documentation
ui.component._PortletBugs.store = new Ext.data.Store({
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
                mapping : 'title',
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

ui.component._PortletBugs.gridFormatTitle = function(value) {
    return String.format('<div class="topic"><b>{0}</b></div>', value);
};

// BugsGrid columns definition
ui.component._PortletBugs.gridColumns = [{
    id        : 'GridBugTitle',
    header    : _("Title"),
    sortable  : true,
    dataIndex : 'title',
    renderer  : ui.component._PortletBugs.gridFormatTitle
}];


ui.component._PortletBugs.gridView = new Ext.grid.GridView({
    forceFit      : true,
    emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
    deferEmptyText: false,
    enableRowBody : true,
    showPreview   : false,
    getRowClass   : function(record, rowIndex, p, store)
    {

        if (this.showPreview) {
            p.body = '<p>' + record.data.description + '</p>';
            return 'x-grid3-row-expanded';
        }
        return 'x-grid3-row-collapsed';
    }
});

//------------------------------------------------------------------------------
// BugsGrid
ui.component._PortletBugs.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    height           : 250,
    autoExpandColumn : 'GridBugTitle',
    id               : 'PortletBugs-grid-id',
    store            : ui.component._PortletBugs.store,
    columns          : ui.component._PortletBugs.gridColumns,
    view             : ui.component._PortletBugs.gridView,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    onRowDblClick: function(grid, rowIndex, e)
    {
        var BugsId    = grid.store.getAt(rowIndex).data.id,
            BugsUrl   = grid.store.getAt(rowIndex).data.link,
            BugsTitle = grid.store.getAt(rowIndex).data.title;

        if (!Ext.getCmp('main-panel').findById('bugs-' + BugsId)) {

            Ext.getCmp('main-panel').add({
                id         : 'bugs-' + BugsId,
                xtype      : 'panel',
                title      : Ext.util.Format.substr(BugsTitle, 0, 20) + '...',
                tabTip     : BugsTitle,
                iconCls    : 'iconBugs',
                closable   : true,
                layout     : 'fit',
                items: [ new Ext.ux.IFrameComponent({ id: 'frame-bugs-' + BugsId, url: BugsUrl }) ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('bugs-' + BugsId);
    },

    onContextClick : function(grid, rowIndex, e)
    {

        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-bugs',
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
                        ui.component._PortletBugs.reloadData();
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

    togglePreview : function(show) 
    {
        this.view.showPreview = show;
        this.view.refresh();
    }, 

    initComponent : function(config)
    {

        this.tbar = [{
            text          : _('Summary'),
            pressed       : false,
            enableToggle  : true, 
            iconCls       : 'iconSummary',
            scope         : this,
            toggleHandler : function(btn, pressed){
                this.togglePreview(pressed);
            }
        }];

        ui.component._PortletBugs.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);

    }
});

ui.component._PortletBugs.reloadData = function() {
    ui.component._PortletBugs.store.reload({
        callback: function(r,o,success) {
          if( !success ) {
              Ext.getCmp('PortletBugs-grid-id').getView().mainBody.update('<div id="PortletBugs-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">' + _('Error when loading open bugs from Php.net !') + '</div>');
              Ext.get('PortletBugs-grid-defaultMess-id').highlight();

          } else {
              if (ui.component._PortletBugs.store.getTotalCount() == 0 ) {
                  Ext.getCmp('PortletBugs-grid-id').getView().mainBody.update('<div id="PortletBugs-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">'+_('No open Bugs')+'</div>');
                  Ext.get('PortletBugs-grid-defaultMess-id').highlight();
              }
          }
        }
    });
};

//------------------------------------------------------------------------------
// PortletSummary
ui.component.PortletBugs = Ext.extend(Ext.ux.Portlet,
{
    title   : '',
    iconCls : 'iconBugs',
    layout  : 'fit',
    store   : ui.component._PortletBugs.store,
    reloadData : ui.component._PortletBugs.reloadData,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.component._PortletBugs.reloadData();
        }
    }],
    initComponent: function(config) {

        ui.component.PortletBugs.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.title   = String.format(_('Open bugs for {0}'), 'doc-' + this.lang);
        this.add(new ui.component._PortletBugs.grid());

    }
});

// singleton
ui.component._PortletBugs.instance = null;
ui.component.PortletBugs.getInstance = function(config)
{
    if (!ui.component._PortletBugs.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletBugs.instance = new ui.component.PortletBugs(config);
    }
    return ui.component._PortletBugs.instance;
};
