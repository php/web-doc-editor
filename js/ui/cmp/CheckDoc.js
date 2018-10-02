Ext.namespace('ui','ui.cmp','ui.cmp._CheckDoc');

//------------------------------------------------------------------------------
// CheckDoc Internals

// CheckDoc Grid datastore
ui.cmp._CheckDoc.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCheckDocData'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'extension'},
            {name : 'check_oldstyle',       type : 'int'},
            {name : 'check_undoc',          type : 'int'},
            {name : 'check_roleerror',      type : 'int'},
            {name : 'check_badorder',       type : 'int'},
            {name : 'check_noseealso',      type : 'int'},
            {name : 'check_noreturnvalues', type : 'int'},
            {name : 'check_noparameters',   type : 'int'},
            {name : 'check_noexamples',     type : 'int'},
            {name : 'check_noerrors',       type : 'int'}
        ]
    })
});
ui.cmp._CheckDoc.ds.setDefaultSort('extension', 'asc');

// CheckDoc Grid non-extension cell renderer
ui.cmp._CheckDoc.renderer = function(value, metadata)
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
ui.cmp._CheckDoc.columns = [
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
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('Old style'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_oldstyle',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('Bad refsect1 order'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_badorder',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No parameters'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noparameters',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No return values'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noreturnvalues',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No examples'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noexamples',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No errors section'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noerrors',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('No see also'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_noseealso',
        renderer  : ui.cmp._CheckDoc.renderer
    }, {
        header    : _('Refsect1 role error'),
        width     : 45,
        sortable  : true,
        dataIndex : 'check_roleerror',
        renderer  : ui.cmp._CheckDoc.renderer
    }
];

// CheckDoc File-Win Grid datastore
ui.cmp._CheckDoc.fs = new Ext.data.SimpleStore({
    fields : [
        {name: 'id'},
        {name: 'file'}
    ]
});

// CheckDoc Internal File-Win Grid
//  config - {fpath}
ui.cmp._CheckDoc.FileGrid = Ext.extend(Ext.grid.GridPanel,
{
    id               : 'check-doc-file-grid',
    store            : ui.cmp._CheckDoc.fs,
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

    onRowClick: function()
    {
        Ext.getCmp('check-doc-btn-open-selected-files').enable();
    },

    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
        grid.getSelectionModel().selectRow(rowIndex);
    },

    onRowDblClick: function(grid, rowIndex)
    {
        ui.cmp.RepositoryTree.getInstance().openFile(
            'byPath',
            'en' + grid.fpath,
            grid.store.getAt(rowIndex).data.file
        );
        Ext.getCmp('check-doc-file-win').close();
    },

    initComponent: function(config)
    {
        ui.cmp._CheckDoc.FileGrid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu',    this.onRowContextMenu, this);
        this.on('rowdblclick',       this.onRowDblClick,    this);
        this.on('rowclick',          this.onRowClick,      this);
    }
});

// CheckDoc Internal File-Win
//  config - {fpath}
ui.cmp._CheckDoc.FileWin = Ext.extend(Ext.Window,
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
                store = ui.cmp._CheckDoc.fs,
                i;

            PhDOE.AFfilePendingOpen = [];

            for (i = 0; i < store.getCount(); ++i) {
                PhDOE.AFfilePendingOpen[i] = {
                    fpath : 'en' + win.fpath,
                    fname : store.getAt(i).data.file
                };
            }

            ui.cmp.RepositoryTree.getInstance().openFile(
                'byPath',
                PhDOE.AFfilePendingOpen[0].fpath,
                PhDOE.AFfilePendingOpen[0].fname
            );

            PhDOE.AFfilePendingOpen.shift();

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

            PhDOE.AFfilePendingOpen = [];

            for (i = 0; i < r.length; ++i) {
                PhDOE.AFfilePendingOpen[i] = {
                    fpath : 'en' + win.fpath,
                    fname : r[i].data.file
                };
            }

            ui.cmp.RepositoryTree.getInstance().openFile(
                'byPath',
                PhDOE.AFfilePendingOpen[0].fpath,
                PhDOE.AFfilePendingOpen[0].fname
            );

            PhDOE.AFfilePendingOpen.shift();

            win.close();
        }
    }]
});

//------------------------------------------------------------------------------
// CheckDoc Grid
ui.cmp.CheckDoc = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    store            : ui.cmp._CheckDoc.ds,
    columns          : ui.cmp._CheckDoc.columns,
    autoExpandColumn : 'extension',
    sm               : new Ext.grid.CellSelectionModel({ singleSelect : true }),
    view             : new Ext.grid.GridView({ forceFit : true }),
    listeners        :
    {
        render : function(grid)
        {
            // on render, load data
            this.store.load.defer(20, grid.store);
        }
    },

    onCellContextMenu : function (grid, rowIndex, cellIndex, e)
    {
        e.stopEvent();
        this.sm.select(rowIndex, cellIndex);
    },

    onCellDblClick : function(grid, rowIndex, columnIndex, e)
    {
        var record    = this.store.getAt(rowIndex),
            errorType = this.getColumnModel().getDataIndex(columnIndex),
            data      = record.get(errorType),
            fpath     = record.data.path;

        if (Ext.num(data, false) && data !== 0) {

            this.el.mask(_('Please, wait...'));

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
                        i;

                    // file store
                    ui.cmp._CheckDoc.fs.removeAll();
                    for (i = 0; i < o.files.length; ++i) {

                        ui.cmp._CheckDoc.fs.insert(
                            0, new ui.cmp._CheckDoc.fs.recordType({
                                id   : i,
                                file : o.files[i].name
                            })
                        );
                    }
                    ui.cmp._CheckDoc.fs.sort('file', 'asc');

                    grid.el.unmask();

                    new ui.cmp._CheckDoc.FileWin({
                        fpath : fpath,
                        items : [
                            new ui.cmp._CheckDoc.FileGrid({
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
        ui.cmp.CheckDoc.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('celldblclick',    this.onCellDblClick,    this);
        this.on('cellcontextmenu', this.onCellContextMenu, this);
    }
});
