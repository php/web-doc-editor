Ext.namespace('ui','ui.component','ui.component._BuildStatus');

//------------------------------------------------------------------------------
// BuildStatus Internals
ui.component._BuildStatus.display = function(config)
{

    Ext.apply(this, config);

    XHR({
        scope: this,
        params  : {
            task          : 'getFailedBuildData',
            idFailedBuild : this.idFailedBuild
        },
        success : function(response)
        {
            var o = Ext.decode(response.responseText),
                mess = o.mess.join("<br/>");

            // Display
            if ( Ext.getCmp('main-panel').findById('last_failed_build_' + this.lang) ) {
                Ext.getCmp('main-panel').remove('last_failed_build_' + this.lang);
            }

            Ext.getCmp('main-panel').add({
                xtype      : 'panel',
                id         : 'last_failed_build_' + this.lang,
                title      : String.format(_('Last failed build for {0}'),Ext.util.Format.uppercase(this.lang)),
                tabTip     : String.format(_('Last failed build for the documentation {0}'), Ext.util.Format.uppercase(this.lang)),
                closable   : true,
                autoScroll : true,
                iconCls    : 'checkBuild',
                html       : '<div class="check-build-content">' + mess + '</div>'
            });
            Ext.getCmp('main-panel').setActiveTab('last_failed_build_' + this.lang);
        }
    });
};

// BuildStatus Grid datastore
ui.component._BuildStatus.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getFailedBuild'
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
                name    : 'lang',
                mapping : 'lang'
            }, {
                name       : 'date',
                mapping    : 'date',
                type       : 'date',
                dateFormat : 'Y-m-d H:i:s'
            }
        ])
    )
});
ui.component._BuildStatus.ds.setDefaultSort('date', 'desc');

// BuildStatus Grid language cell renderer
ui.component._BuildStatus.rendererLanguage = function(value)
{
    return '<div class="flag flag-' + value + '">' + value + '</div>';
};

// BuildStatus Grid columns definition
ui.component._BuildStatus.columns = [
    {
        id        : 'date',
        header    : _("Date"),
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }, {
        header    : _("Language"),
        width     : 45,
        sortable  : true,
        dataIndex : 'lang',
        renderer  : ui.component._BuildStatus.rendererLanguage
    }
];

// BuildStatus context menu
ui.component._BuildStatus.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._BuildStatus.menu.superclass.constructor.call(this);
};
Ext.extend(ui.component._BuildStatus.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>' + _('View in a new Tab') + '</b>',
                iconCls : 'PendingPatch',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// BuildStatus Grid
ui.component.BuildStatus = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'date',
    store            : ui.component._BuildStatus.ds,
    columns          : ui.component._BuildStatus.columns,

    view : new Ext.grid.GridView({
        forceFit    : true
    }),
    listeners : {
        scope  : this,
        rowcontextmenu : function(grid, rowIndex, e)
        {

            e.stopEvent();

            grid.getSelectionModel().selectRow(rowIndex);

            tmp = new ui.component._BuildStatus.menu({
                grid   : grid,
                rowIdx : rowIndex,
                event  : e
            }).showAt(e.getXY());
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var storeRecord = grid.store.getAt(rowIndex), tmp;

            tmp = new ui.component._BuildStatus.display({
                idFailedBuild : storeRecord.id,
                lang          : storeRecord.data["lang"]
            });

        },
        render : function(grid)
        {
            grid.store.load.defer(20, grid.store);
        }
    }
});
