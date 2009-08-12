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
        return value;
    } else {
        return;
    }
}

// CheckDoc Grid columns definition
ui.component._CheckDoc.columns = [
    new Ext.grid.RowNumberer(), {
        id        : 'extension',
        header    : "Extension",
        sortable  : true,
        dataIndex : 'extension'
    }, {
        header    : "Not documented",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_undoc',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "Old style",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_oldstyle',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "Bad refsect1 order",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_badorder',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "No parameters",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noparameters',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "No return values",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noreturnvalues',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "No examples",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noexamples',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "No errors section",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noerrors',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "No see also",
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noseealso',
        renderer  : ui.component._CheckDoc.renderer
    }, {
        header    : "Refsect1 role error",
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

    sm : new Ext.grid.RowSelectionModel({
        listeners : {
            rowselect : function(sm, rowIndex, record)
            {
                Ext.getCmp('check-doc-btn-open-selected-files').enable();
            }
        }
    }),
    columns : [ new Ext.grid.RowNumberer(), {
        id        : 'file',
        header    : "Files",
        sortable  : true,
        dataIndex : 'file'
    } ],

    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {
            grid.getSelectionModel().selectRow(rowIndex);
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            ui.component.RepositoryTree.getInstance().openFile(
                'en' + grid.fpath,
                grid.store.getAt(rowIndex).data.file
            );

            Ext.getCmp('check-doc-file-win').close();
        }
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
    buttons    : [{
        text    : 'Open all files',
        handler : function()
        {
            var win   = Ext.getCmp('check-doc-file-win'),
                store = ui.component._CheckDoc.fs;

            phpDoc.filePendingOpen = new Array();

            for (var i = 0; i < store.getCount(); ++i) {
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
        text     : 'Open selected files',
        id       : 'check-doc-btn-open-selected-files',
        disabled : true,
        handler  : function()
        {
            var win = Ext.getCmp('check-doc-file-win'),
                r = Ext.getCmp('check-doc-file-grid')
                    .getSelectionModel()
                    .getSelections();

            phpDoc.filePendingOpen = new Array();

            for (var i = 0; i < r.length; ++i) {
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

    sm   : new Ext.grid.CellSelectionModel({ singleSelect : true }),
    view : new Ext.grid.GridView({ forceFit : true }),

    listeners : {
        render : function(grid)
        {
            // on render, load data
            grid.store.load.defer(20, grid.store);
        },
        celldblclick : function(grid, rowIndex, columnIndex, e)
        {
            var record    = grid.getStore().getAt(rowIndex),
                errorType = grid.getColumnModel().getDataIndex(columnIndex),
                data      = record.get(errorType),
                fpath     = record.data.path;

            if (Ext.num(data, false) && data != 0) {
                // get checkdoc file via XHR
                // TODO - may change to use HttpProxy for DataStore
                //        remove XHR, win.open() and load from proxy
                XHR({
                    params   : {
                        task      : 'getCheckDocFiles',
                        path      : fpath,
                        errorType : errorType
                    },
                    success : function(response)
                    {
                        // Must choose the file
                        var o = Ext.decode(response.responseText);

                        // file store
                        ui.component._CheckDoc.fs.removeAll();
                        for (var i = 0; i < o.files.length; ++i) {

                            ui.component._CheckDoc.fs.insert(
                                0, new ui.component._CheckDoc.fs.recordType({
                                    id   : i,
                                    file : o.files[i].name
                                })
                            );
                        }
                        ui.component._CheckDoc.fs.sort('file', 'asc');

                        new ui.component._CheckDoc.FileWin({
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
        }
    }
});
