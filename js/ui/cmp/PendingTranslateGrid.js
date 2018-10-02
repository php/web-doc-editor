Ext.namespace('ui', 'ui.cmp', 'ui.cmp._PendingTranslateGrid');

//------------------------------------------------------------------------------
// PendingTranslateGrid data store
ui.cmp._PendingTranslateGrid.store = new Ext.data.GroupingStore({
    proxy: new Ext.data.HttpProxy({
        url: './do/getFilesNeedTranslate'
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
            Ext.getDom('acc-need-translate-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingTranslateGrid view
ui.cmp._PendingTranslateGrid.view = new Ext.grid.GroupingView({
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
        if (r.data.fileModified) {

            var info = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            return (info.user === userToCompare && info.anonymousIdent === PhDOE.user.anonymousIdent) ? 'fileModifiedByMe' : 'fileModifiedByAnother';
        }

        return false;
    },
    emptyText: '<div style="text-align: center;">' + _('No Files') + '</div>'
});

// PendingTranslateGrid columns definition
ui.cmp._PendingTranslateGrid.columns = [{
    id: 'name',
    header: _('Files'),
    sortable: true,
    dataIndex: 'name',
    renderer: function(v, metada, r){
        if (r.data.fileModified) {

            var info = Ext.util.JSON.decode(r.data.fileModified), userToCompare;

            userToCompare = (PhDOE.user.isAnonymous) ? 'anonymous' : PhDOE.user.login;

            if (info.user === userToCompare && info.anonymousIdent === PhDOE.user.anonymousIdent) {
                return "<span ext:qtip='" + _('File modified by me') + "'>" + v + "</span>";
            }
            else {
                return "<span ext:qtip='" + String.format(_('File modified by {0}'), info.user) + "'>" + v + "</span>";
            }

        }
        else {
            return v;
        }
    }
}, {
    header: _('Path'),
    dataIndex: 'path',
    hidden: true
}];

// PendingTranslateGrid context menu
// config - { grid, rowIdx, event }
ui.cmp._PendingTranslateGrid.menu = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._StaleFileGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingTranslateGrid.menu, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                scope: this,
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconTabNeedTranslate',
                handler: function(){
                    this.grid.fireEvent('rowdblclick', this.grid, this.rowIdx, this.event);
                }
            }]
        });
    }
});


