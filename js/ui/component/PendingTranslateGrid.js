Ext.namespace('ui','ui.component','ui.component._PendingTranslateGrid');

//------------------------------------------------------------------------------
// PendingTranslateGrid data store
ui.component._PendingTranslateGrid.store = Ext.extend(Ext.data.GroupingStore,
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
                name    : 'needcommit',
                mapping : 'needcommit'
            }
        ])
    ),
    sortInfo : {
        field     : 'name',
        direction : "ASC"
    },
    groupField : 'path',
    listeners  : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-need-translate-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingTranslateGrid view
ui.component._PendingTranslateGrid.view = new Ext.grid.GroupingView({
    forceFit       : true,
    startCollapsed : true,
    groupTextTpl   : '{[values.rs[0].data["path"]]} ' +
                     '({[values.rs.length]} ' +
                     '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    deferEmptyText: false,
    getRowClass : function(record)
    {
        if (record.data.needcommit) {
            return 'file-need-commit';
        }
        return false;
    },
    emptyText : '<div style="text-align: center;">' + _('No Files') + '</div>'
});

// PendingTranslateGrid columns definition
ui.component._PendingTranslateGrid.columns = [
    {
        id        : 'name',
        header    : _('Files'),
        sortable  : true,
        dataIndex : 'name'
    }, {
        header    : _('Path'),
        dataIndex : 'path',
        'hidden'  : true
    }
];

// PendingTranslateGrid context menu
// config - { hideCommit, grid, rowIdx, event, lang, fpath, fname }
ui.component._PendingTranslateGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._StaleFileGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.component._PendingTranslateGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items: [{
                scope   : this,
                text    : '<b>'+_('Edit in a new Tab')+'</b>',
                iconCls : 'iconTabNeedTranslate',
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
// PendingTranslateGrid
ui.component.PendingTranslateGrid = Ext.extend(Ext.grid.GridPanel,
{
    view             : ui.component._PendingTranslateGrid.view,
    loadMask         : true,
    autoExpandColumn : 'name',
    enableDragDrop   : true,
    ddGroup          : 'mainPanelDDGroup',
    border           : false,

    onRowContextMenu : function(grid, rowIndex, e)
    {
        e.stopEvent();

        var FilePath = grid.store.getAt(rowIndex).data.path,
            FileName = grid.store.getAt(rowIndex).data.name;

        grid.getSelectionModel().selectRow(rowIndex);

        new ui.component._PendingTranslateGrid.menu({
            hideCommit : (grid.store.getAt(rowIndex).data.needcommit === false),
            grid       : grid,
            event      : e,
            rowIdx     : rowIndex,
            lang       : PhDOE.userLang,
            fpath      : FilePath,
            fname      : FileName
        }).showAt(e.getXY());
    },

    onRowDblClick : function(grid, rowIndex, e)
    {
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },

    openFile : function(rowId)
    {
        var storeRecord = this.store.getById(rowId),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileID      = Ext.util.md5('FNT-' + PhDOE.userLang + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNT-' + FileID)) {

            Ext.getCmp('main-panel').add(
            {
                id               : 'FNT-' + FileID,
                layout           : 'border',
                title            : FileName,
                originTitle      : FileName,
                iconCls          : 'iconTabNeedTranslate',
                closable         : true,
                tabLoaded        : false,
                panTRANSLoaded   : false, // Use to monitor if the translation panel is loaded
                panGGTRANSLoaded : false, // Use to monitor if the google translation panel is loaded
                defaults         : { split : true },
                tabTip           : String.format(
                    _('Need Translate: in {0}'), FilePath
                ),
                listeners : {
                    resize: function(panel) {
                        Ext.getCmp('FNT-GGTRANS-PANEL-' + FileID).setWidth(panel.getWidth()/2);
                    }
                },
                items : [new ui.component.FilePanel(
                    {
                        id             : 'FNT-TRANS-PANEL-' + FileID,
                        region         : 'center',
                        title          : _('New File: ') + PhDOE.userLang + FilePath + FileName,
                        isTrans        : true,
                        prefix         : 'FNT',
                        ftype          : 'TRANS',
                        spellCheck     : PhDOE.userConf.newFileSpellCheck,
                        spellCheckConf : 'newFileSpellCheck',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : PhDOE.userLang,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScrollCB   : true,
                        syncScroll     : true,
                        syncScrollConf : 'newFileScrollbars'
                    }), new ui.component.FilePanel(
                    {
                        id             : 'FNT-GGTRANS-PANEL-' + FileID,
                        region         : 'east',
                        title          : _('Automatic translation: ') + PhDOE.userLang + FilePath + FileName,
                        isTrans        : true,
                        prefix         : 'FNT',
                        ftype          : 'GGTRANS',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        readOnly       : true,
                        lang           : PhDOE.userLang,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScroll     : true,
                        syncScrollConf : 'newFileScrollbars'
                    })
                ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNT-' + FileID);
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            columns : ui.component._PendingTranslateGrid.columns,
            store   : new ui.component._PendingTranslateGrid.store({
                          proxy : new Ext.data.HttpProxy({
                              url : './do/getFilesNeedTranslate'
                          })
            }),
            tbar:[
                _('Filter: '), ' ',
                new Ext.form.TwinTriggerField({
                    id              : 'FNT-filter',
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    listeners : {
                        keypress : function(field, e)
                        {
                            if (e.getKey() == e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click: function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        this.setSize(180,10);
                        ui.component._PendingTranslateGrid.instance.store.clearFilter();
                    },
                    onTrigger2Click: function()
                    {
                        var v = this.getValue();

                        if (v === '' || v.length < 3) {
                            this.markInvalid(
                                _('Your filter must contain at least 3 characters')
                            );
                            return;
                        }
                        this.clearInvalid();
                        this.triggers[0].show();
                        this.setSize(180,10);
                        ui.component._PendingTranslateGrid.instance.store.filter('maintainer', v);
                    }
                })
            ]
        });
        ui.component.PendingTranslateGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

// singleton
ui.component._PendingTranslateGrid.instance = null;
ui.component.PendingTranslateGrid.getInstance = function(config)
{
    if (!ui.component._PendingTranslateGrid.instance) {
        if (!config) {
           config = {};
        }
        ui.component._PendingTranslateGrid.instance = new ui.component.PendingTranslateGrid(config);
    }
    return ui.component._PendingTranslateGrid.instance;
};
