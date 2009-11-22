Ext.namespace('ui','ui.component','ui.component._VCSLogGrid');

//------------------------------------------------------------------------------
// VCSLogGrid internals

// VCSLogGrid log information store
ui.component._VCSLogGrid.store = Ext.extend(Ext.data.Store,
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

// VCSLogGrid selection model
// config - {fid}
ui.component._VCSLogGrid.sm = Ext.extend(Ext.grid.CheckboxSelectionModel,
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

// VCSLogGrid columns definition
ui.component._VCSLogGrid.columns = [
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
// VCSLogGrid
// config - {prefix, fid, fpath, fname, loadStore}
ui.component.VCSLogGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    bodyBorder       : false,
    autoExpandColumn : 'content',

    initComponent : function()
    {
        var sm = new ui.component._VCSLogGrid.sm({
            fid    : this.fid,
            prefix : this.prefix
        }),
        store = new ui.component._VCSLogGrid.store({
            autoLoad : this.loadStore,
            proxy : new Ext.data.HttpProxy({
                url : './do/getLog'
            }),
            baseParams : {
                Path : this.fpath,
                File : this.fname
            }
        }),
        columns = [];

        columns.push(sm);
        for (var i = 0; i < ui.component._VCSLogGrid.columns.length; ++i) {
            columns.push(ui.component._VCSLogGrid.columns[i]);
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

                    Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Finding the diff. Please, wait...'));

                    // Load diff data
                    XHR({
                        params : {
                            task     : 'getDiff2',
                            FilePath : this.fpath,
                            FileName : this.fname,
                            Rev1     : rev1,
                            Rev2     : rev2
                        },
                        success : function(response)
                        {
                            var o = Ext.util.JSON.decode(response.responseText);

                            Ext.getBody().unmask();

                            // We display in diff window
                            var winStatus = new Ext.Window({
                                title      : String.format(_('Diff between {0} & {1}'), rev1, rev2),
                                width      : 650,
                                height     : 350,
                                resizable  : false,
                                modal      : true,
                                autoScroll : true,
                                bodyStyle  : 'background-color: white; padding: 5px;',
                                html       : '<div class="diff-content">' + o.content + '</div>',
                                buttons : [{
                                    text    : _('Close'),
                                    handler : function()
                                    {
                                        winStatus.close();
                                    }
                                }]
                            });
                            winStatus.show();
                        }
                    });
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
        ui.component.VCSLogGrid.superclass.initComponent.call(this);
    }
});
