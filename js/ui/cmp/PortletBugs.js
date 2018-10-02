Ext.namespace('ui','ui.cmp','ui.cmp._PortletBugs');

//------------------------------------------------------------------------------
// PortletBugs internals

// Store : All open bugs for documentation
ui.cmp._PortletBugs.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getOpenBugs'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'title'},
            {name : 'link' },
            {name : 'description' },
            {name : 'xmlID' }
        ]
    })
});

ui.cmp._PortletBugs.gridFormatTitle = function(v) {
    return String.format('<div class="topic"><b>{0}</b></div>', v);
};

// BugsGrid columns definition
ui.cmp._PortletBugs.gridColumns = [{
    id        : 'GridBugTitle',
    header    : _("Title"),
    sortable  : true,
    dataIndex : 'title',
    renderer  : ui.cmp._PortletBugs.gridFormatTitle
}];


ui.cmp._PortletBugs.gridView = new Ext.grid.GridView({
    forceFit      : true,
    emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
    deferEmptyText: false,
    enableRowBody : true,
    showPreview   : false,
    getRowClass   : function(record, rowIndex, p)
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
ui.cmp._PortletBugs.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    height           : 250,
    autoExpandColumn : 'GridBugTitle',
    id               : 'PortletBugs-grid-id',
    store            : ui.cmp._PortletBugs.store,
    columns          : ui.cmp._PortletBugs.gridColumns,
    view             : ui.cmp._PortletBugs.gridView,
    sm               : new Ext.grid.RowSelectionModel({ singleSelect: true }),

    onRowDblClick : function(grid, rowIndex)
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

    openRelatedFile : function(xmlID)
    {
        new ui.task.GetFileInfoByXmlID({xmlID: xmlID});
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
                        ui.cmp._PortletBugs.reloadData();
                    }
                }, {
                    scope   : this,
                    text    : _('Open the related file'),
                    iconCls : 'iconAllFiles',
                    id      : 'bugs-open-related-file',
                    handler : function()
                    {
                        this.openRelatedFile(this.ctxXmlID);
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if(this.ctxIndex){
            this.ctxIndex = null;
        }
        if(this.ctxXmlID){
            this.ctxXmlID = null;
        }

        this.ctxIndex = rowIndex;
        this.ctxXmlID = grid.store.getAt(this.ctxIndex).data.xmlID;
        this.menu.showAt(e.getXY());

        if( !this.ctxXmlID ) {
          Ext.getCmp('bugs-open-related-file').disable();
        } else {
          Ext.getCmp('bugs-open-related-file').enable();
        }

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

        ui.cmp._PortletBugs.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);

    }
});

ui.cmp._PortletBugs.reloadData = function() {
    ui.cmp._PortletBugs.store.reload({
        callback : function(r,o,success) {
          if( !success ) {
              Ext.getCmp('PortletBugs-grid-id').getView().mainBody.update('<div id="PortletBugs-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">' + _('Error when loading open bugs from Php.net !') + '</div>');
              Ext.get('PortletBugs-grid-defaultMess-id').highlight();

          } else {
              if (ui.cmp._PortletBugs.store.getTotalCount() === 0 ) {
                  Ext.getCmp('PortletBugs-grid-id').getView().mainBody.update('<div id="PortletBugs-grid-defaultMess-id" style="text-align: center" class="x-grid-empty">'+_('No open bugs')+'</div>');
                  Ext.get('PortletBugs-grid-defaultMess-id').highlight();
              }
          }
        }
    });
};

//------------------------------------------------------------------------------
// PortletSummary
ui.cmp.PortletBugs = Ext.extend(Ext.ux.Portlet,
{
    title      : '',
    iconCls    : 'iconBugs',
    layout     : 'fit',
    store      : ui.cmp._PortletBugs.store,
    reloadData : ui.cmp._PortletBugs.reloadData,
    tools      : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletBugs.reloadData();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletBugsCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletBugsCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletBugsCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        this.id = 'portletBugs';
        this.title   = String.format(_('Open bugs for {0}'), 'doc-' + this.lang);

        Ext.apply(this, config);

        ui.cmp.PortletBugs.superclass.initComponent.apply(this);
        this.add(new ui.cmp._PortletBugs.grid());

    }
});

// singleton
ui.cmp._PortletBugs.instance = null;
ui.cmp.PortletBugs.getInstance = function(config)
{
    if (!ui.cmp._PortletBugs.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletBugs.instance = new ui.cmp.PortletBugs(config);
    }
    return ui.cmp._PortletBugs.instance;
};
