Ext.namespace('ui','ui.component','ui.component._BuildStatus');

//------------------------------------------------------------------------------
// BuildStatus Internals

// BuildStatus Grid datastore
ui.component._BuildStatus.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './php/controller.php'
    }),
    baseParams : { task : 'getBuildStatusData' },
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
            }, {
                name    : 'status',
                mapping : 'status',
                type    : 'int'
            }
        ])
    )
});
ui.component._BuildStatus.ds.setDefaultSort('date', 'desc');

// BuildStatus Grid language cell renderer
ui.component._BuildStatus.rendererLanguage = function(value)
{
    return '<div class="flag flag-' + value + '">' + value + '</div>';
}

// BuildStatus Grid status cell renderer
ui.component._BuildStatus.rendererStatus = function(value)
{
    if (value === 0) {
        return 'Nok';
    } else {
        return 'Ok';
    }
}

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
    }, {
        header    : _("Status"),
        width     : 45,
        sortable  : true,
        dataIndex : 'status',
        renderer  : ui.component._BuildStatus.rendererStatus
    }
];


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
        forceFit    : true,
        getRowClass : function(record, numIndex, rowParams, store)
        {
            if (record.data.status === 0) {
                return 'summary_3';
            }
        }
    }),
    listeners : {
        scope  : this,
        render : function(grid)
        {
            grid.store.load.defer(20, grid.store);
        }
    }
});