//------------------------------------------------------------------------------
// PendingTranslateGrid
ui.cmp.PendingTranslateGrid = Ext.extend(Ext.grid.GridPanel, {
    view: ui.cmp._PendingTranslateGrid.view,
    loadMask: true,
    autoExpandColumn: 'name',
    enableDragDrop: true,
    ddGroup: 'mainPanelDDGroup',
    border: false,

    onRowContextMenu: function(grid, rowIndex, e){
        e.stopEvent();

        grid.getSelectionModel().selectRow(rowIndex);

        new ui.cmp._PendingTranslateGrid.menu({
            grid: grid,
            event: e,
            rowIdx: rowIndex
        }).showAt(e.getXY());
    },

    onRowDblClick: function(grid, rowIndex){
        this.openFile(grid.store.getAt(rowIndex).data.id);
    },

    openFile: function(rowId){
        var storeRecord = this.store.getById(rowId), FilePath = storeRecord.data.path, FileName = storeRecord.data.name, FileID = Ext.util.md5('FNT-' + PhDOE.user.lang + FilePath + FileName), isSecondPanel;

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNT-' + FileID)) {

            if( PhDOE.user.conf.newFile.secondPanel == 'google' || PhDOE.user.conf.newFile.secondPanel == 'originalFile' ) {
                isSecondPanel = true;
            } else {
                isSecondPanel = false;
            }

            Ext.getCmp('main-panel').add({
                id: 'FNT-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedTranslate',
                closable: true,
                tabLoaded: false,
                panTRANSLoaded: false,
                panTRANSSecondLoaded: !isSecondPanel,
                defaults: {
                    split: true
                },
                tabTip: String.format(_('Need translate: in {0}'), FilePath),
                listeners: {
                    resize: function(panel){
                        if (PhDOE.user.conf.newFile.secondPanel == 'google') {
                            Ext.getCmp('FNT-GGTRANS-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                        }
                        if (PhDOE.user.conf.newFile.secondPanel == 'originalFile') {
                            Ext.getCmp('FNT-EN-PANEL-' + FileID).setWidth(panel.getWidth() / 2);
                        }
                    }
                },
                items: [{
                    region: 'west',
                    xtype: 'panel',
                    title: _('Tools'),
                    iconCls: 'iconConf',
                    collapsedIconCls: 'iconConf',
                    plugins: [Ext.ux.PanelCollapsedTitle],
                    collapsible: true,
                    collapsed: !PhDOE.user.conf.newFile.toolsPanelDisplay,
                    layout: 'fit',
                    bodyBorder: false,
                    width: PhDOE.user.conf.newFile.toolsPanelWidth || 375,
                    listeners: {
                        collapse: function(){
                            if ( this.ownerCt.tabLoaded ) {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : false,
                                    notify: false
                                });
                            }
                        },
                        expand: function(){
                            if ( this.ownerCt.tabLoaded ) {
                                new ui.task.UpdateConfTask({
                                    module   : 'newFile',
                                    itemName : 'toolsPanelDisplay',
                                    value : true,
                                    notify: false
                                });
                            }
                        },
                        resize: function(a, newWidth){
                            if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.newFile.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                new ui.task.UpdateConfTask({
                                    module     : 'newFile',
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
                        defaults: {
                            autoScroll: true
                        },
                        items: [new ui.cmp.DictionaryGrid({
                            layout: 'fit',
                            title: _('Dictionary'),
                            prefix: 'FNT',
                            fid: FileID
                        })]
                    }
                }, new ui.cmp.FilePanel({
                    id: 'FNT-TRANS-PANEL-' + FileID,
                    region: 'center',
                    title: _('New file: ') + PhDOE.user.lang + FilePath + FileName,
                    isTrans: true,
                    prefix: 'FNT',
                    ftype: 'TRANS',
                    spellCheck: PhDOE.user.conf.newFile.enableSpellCheck,
                    spellCheckConf: { module : 'newFile', itemName : 'enableSpellCheck' },
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: isSecondPanel,
                    syncScroll: isSecondPanel,
                    syncScrollConf: { module : 'newFile', itemName : 'syncScrollbars' }
                }), ((PhDOE.user.conf.newFile.secondPanel == 'google') ? new ui.cmp.FilePanel({
                    id: 'FNT-GGTRANS-PANEL-' + FileID,
                    // FNT-GGTRANS-PANEL-
                    region: 'east',
                    title: _('Automatic translation: ') + PhDOE.user.lang + FilePath + FileName,
                    isTrans: true,
                    prefix: 'FNT',
                    ftype: 'GGTRANS',
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    readOnly: true,
                    lang: PhDOE.user.lang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScroll: true,
                    syncScrollConf: { module : 'newFile', itemName : 'syncScrollbars' }
                }) : false),
                ((PhDOE.user.conf.newFile.secondPanel == 'originalFile') ? new ui.cmp.FilePanel({
                    id: 'FNT-EN-PANEL-' + FileID,
                    region: 'east',
                    title: _('File: ') + 'en' + FilePath + FileName,
                    prefix: 'FNT',
                    ftype: 'EN',
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    original: true,
                    readOnly: true,
                    lang: 'en',
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScroll: true,
                    syncScrollConf: { module : 'newFile', itemName : 'syncScrollbars' }
                }) : false)]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNT-' + FileID);
    },

    initComponent: function(){
        Ext.apply(this, {
            columns: ui.cmp._PendingTranslateGrid.columns,
            store: ui.cmp._PendingTranslateGrid.store,
            tbar: [_('Filter: '), ' ', new Ext.form.TwinTriggerField({
                id: 'FNT-filter',
                width: 180,
                hideTrigger1: true,
                enableKeyEvents: true,
                validateOnBlur: false,
                validationEvent: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                listeners: {
                    keypress: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    ui.cmp._PendingTranslateGrid.instance.store.clearFilter();
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

                    // We filter on 'path' and 'name'
                    ui.cmp._PendingTranslateGrid.instance.store.filterBy(function(record){

                        if (regexp.test(record.data.path) || regexp.test(record.data.name)) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }, this);
                }
            })]
        });
        ui.cmp.PendingTranslateGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick', this.onRowDblClick, this);
    }
});

// singleton
ui.cmp._PendingTranslateGrid.instance = null;
ui.cmp.PendingTranslateGrid.getInstance = function(config){
    if (!ui.cmp._PendingTranslateGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PendingTranslateGrid.instance = new ui.cmp.PendingTranslateGrid(config);
    }
    return ui.cmp._PendingTranslateGrid.instance;
};
