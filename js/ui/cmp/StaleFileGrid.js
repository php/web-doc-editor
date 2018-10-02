Ext.namespace('ui', 'ui.cmp', 'ui.cmp._StaleFileGrid');

//------------------------------------------------------------------------------
// StaleFileGrid data store

ui.cmp._StaleFileGrid.store = new Ext.data.GroupingStore({
    proxy: new Ext.data.HttpProxy({
        url: './do/getFilesNeedUpdate'
    }),
    reader: new Ext.data.JsonReader({
        root: 'Items',
        totalProperty: 'nbItems',
        idProperty: 'id',
        fields: [{
            name: 'id'
        }, {
            name: 'path'
        }, {
            name: 'name'
        }, {
            name: 'revision'
        }, {
            name: 'original_revision'
        }, {
            name: 'en_revision'
        }, {
            name: 'maintainer'
        }, {
            name: 'fileModified'
        }]
    }),
    sortInfo: {
        field: 'name',
        direction: 'ASC'
    },
    groupField: 'path',
    listeners: {
        datachanged: function(ds){

            var nbItems = ds.getCount(),
                nbItemsForCurrentUser = false;

            if( PhDOE.user.haveKarma )
            {
                ds.each(function(record) {

                    if( record.data.maintainer == PhDOE.user.login ) {
                        nbItemsForCurrentUser ++;
                    }

                }, this);

            }

            if( nbItemsForCurrentUser )
            {
                Ext.getDom('acc-need-update-nb').innerHTML = nbItems + ' - '+ String.format(_('{0} mine'), nbItemsForCurrentUser);
            } else {
                Ext.getDom('acc-need-update-nb').innerHTML = nbItems;
            }

        }
    }
});

// StaleFileGrid view
ui.cmp._StaleFileGrid.view = new Ext.grid.GroupingView({
    forceFit: true,
    startCollapsed: true,
    groupTextTpl: '{[values.rs[0].data["path"]]} ' +
    '({[values.rs.length]} ' +
    '{[values.rs.length > 1 ? "' +
    _('Files') +
    '" : "' +
    _('File') +
    '"]})',
    deferEmptyText: false,
    getRowClass: function(r){
        if ( r.data.fileModified ) {

            var infoLang = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            return ((infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent)) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }

        return false;
    },
    emptyText: '<div style="text-align: center;">' + _('No Files') + '</div>'
});

// StaleFileGrid columns definition
ui.cmp._StaleFileGrid.columns = [{
    id: 'name',
    header: _('Files'),
    sortable: true,
    dataIndex: 'name',
    renderer: function(v, metada, r){

        var mess = '', infoLang, userToCompare;

        userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

        if (r.data.fileModified) {

            infoLang = Ext.util.JSON.decode(r.data.fileModified);

            if (infoLang.user === userToCompare && infoLang.anonymousIdent === PhDOE.user.anonymousIdent) {
                mess += String.format(_('File {0} modified by me'), PhDOE.user.lang.ucFirst());
            }
            else {
                mess += String.format(_('File {0} modified by {1}'), PhDOE.user.lang.ucFirst(), infoLang.user);
            }
        }

        if (mess !== '') {
            return "<span ext:qtip='" + mess + "'>" + v + "</span>";
        }
        else {
            return v;
        }
    }
}, {
    header: _('EN revision'),
    width: 45,
    sortable: true,
    dataIndex: 'en_revision'
}, {
    header: '', // bounded in StaleFileGrid.initComponent
    width: 45,
    sortable: true,
    dataIndex: 'revision'
}, {
    header: _('Maintainer'),
    width: 45,
    sortable: true,
    dataIndex: 'maintainer'
}, {
    header: _('Path'),
    dataIndex: 'path',
    'hidden': true
}];

// StaleFileGrid context menu
// config - { hideDiffMenu, grid, rowIdx, event, lang, fpath, fname }
ui.cmp._StaleFileGrid.menu = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._StaleFileGrid.menu.superclass.constructor.call(this);
};

