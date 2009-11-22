Ext.namespace('ui','ui.component','ui.component._PendingCommitGrid');

//------------------------------------------------------------------------------
// PendingCommitGrid internals

// PendingCommitGrid store
ui.component._PendingCommitGrid.store = Ext.extend(Ext.data.GroupingStore,
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
                name    : 'path',
                mapping : 'path'
            }, {
                name    : 'name',
                mapping : 'name'
            }, {
                name    : 'by',
                mapping : 'by'
            }, {
                name       : 'date',
                mapping    : 'date',
                type       : 'date',
                dateFormat : 'Y-m-d H:i:s'
            }, {
                name    : 'type',
                mapping : 'type'
            }
        ])
    ),
    sortInfo : {
        field     : 'path',
        direction : "ASC"
    },
    groupField : 'path',
    listeners : {
        add : function(ds)
        {
            Ext.getDom('acc-pendingCommit-nb').innerHTML = ds.getCount();
        },
        datachanged : function(ds)
        {
            Ext.getDom('acc-pendingCommit-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingCommitGrid columns definition
ui.component._PendingCommitGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Modified by'),
    width     : 45,
    sortable  : true,
    dataIndex : 'by'
}, {
    header    : _('Date'),
    width     : 45,
    sortable  : true,
    dataIndex : 'date',
    renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
}, {
    header    : _('Path'),
    dataIndex : 'path',
    hidden    : true
}];

// PendingCommitGrid view
ui.component._PendingCommitGrid.view = new Ext.grid.GroupingView({
    forceFit     : true,
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    emptyText    : '<div style="text-align: center;">' + _('No pending for Commit') + '</div>',
    getRowClass  : function(record, numIndex, rowParams, store)
    {
        if ( record.data.type === 'update' ) {
            return 'file-needcommit-update';
        }
        if ( record.data.type === 'delete' ) {
            return 'file-needcommit-delete';
        }
        if ( record.data.type === 'new' ) {
            return 'file-needcommit-new';
        }
    }
});

Ext.namespace('ui.component._PendingCommitGrid.menu');
// PendingCommitGrid common sub-menu
// config - { rowIdx }
ui.component._PendingCommitGrid.menu.common = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingCommitGrid.menu.common.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingCommitGrid.menu.common, Ext.menu.Item,
{
    init : function()
    {
        Ext.apply(this,
        {
            text     : _('Commit...'),
            iconCls  : 'iconCommitFileVcs',
            disabled : (phpDoc.userLogin === 'anonymous'),
            handler  : function() { return false; },
            menu     : new Ext.menu.Menu({
                items : [{
                    scope   : this,
                    text    : _('...this file'),
                    iconCls : 'iconCommitFileVcs',
                    handler : function()
                    {
                        var record = ui.component.PendingCommitGrid.getInstance().store.getAt(this.rowIdx),
                            fdbid  = record.data.id,
                            fpath  = record.data.path,
                            fname  = record.data.name,
                            fid    = Ext.util.md5(fpath + fname),
                            tmp;

                        tmp = new ui.component.CommitPrompt({
                            files : [{
                                fid : fid,
                                fpath : fpath,
                                fname : fname,
                                fdbid : fdbid
                            }]
                        }).show();
                    }
                }, {
                    scope   : this,
                    text    : _('...all files modified by me'),
                    iconCls : 'iconCommitFileVcs',
                    handler : function()
                    {
                        var files = [],
                            grid  = ui.component.PendingCommitGrid.getInstance(),
                            tmp;

                        grid.store.each(function(record)
                        {
                            if (record.data.by === phpDoc.userLogin) {
                                var fdbid  = record.data.id,
                                    fpath  = record.data.path,
                                    fname  = record.data.name,
                                    fid    = Ext.util.md5(fpath + fname);
                                files.push({
                                    fid   : fid,
                                    fpath : fpath,
                                    fname : fname,
                                    fdbid : fdbid
                                });
                            }
                        });

                        tmp = new ui.component.CommitPrompt({
                            files : files
                        }).show();
                    }
                }, {
                    scope   : this,
                    text    : _('...all files modified'),
                    iconCls : 'iconCommitFileVcs',
                    handler : function()
                    {
                        var files = [],
                            grid  = ui.component.PendingCommitGrid.getInstance(),
                            tmp;

                        grid.store.each(function(record)
                        {
                            var fdbid  = record.data.id,
                                fpath  = record.data.path,
                                fname  = record.data.name,
                                fid    = Ext.util.md5(fpath + fname);
                            files.push({
                                fid   : fid,
                                fpath : fpath,
                                fname : fname,
                                fdbid : fdbid
                            });
                        });

                        tmp = new ui.component.CommitPrompt({
                            files : files
                        }).show();
                    }
                }]
            })
        });
    }
});

