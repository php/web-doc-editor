Ext.namespace('ui','ui.component','ui.component._CVSLogGrid');

//------------------------------------------------------------------------------
// CVSLogGrid internals

// CVSLogGrid log information store
ui.component._CVSLogGrid.store = Ext.extend(Ext.data.Store,
{
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
                name    : 'revision',
                mapping : 'revision'
            }, {
                name       : 'date',
                mapping    : 'date',
                type       : 'date',
                dateFormat : 'Y/m/d H:i:s'
            }, {
                name    : 'author',
                mapping : 'author'
            }, {
                name    : 'content',
                mapping : 'content'
            }
        ])
    )
});

// CVSLogGrid selection model
// config - {fid}
ui.component._CVSLogGrid.sm = Ext.extend(Ext.grid.CheckboxSelectionModel,
{
    singleSelect : false,
    header       : '',
    width        : 22,

    listeners : {
        beforerowselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                return false;
            }
        },
        rowselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).enable();
                Ext.get(sm.prefix + '-PANEL-btn-log-' + sm.fid).frame("3F8538");
            } else {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).disable();
            }
        },
        rowdeselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).enable();
                Ext.get(sm.prefix + '-PANEL-btn-log-' + sm.fid).frame("3F8538");
            } else {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).disable();
            }
        }
    }
});

// CVSLogGrid columns definition
ui.component._CVSLogGrid.columns = [
    {
        id        : 'id',
        header    : "Rev.",
        width     : 40,
        sortable  : false,
        dataIndex : 'revision'
    }, {
        header    : "Content",
        width     : 130,
        sortable  : true,
        dataIndex : 'content'
    }, {
        header    : "By",
        width     : 50,
        sortable  : true,
        dataIndex : 'author'
    }, {
        header    : "Date",
        width     : 85,
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// CVSLogGrid
// config - {prefix, fid, fpath, fname, loadStore}
ui.component.CVSLogGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    bodyBorder       : false,
    autoExpandColumn : 'content',

    initComponent : function()
    {
        var sm = new ui.component._CVSLogGrid.sm({
            fid    : this.fid,
            prefix : this.prefix
        }),
        store = new ui.component._CVSLogGrid.store({
            autoLoad : this.loadStore,
            proxy : new Ext.data.HttpProxy({
                url : './php/controller.php'
            }),
            baseParams : {
                task : 'getLog',
                Path : this.fpath,
                File : this.fname
            }
        }),
        columns = [];

        columns.push(sm);
        for (var i = 0; i < ui.component._CVSLogGrid.columns.length; ++i) {
            columns.push(ui.component._CVSLogGrid.columns[i]);
        }

        store.setDefaultSort('date', 'desc');

        Ext.apply(this,
        {
            sm      : sm,
            store   : store,
            columns : columns,
            view    : new Ext.grid.GridView({ forceFit : true }),

            tbar  : [{
                scope    : this,
                id       : this.prefix + '-PANEL-btn-log-' + this.fid,
                tooltip  : '<b>View</b> the diff',
                iconCls  : 'iconViewDiff',
                disabled : true,
                handler : function()
                {
                    var s    = this.getSelectionModel().getSelections(),
                        rev1 = s[0].data.revision,
                        rev2 = s[1].data.revision;

                    phpDoc.winDiff(this.fpath, this.fname, rev1, rev2);
                }
            }, {
                scope   : this,
                id      : this.prefix + '-PANEL-btn-refreshlog-' + this.fid,
                tooltip : '<b>Load/Refresh</b> revisions',
                iconCls : 'refresh',
                handler : function()
                {
                    this.store.reload();
                }
            }]
        });
        ui.component.CVSLogGrid.superclass.initComponent.call(this);
    }
});
