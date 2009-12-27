Ext.namespace('ui','ui.component','ui.component._CheckDoc');

//------------------------------------------------------------------------------
// CheckDoc Internals

// CheckDoc Grid datastore
ui.component._CheckDoc.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCheckDocData'
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
                name    : 'path',
                mapping : 'path'
            }, {
                name    : 'extension',
                mapping : 'extension'
            }, {
                name    : 'check_oldstyle',
                mapping : 'check_oldstyle',
                type    : 'int'
            }, {
                name    : 'check_undoc',
                mapping : 'check_undoc',
                type    : 'int'
            }, {
                name    : 'check_roleerror',
                mapping : 'check_roleerror',
                type    : 'int'
            }, {
                name    : 'check_badorder',
                mapping : 'check_badorder',
                type    : 'int'
            }, {
                name    : 'check_noseealso',
                mapping : 'check_noseealso',
                type    : 'int'
            }, {
                name    : 'check_noreturnvalues',
                mapping : 'check_noreturnvalues',
                type    : 'int'
            }, {
                name    : 'check_noparameters',
                mapping : 'check_noparameters',
                type    : 'int'
            }, {
                name    : 'check_noexamples',
                mapping : 'check_noexamples',
                type    : 'int'
            }, {
                name    : 'check_noerrors',
                mapping : 'check_noerrors',
                type    : 'int'
            }
        ])
    )
});
ui.component._CheckDoc.ds.setDefaultSort('extension', 'asc');

// CheckDoc Grid non-extension cell renderer
ui.component._CheckDoc.renderer = function(value, metadata)
{
    if (value > 0) {
        metadata.css = 'check_doc_cell';
        metadata.attr = 'ext:qtip="<img src=\'themes/img/help.png\' style=\'vertical-align: middle;\' /> ' + _('Double-click the cell to open the file selection') + '"';
        return value;
    } else {
        return;
    }
};

