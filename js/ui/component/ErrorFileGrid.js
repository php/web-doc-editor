Ext.namespace('ui','ui.component','ui.component._ErrorFileGrid');

//------------------------------------------------------------------------------
// ErrorFileGrid internals

// ErrorFileGrid store
ui.component._ErrorFileGrid.store = Ext.extend(Ext.data.GroupingStore,
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
                name    : 'maintainer',
                mapping : 'maintainer'
            }, {
                name    : 'type',
                mapping : 'type'
            }, {
                name    : 'value_en',
                mapping : 'value_en'
            }, {
                name    : 'value_lang',
                mapping : 'value_lang'
            }, {
                name    : 'needcommit',
                mapping : 'needcommit'
            }
        ])
    ),
    sortInfo : {
        field     : 'path',
        direction : "ASC"
    },
    groupField : 'path',
    listeners : {
        datachanged : function(ds)
        {
            Ext.getDom('acc-error-nb').innerHTML = ds.getCount();
        }
    }
});

// ErrorFileGrid columns definition
ui.component._ErrorFileGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Type'),
    width     : 45,
    sortable  : true,
    dataIndex : 'type'
}, {
    header    : _('Maintainer'),
    width     : 45,
    sortable  : true,
    dataIndex : 'maintainer'
}, {
    header    : _('Path'),
    dataIndex : 'path',
    'hidden'  : true
}];

// ErrorFileGrid view
ui.component._ErrorFileGrid.view = new Ext.grid.GroupingView({
    emptyText    : '<div style="text-align: center;">'+_('No Files')+'</div>',
    deferEmptyText: false,
    forceFit     : true,
    startCollapsed : true,
    groupTextTpl : '{[values.rs[0].data["path"]]} ' +
                   '({[values.rs.length]} ' +
                   '{[values.rs.length > 1 ? "'+_('Files')+'" : "'+_('File')+'"]})',
    getRowClass  : function(record, numIndex, rowParams, store)
    {
        if (record.data.needcommit) {
            return 'file-need-commit';
        }
    }
});