// PendingCommitGrid menu for pending update file
// config - { fpath, fname, rowIdx, grid, event }
ui.component._PendingCommitGrid.menu.update = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingCommitGrid.menu.update.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingCommitGrid.menu.update, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items: [
                {
                    scope   : this,
                    text    : '<b>'+_('Edit in a new Tab')+'</b>',
                    iconCls : 'PendingCommit',
                    handler : function()
                    {
                        this.grid.fireEvent('rowdblclick',
                            this.grid, this.rowIdx, this.event
                        );
                    }
                }, '-', {
                    scope   : this,
                    text    : _('View Diff'),
                    iconCls : 'iconViewDiff',
                    handler : function()
                    {

                        // Render only if this tab don't exist yet
                        if (!Ext.getCmp('main-panel').findById('diff_panel_pending_' + this.rowIdx)) {

                            // Add tab for the diff
                            Ext.getCmp('main-panel').add({
                                xtype      : 'panel',
                                id         : 'diff_panel_pending_' + this.rowIdx,
                                iconCls    : 'iconTabLink',
                                title      : _('Diff'),
                                tabTip     : String.format(_('Diff for file: {0}'), this.fpath+this.fname),
                                closable   : true,
                                autoScroll : true,
                                html       : '<div id="diff_content_pending_' + this.rowIdx + '" class="diff-content"></div>'
                            });
                            Ext.getCmp('main-panel').setActiveTab('diff_panel_pending_' + this.rowIdx);

                            Ext.get('diff_panel_pending_' + this.rowIdx).mask(
                                '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                                _('Please, wait...')
                            );

                            // Load diff data
                            XHR({
                                scope   : this,
                                params  : {
                                    task     : 'getDiff',
                                    FilePath : this.fpath,
                                    FileName : this.fname
                                },
                                success : function(response)
                                {
                                    var o = Ext.util.JSON.decode(response.responseText);

                                    // We display in diff div
                                    Ext.get('diff_content_pending_' + this.rowIdx).dom.innerHTML = o.content;
                                    Ext.get('diff_panel_pending_' + this.rowIdx).unmask();
                                }
                            });
                        } else {
                            // This tab already exist. We focus it.
                            Ext.getCmp('main-panel').setActiveTab('diff_panel_pending_' + this.rowIdx);
                        }
                    }
                }, {
                    scope   : this,
                    text    : _('Download the diff as a patch'),
                    iconCls : 'iconCommitFileVcs',
                    handler : function()
                    {
                        window.location.href = './do/downloadPatch' +
                                               '?FilePath=' + this.fpath +
                                               '&FileName=' + this.fname;
                    }
                }, '-', {
                    scope    : this,
                    text     : _('Clear this change'),
                    iconCls  : 'iconPageDelete',
                    disabled : (phpDoc.userLogin === 'anonymous'),
                    handler  : function()
                    {
                        var tmp = new ui.task.ClearLocalChangeTask({
                            storeRecord : this.grid.store.getAt(this.rowIdx),
                            ftype       : 'update',
                            fpath       : this.fpath,
                            fname       : this.fname
                        });
                    }
                }, '-', new ui.component._PendingCommitGrid.menu.common({
                    rowIdx : this.rowIdx
                })
            ]
        });
    }
});

// PendingCommitGrid menu for pending delete file
// config - { rowIdx, grid, event }
ui.component._PendingCommitGrid.menu.del = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingCommitGrid.menu.del.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingCommitGrid.menu.del, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items: [
                {
                    scope   : this,
                    text    : '<b>'+_('View in a new Tab')+'</b>',
                    iconCls : 'iconView',
                    handler : function()
                    {
                        this.grid.fireEvent('rowdblclick',
                            this.grid, this.rowIdx, this.event
                        );
                    }
                }, {
                    scope    : this,
                    text     : _('Cancel this deletion'),
                    iconCls  : 'iconPageDelete',
                    disabled : (phpDoc.userLogin === 'anonymous'),
                    handler : function()
                    {

                       var storeRecord = this.grid.store.getAt(this.rowIdx),
                           FilePath    = storeRecord.data.path,
                           FileName    = storeRecord.data.name

                       tmp = new ui.task.ClearLocalChangeTask({
                           storeRecord : storeRecord,
                           ftype       : 'delete',
                           fpath       : FilePath,
                           fname       : FileName
                       });

                    }
                }, '-', new ui.component._PendingCommitGrid.menu.common({
                    rowIdx : this.rowIdx
                })
            ]
        });
    }
});