Ext.extend(ui.cmp._StaleFileGrid.menu, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                scope: this,
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconTabNeedUpdate',
                handler: function(){
                    this.grid.fireEvent('rowdblclick', this.grid, this.rowIdx, this.event);
                }
            }, {
                scope: this,
                hidden: this.hideDiffMenu,
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                handler: function()
                {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: this.fname,
                        FilePath: PhDOE.user.lang+this.fpath
                    });
                }
            }]
        });
    }
});


//------------------------------------------------------------------------------
// StaleFileGrid
ui.cmp.StaleFileGrid = Ext.extend(Ext.grid.GridPanel, {
    view: ui.cmp._StaleFileGrid.view,
    loadMask: true,
    autoExpandColumn: 'name',
    border: false,
    enableDragDrop: true,
    ddGroup: 'mainPanelDDGroup',

    onRowContextMenu: function(grid, rowIndex, e){
        e.stopEvent();

        var data = this.store.getAt(rowIndex).data, FilePath = data.path, FileName = data.name;

        this.getSelectionModel().selectRow(rowIndex);

        new ui.cmp._StaleFileGrid.menu({
            hideDiffMenu: ( data.fileModified === false ),
            grid: this,
            event: e,
            rowIdx: rowIndex,
            lang: PhDOE.user.lang,
            fpath: FilePath,
            fname: FileName
        }).showAt(e.getXY());
    },

    onRowDblClick: function(grid, rowIndex){
        this.openFile(this.store.getAt(rowIndex).data.id);
    },

    openFile: function(rowId){
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, en_revision = storeRecord.data.en_revision, revision = storeRecord.data.revision, originalRevision = storeRecord.data.original_revision, FileID = Ext.util.md5('FNU-' + PhDOE.user.lang + FilePath + FileName), diff = '';

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNU-' + FileID))
        {
            if (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc") {
                diff = ui.cmp.ViewVCDiff;
            }
            else if (PhDOE.user.conf.needUpdate.diffMethod === "using-exec") {
                    diff = ui.cmp.ExecDiff;
            }

            Ext.getCmp('main-panel').add({
                id: 'FNU-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedUpdate',
                closable: true,
                tabLoaded: false,
                panVCSLang: !PhDOE.user.conf.needUpdate.toolsPanelLogLoad,
                panVCSEn: !PhDOE.user.conf.needUpdate.toolsPanelLogLoad,
                panDiffLoaded: (PhDOE.user.conf.needUpdate.diffMethod === "using-viewvc"),
                panLANGLoaded: false,
                panENLoaded: false,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('Need Update: in {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        Ext.getCmp('FNU-EN-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                    }
                },
                items: [new diff({
                    region: 'north',
                    collapsible: true,
                    height: PhDOE.user.conf.needUpdate.diffPanelHeight || 150,
                    prefix: 'FNU',
                    collapsed: !PhDOE.user.conf.needUpdate.diffPanelDisplay,
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    rev1: (originalRevision) ? originalRevision : revision,
                    rev2: en_revision,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value: false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'diffPanelDisplay',
                                    value: true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, b, newHeight){

                            if (this.ownerCt.tabLoaded && newHeight && newHeight > 50 && newHeight != PhDOE.user.conf.needUpdate.diffPanelHeight) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'needUpdate',
                                    itemName   : 'diffPanelHeight',
                                    value: newHeight,
                                    notify: false
                                });
                            }
                        }
                    }
                }), {
                    region: 'west',
                    xtype: 'panel',
                    title: _('Tools'),
                    iconCls: 'iconConf',
                    collapsedIconCls: 'iconConf',
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.needUpdate.toolsPanelDisplay,
                    layout: 'fit',
                    bodyBorder: false,
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    width: PhDOE.user.conf.needUpdate.toolsPanelWidth || 375,
                    listeners: {
                        collapse: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value: false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if (this.ownerCt.tabLoaded) {
                                new ui.task.UpdateConfTask({
                                    module   : 'needUpdate',
                                    itemName : 'toolsPanelDisplay',
                                    value: true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, newWidth){
                            if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.needUpdate.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'needUpdate',
                                    itemName   : 'toolsPanelWidth',
                                    value: newWidth,
                                    notify: false
                                });
                            }
                        }
                    },
                    items: {
                        xtype: 'tabpanel',
                        activeTab: 0,
                        tabPosition: 'bottom',
                        enableTabScroll: true,
                        defaults: {
                            autoScroll: true
                        },
                        items: [new ui.cmp.VCSLogGrid({
                            layout: 'fit',
                            title: String.format(_('{0} Log'), PhDOE.user.lang.ucFirst()),
                            prefix: 'FNU-LANG',
                            fid: FileID,
                            fpath: PhDOE.user.lang + FilePath,
                            fname: FileName,
                            loadStore: PhDOE.user.conf.needUpdate.toolsPanelLogLoad
                        }), new ui.cmp.VCSLogGrid({
                            layout: 'fit',
                            title: String.format(_('{0} Log'), 'En'),
                            prefix: 'FNU-EN',
                            fid: FileID,
                            fpath: 'en' + FilePath,
                            fname: FileName,
                            loadStore: PhDOE.user.conf.needUpdate.toolsPanelLogLoad
                        }), new ui.cmp.DictionaryGrid({
                            layout: 'fit',
                            title: _('Dictionary'),
                            prefix: 'FNU',
                            fid: FileID
                        })]
                    }
                }, new ui.cmp.FilePanel({
                    id: 'FNU-LANG-PANEL-' + FileID,
                    region: 'center',
                    title: String.format(_('{0} File: '), PhDOE.user.lang) + FilePath + FileName,
                    prefix: 'FNU',
                    ftype: 'LANG',
                    spellCheck: PhDOE.user.conf.needUpdate.enableSpellCheckLang,
                    spellCheckConf: { module : 'needUpdate', itemName : 'enableSpellCheckLang' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: true,
                    syncScroll: true,
                    syncScrollConf: { module : 'needUpdate', itemName : 'syncScrollbars' }
                }), new ui.cmp.FilePanel({
                    id: 'FNU-EN-PANEL-' + FileID,
                    region: 'east',
                    title: _('en File: ') + FilePath + FileName,
                    prefix: 'FNU',
                    ftype: 'EN',
                    original: true,
                    readOnly: true,
                    openInNewTabBtn: true,
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: 'en',
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScroll: true,
                    syncScrollConf: { module : 'needUpdate', itemName : 'syncScrollbars' }
                })]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNU-' + FileID);
    },

    initComponent: function(){
        ui.cmp._StaleFileGrid.columns[2].header = String.format(_('{0} revision'), Ext.util.Format.uppercase(PhDOE.user.lang));

        Ext.apply(this, {
            columns: ui.cmp._StaleFileGrid.columns,
            store: ui.cmp._StaleFileGrid.store,
            tbar: [_('Filter: '), ' ', new Ext.form.TwinTriggerField({
                id: 'FNU-filter',
                width: 180,
                hideTrigger1: true,
                enableKeyEvents: true,
                validateOnBlur: false,
                validationEvent: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                listeners: {
                    specialkey: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    ui.cmp._StaleFileGrid.instance.store.clearFilter();
                },
                onTrigger2Click: function(){
                    var v = this.getValue(), regexp;

                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your filter must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();
                    this.triggers[0].show();
                    this.setSize(180, 10);

                    regexp = new RegExp(v, 'i');

                    // We filter on 'path', 'name', 'revision', 'en_revision', 'maintainer'
                    ui.cmp._StaleFileGrid.instance.store.filterBy(function(record){

                        if (regexp.test(record.data.path) ||
                        regexp.test(record.data.name) ||
                        regexp.test(record.data.revision) ||
                        regexp.test(record.data.en_revision) ||
                        regexp.test(record.data.maintainer)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }, this);
                }
            })]
        });
        ui.cmp.StaleFileGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick', this.onRowDblClick, this);
    }
});

// singleton
ui.cmp._StaleFileGrid.instance = null;
ui.cmp.StaleFileGrid.getInstance = function(config){
    if (!ui.cmp._StaleFileGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._StaleFileGrid.instance = new ui.cmp.StaleFileGrid(config);
    }
    return ui.cmp._StaleFileGrid.instance;
};