// ErrorFileGrid context menu
// config - { hideCommit, grid, rowIdx, event, lang, fpath, fname }
ui.component._ErrorFileGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._ErrorFileGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.component._ErrorFileGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>'+_('Edit in a new Tab')+'</b>',
                iconCls : 'FilesError',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIdx, this.event
                    );
                }
            }, {
                scope   : this,
                hidden  : this.hideCommit,
                text    : ('View Diff'),
                iconCls : 'iconViewDiff',
                handler : function()
                {
                    // Add tab for the diff
                    Ext.getCmp('main-panel').add({
                        xtype      : 'panel',
                        id         : 'diff_panel_' + this.rowIdx,
                        title      : _('Diff'),
                        tabTip     : _('Diff'),
                        closable   : true,
                        autoScroll : true,
                        iconCls    : 'iconTabLink',
                        html       : '<div id="diff_content_' + this.rowIdx +
                                     '" class="diff-content"></div>'
                    });
                    Ext.getCmp('main-panel').setActiveTab('diff_panel_' + this.rowIdx);

                    Ext.get('diff_panel_' + this.rowIdx).mask(
                        '<img src="themes/img/loading.gif" ' +
                        'style="vertical-align: middle;" />' +
                        _('Please, wait...')
                    );

                    // Load diff data
                    XHR({
                        scope   : this,
                        params  : {
                            task     : 'getDiff',
                            FilePath : this.lang + this.fpath,
                            FileName : this.fname
                        },
                        success : function(response)
                        {
                            var o = Ext.util.JSON.decode(response.responseText);
                            // We display in diff div
                            Ext.get('diff_content_' + this.rowIdx).dom.innerHTML = o.content;
                            Ext.get('diff_panel_' + this.rowIdx).unmask();
                        }
                    });
                }
            }, '-', {
                text    : _('About error type'),
                iconCls : 'iconHelp',
                handler : function()
                {
                    if (!Ext.getCmp('main-panel').findById('FE-help')) {

                        Ext.getCmp('main-panel').add({
                            id         : 'FE-help',
                            title      : _('About error type'),
                            iconCls    : 'iconHelp',
                            closable   : true,
                            autoScroll : true,
                            autoLoad   : './error'
                        });
                        Ext.getCmp('main-panel').setActiveTab('FE-help');

                    } else {
                        Ext.getCmp('main-panel').setActiveTab('FE-help');
                    }
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// ErrorFileGrid
ui.component.ErrorFileGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',
    view    : ui.component._ErrorFileGrid.view,
    columns : ui.component._ErrorFileGrid.columns,

    listeners : {
        render : function(grid)
        {
            grid.view.refresh();
        },
        rowcontextmenu : function(grid, rowIndex, e)
        {

            e.stopEvent();
        
            var FilePath = grid.store.getAt(rowIndex).data.path,
                FileName = grid.store.getAt(rowIndex).data.name,
                tmp;

            grid.getSelectionModel().selectRow(rowIndex);

            tmp = new ui.component._ErrorFileGrid.menu({
                hideCommit : (grid.store.getAt(rowIndex).data.needcommit === false),
                grid       : grid,
                event      : e,
                rowIdx     : rowIndex,
                lang       : phpDoc.userLang,
                fpath      : FilePath,
                fname      : FileName
            }).showAt(e.getXY());
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            this.openFile(grid.store.getAt(rowIndex).data.id);
        }
    },

    openFile : function(rowId) 
    {

        var storeRecord = this.store.getById(rowId),
            FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileID      = Ext.util.md5('FE-' + phpDoc.userLang + FilePath + FileName),
            error       = [];

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FE-' + FileID)) {

            // Find all error for this file to pass to error_type.php page
            error = [];

            this.store.each(function(record)
            {
                if ( record.data.path === FilePath && record.data.name === FileName && !error[record.data.type] ) {
                    error.push(record.data.type);
                }
            });

            Ext.getCmp('main-panel').add({
                id          : 'FE-' + FileID,
                title       : FileName,
                layout      : 'border',
                iconCls     : 'iconTabError',
                closable    : true,
                originTitle : FileName,
                defaults    : { split : true },
                tabTip      : String.format(
                    _('File with error : in {0}'), FilePath
                ),
                listeners: {
                    resize: function(panel) {
                        Ext.getCmp('FE-EN-PANEL-' + FileID).setWidth(panel.getWidth()/2);
                    }
                },
                items : [
                    {
                        xtype       : 'panel',
                        id          : 'FE-error-desc-' + FileID,
                        region      : 'north',
                        layout      : 'fit',
                        title       : _('Error description'),
                        height      : 150,
                        collapsible : true,
                        collapsed   : true,
                        autoScroll  : true,
                        autoLoad    : './error?dir=' + FilePath +
                                                '&file=' + FileName
                    }, {
                        region      : 'west',
                        xtype       : 'panel',
                        title       : _('VCSLog'),
                        collapsible : true,
                        collapsed   : true,
                        layout      : 'fit',
                        bodyBorder  : false,
                        width       : 375,
                        items       : {
                            xtype       : 'tabpanel',
                            activeTab   : 0,
                            tabPosition : 'bottom',
                            defaults    : { autoScroll : true },
                            items       : [
                                new ui.component.VCSLogGrid({
                                    layout    : 'fit',
                                    title     : phpDoc.userLang,
                                    prefix    : 'FE-LANG',
                                    fid       : FileID,
                                    fpath     : phpDoc.userLang + FilePath,
                                    fname     : FileName,
                                    loadStore : phpDoc.userConf["errorDisplayLog"]
                                }),
                                new ui.component.VCSLogGrid({
                                    layout    : 'fit',
                                    title     : 'en',
                                    prefix    : 'FE-EN',
                                    fid       : FileID,
                                    fpath     : 'en' + FilePath,
                                    fname     : FileName,
                                    loadStore : phpDoc.userConf["errorDisplayLog"]
                                })
                            ]
                        }
                    }, new ui.component.FilePanel(
                    {
                        id             : 'FE-LANG-PANEL-' + FileID,
                        region         : 'center',
                        title          : String.format(_('{0} File: '), phpDoc.userLang) + FilePath + FileName,
                        prefix         : 'FE',
                        ftype          : 'LANG',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : phpDoc.userLang,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScrollCB   : true,
                        syncScroll     : true,
                        syncScrollConf : 'errorScrollbars'
                    }), new ui.component.FilePanel(
                    {
                        id             : 'FE-EN-PANEL-' + FileID,
                        region         : 'east',
                        title          : _('en File: ') + FilePath + FileName,
                        prefix         : 'FE',
                        ftype          : 'EN',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : 'en',
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScroll     : true,
                        syncScrollConf : 'errorScrollbars'
                    })
                ]
            });
            Ext.getCmp('main-panel').setActiveTab('FE-' + FileID);

            // Set the bg image for north collapsed el
            if (Ext.getCmp('FE-' + FileID).getLayout().north.collapsedEl) {
                Ext.getCmp('FE-' + FileID).getLayout().north.collapsedEl.addClass(
                    'x-layout-collapsed-east-error-desc'
                );
            }

        } else {
            // This tab already exist. We focus it.
            Ext.getCmp('main-panel').setActiveTab('FE-' + FileID);
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : new ui.component._ErrorFileGrid.store({
                proxy : new Ext.data.HttpProxy({
                    url : './do/getFilesError'
                })
            }),
            tbar : [
                _('Filter: '), ' ',
                new Ext.form.TwinTriggerField({
                    id              : 'FE-filter',
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,

                    validateOnBlur  :  false,
                    validationEvent : false,

                    trigger1Class : 'x-form-clear-trigger',
                    trigger2Class : 'x-form-search-trigger',

                    listeners : {
                        keypress : function(field, e)
                        {
                            if (e.getKey() === e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click : function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        ui.component._ErrorFileGrid.instance.store.clearFilter();
                    },
                    onTrigger2Click : function()
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
                        ui.component._ErrorFileGrid.instance.store.filter('maintainer', v);
                    }
                })
            ]
        });
        ui.component.ErrorFileGrid.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._ErrorFileGrid.instance = null;
ui.component.ErrorFileGrid.getInstance = function(config)
{
    if (!ui.component._ErrorFileGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.component._ErrorFileGrid.instance = new ui.component.ErrorFileGrid(config);
    }
    return ui.component._ErrorFileGrid.instance;
};