// CheckDoc Grid columns definition
ui.component._CheckDoc.columns = [
    new Ext.grid.RowNumberer(), {
        id        : 'extension',
        header    : _('Extension'),
        sortable  : true,
        dataIndex : 'extension'
    }, {
        header    : _('Not documented'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_undoc',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('Old style'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_oldstyle',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('Bad refsect1 order'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_badorder',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('No parameters'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noparameters',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('No return values'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noreturnvalues',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('No examples'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noexamples',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('No errors section'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noerrors',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('No see also'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noseealso',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : _('Refsect1 role error'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_roleerror',
        renderer  : ui.component._CheckDoc.renderer
    }
];

// CheckDoc File-Win Grid datastore
ui.component._CheckDoc.fs = new Ext.data.SimpleStore({
    fields: [{
        name: 'id'
    }, {
        name: 'file'
    }]
});

// CheckDoc Internal File-Win Grid
//  config - {fpath}
ui.component._CheckDoc.FileGrid = Ext.extend(Ext.grid.GridPanel,
{
    id               : 'check-doc-file-grid',
    store            : ui.component._CheckDoc.fs,
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'file',
    sm               : new Ext.grid.RowSelectionModel({}),
    columns          : [ new Ext.grid.RowNumberer(), {
                           id        : 'file',
                           header    : _('Files'),
                           sortable  : true,
                           dataIndex : 'file'
                       } ],

    onRowClick: function(grid, rowIndex, e)
    {
        Ext.getCmp('check-doc-btn-open-selected-files').enable();
    },

    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
        grid.getSelectionModel().selectRow(rowIndex);
    },

    onRowDblClick: function(grid, rowIndex, e)
    {
        ui.component.RepositoryTree.getInstance().openFile(
            'en' + grid.fpath,
            grid.store.getAt(rowIndex).data.file
        );
        Ext.getCmp('check-doc-file-win').close();
    },

    initComponent: function(config)
    {
        ui.component._CheckDoc.FileGrid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu',    this.onRowContextMenu, this);
        this.on('rowdblclick',       this.onRowDblClick,    this);
        this.on('rowclick',          this.onRowClick,      this);
    }
});

// CheckDoc Internal File-Win
//  config - {fpath}
ui.component._CheckDoc.FileWin = Ext.extend(Ext.Window,
{
    id         : 'check-doc-file-win',
    title      : _('Files'),
    width      : 450,
    height     : 350,
    labelWidth : 50,
    resizable  : false,
    modal      : true,
    autoScroll : true,
    layout     : 'fit',
    iconCls    : 'iconFiles',
    buttons    : [{
        text    : _('Open all files'),
        handler : function()
        {
            var win   = Ext.getCmp('check-doc-file-win'),
                store = ui.component._CheckDoc.fs,
                i;

            phpDoc.filePendingOpen = [];

            for (i = 0; i < store.getCount(); ++i) {
                phpDoc.filePendingOpen[i] = {
                    fpath : 'en' + win.fpath,
                    fname : store.getAt(i).data.file
                };
            }

            ui.component.RepositoryTree.getInstance().openFile(
                phpDoc.filePendingOpen[0].fpath,
                phpDoc.filePendingOpen[0].fname
            );
            win.close();
        }
    }, {
        text     : _('Open selected files'),
        id       : 'check-doc-btn-open-selected-files',
        disabled : true,
        handler  : function()
        {
            var win = Ext.getCmp('check-doc-file-win'),
                r   = Ext.getCmp('check-doc-file-grid')
                      .getSelectionModel()
                      .getSelections(),
                i;

            phpDoc.filePendingOpen = [];

            for (i = 0; i < r.length; ++i) {
                phpDoc.filePendingOpen[i] = {
                    fpath : 'en' + win.fpath,
                    fname : r[i].data.file
                };
            }

            ui.component.RepositoryTree.getInstance().openFile(
                phpDoc.filePendingOpen[0].fpath,
                phpDoc.filePendingOpen[0].fname
            );
            win.close();
        }
    }]
});

//------------------------------------------------------------------------------
// CheckDoc Grid
ui.component.CheckDoc = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    store            : ui.component._CheckDoc.ds,
    columns          : ui.component._CheckDoc.columns,
    autoExpandColumn : 'extension',
    sm               : new Ext.grid.CellSelectionModel({ singleSelect : true }),
    view             : new Ext.grid.GridView({ forceFit : true }),

    listeners: {
        render: function(grid)
        {
            // on render, load data
            this.store.load.defer(20, grid.store);
        }
    },

    onCellContextMenu: function (grid, rowIndex, cellIndex, e)
    {
        e.stopEvent();
        this.sm.select(rowIndex, cellIndex);
    },

    onCellDblClick: function(grid, rowIndex, columnIndex, e)
    {
        var record    = this.store.getAt(rowIndex),
            errorType = this.getColumnModel().getDataIndex(columnIndex),
            data      = record.get(errorType),
            fpath     = record.data.path;

        this.el.mask(_('Please, wait...'));

        if (Ext.num(data, false) && data !== 0) {
            XHR({
                params   : {
                    task      : 'getCheckDocFiles',
                    path      : fpath,
                    errorType : errorType
                },
                success : function(response)
                {
                    // Must choose the file
                    var o = Ext.decode(response.responseText),
                        i, tmp;

                    // file store
                    ui.component._CheckDoc.fs.removeAll();
                    for (i = 0; i < o.files.length; ++i) {

                        ui.component._CheckDoc.fs.insert(
                            0, new ui.component._CheckDoc.fs.recordType({
                                id   : i,
                                file : o.files[i].name
                            })
                        );
                    }
                    ui.component._CheckDoc.fs.sort('file', 'asc');

                    grid.el.unmask();

                    tmp = new ui.component._CheckDoc.FileWin({
                        fpath : fpath,
                        items : [
                            new ui.component._CheckDoc.FileGrid({
                                fpath : fpath
                            })
                        ]
                    }).show();
                }
            });
        } // data is not empty
    },

    initComponent: function(config)
    {
        ui.component.CheckDoc.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('celldblclick',    this.onCellDblClick,    this);
        this.on('cellcontextmenu', this.onCellContextMenu, this);
    }
});