// PendingCommitGrid menu for pending new file
// config - { rowIdx, grid, event }
ui.component._PendingCommitGrid.menu.newFile = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._PendingCommitGrid.menu.newFile.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingCommitGrid.menu.newFile, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items: [{
                    scope    : this,
                    text     : _('Clear this change'),
                    iconCls  : 'iconPageDelete',
                    disabled : (phpDoc.userLogin === 'anonymous'),
                    handler  : function()
                    {


                       var storeRecord = this.grid.store.getAt(this.rowIdx),
                           FilePath    = storeRecord.data.path,
                           FileName    = storeRecord.data.name,
                           tmp = new ui.task.ClearLocalChangeTask({
                            storeRecord : storeRecord,
                            ftype       : 'new',
                            fpath       : FilePath,
                            fname       : FileName
                        });
                    }
                }, '-',new ui.component._PendingCommitGrid.menu.common({
                    rowIdx : this.rowIdx
                })]
        });
    }
});

//------------------------------------------------------------------------------
// PendingCommitGrid
ui.component.PendingCommitGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'name',
    columns          : ui.component._PendingCommitGrid.columns,
    view             : ui.component._PendingCommitGrid.view,

    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {
            var storeRecord = grid.store.getAt(rowIndex),
                FileType    = storeRecord.data.type,
                FilePath    = storeRecord.data.path,
                FileName    = storeRecord.data.name,
                tmp;

            grid.getSelectionModel().selectRow(rowIndex);

            if (FileType === 'new') {
                tmp = new ui.component._PendingCommitGrid.menu.newFile({
                    grid   : grid,
                    rowIdx : rowIndex,
                    event  : e
                }).showAt(e.getXY());
            }

            if (FileType === 'delete') {
                tmp = new ui.component._PendingCommitGrid.menu.del({
                    grid   : grid,
                    rowIdx : rowIndex,
                    event  : e
                }).showAt(e.getXY());
            }

            if (FileType === 'update') {
                tmp = new ui.component._PendingCommitGrid.menu.update({
                    fpath  : FilePath,
                    fname  : FileName,
                    grid   : grid,
                    rowIdx : rowIndex,
                    event  : e
                }).showAt(e.getXY());
            }
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var storeRecord = grid.store.getAt(rowIndex),
                FileType    = storeRecord.data.type,
                FilePath    = storeRecord.data.path,
                FileName    = storeRecord.data.name,
                tmp;

            if (FileType === 'update') {

                // Find the id of this row into StaleFileGrid.store and open it !
                tmp = FilePath.split('/');
                tmp.shift();

                FilePath = "/" + tmp.join('/');

                ui.component.StaleFileGrid.getInstance().store.each(function(row) {

                    if( (row.data['path']) === FilePath && row.data['name'] === FileName ) {
                        ui.component.StaleFileGrid.getInstance().openFile(row.data.id);
                    }
                });

            }

            if (FileType === 'delete') {

                // CleanUp the path - Del the first element => LANG (Automatic added by FilePanel.js)
                tmp = FilePath.split('/');
                tmp.shift();

                ui.component.NotInENGrid.getInstance().openFile('/' + tmp.join('/'), FileName);
            }
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : new ui.component._PendingCommitGrid.store({
                autoLoad : true,
                proxy : new Ext.data.HttpProxy({
                    url : './do/getFilesPendingCommit'
                })
            })
        });
        ui.component.PendingCommitGrid.superclass.initComponent.call(this);
    },

    addRecord : function(fid, fpath, fname, type)
    {
        var exist = false;

        this.store.each(function(r)
        {
            if (r.data.path === fpath && r.data.name === fname) {
                exist = true;
            }
        });

        if (!exist) {
            // if not exist, add to store
            this.store.insert(0,
                new this.store.recordType({
                    id   : fid,
                    path : fpath,
                    name : fname,
                    by   : phpDoc.userLogin,
                    date : new Date(),
                    type : type
                })
            );
            this.store.groupBy('path', true); // regroup
        }
    }
});

// singleton
ui.component._PendingCommitGrid.instance = null;
ui.component.PendingCommitGrid.getInstance = function(config)
{
    if (!ui.component._PendingCommitGrid.instance) {
        if (!config) {
           config = {};
        }
        ui.component._PendingCommitGrid.instance = new ui.component.PendingCommitGrid(config);
    }
    return ui.component._PendingCommitGrid.instance;
};