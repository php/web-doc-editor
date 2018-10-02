Ext.namespace('ui', 'ui.cmp', 'ui.cmp._RepositoryTree');

//------------------------------------------------------------------------------
// RepositoryTree internals

// RepositoryTree root node
ui.cmp._RepositoryTree.root = {
    nodeType: 'async',
    id: '/',
    text: _('Repository'),
    draggable: false
};

// RepositoryTree default tree loader
ui.cmp._RepositoryTree.loader = new Ext.tree.TreeLoader({
    dataUrl: './do/getAllFiles'
});

// RepositoryTree : window to add a new file
ui.cmp._RepositoryTree.winAddNewFile = Ext.extend(Ext.Window, {
    title: _('Add a new file'),
    iconCls: 'iconFilesNeedTranslate',
    id: 'win-add-new-file',
    layout: 'form',
    width: 350,
    height: 170,
    resizable: false,
    modal: true,
    bodyStyle: 'padding:5px 5px 0',
    labelWidth: 150,
    buttons: [{
        id: 'win-add-new-file-btn',
        text: _('Open the editor'),
        disabled: true,
        handler: function(){
            var cmp = Ext.getCmp('win-add-new-file'), parentFolder = cmp.node.id, newFileName = cmp.items.items[1].getValue(), skeleton = cmp.items.items[2].getValue();

            if (cmp.node.findChild("id", parentFolder + "/" + newFileName)) {
                // This file already exist.
                PhDOE.winForbidden('file_already_exist');
                return true;
            }

            cmp.openFile(parentFolder + "/", newFileName, skeleton);
            cmp.close();
            return true;

        }
    }],

    openFile: function(FilePath, FileName, skeleton){
        var FileID = Ext.util.md5('FNT-' + FilePath + FileName), storeRecord = {
            data: {
                fileModified: false,
                node: this.node
            }
        }, // simulate a needCommit option to fit with the classic comportement of FNT panel
        t = FilePath.split('/'), FileLang;

        t.shift();

        FileLang = t[0];

        t.shift();
        t.pop();

        FilePath = '/' + t.join('/') + '/';
        if (FilePath === "//") {
            FilePath = "/";
        }

        FileID = Ext.util.md5('FNT-' + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('FNT-' + FileID)) {

            Ext.getCmp('main-panel').add({
                id: 'FNT-' + FileID,
                layout: 'border',
                title: FileName,
                originTitle: FileName,
                iconCls: 'iconTabNeedTranslate',
                closable: true,
                tabLoaded: false,
                panTRANSLoaded: false,
                panGGTRANSLoaded: true, // Simulate true for google translate panel
                defaults: {
                    split: true
                },
                tabTip: String.format(_('New file: in {0}'), FileLang + FilePath),
                items: [new ui.cmp.FilePanel({
                    id: 'FNT-NEW-PANEL-' + FileID,
                    region: 'center',
                    title: _('New file: ') + FileLang + FilePath + FileName,
                    isTrans: true,
                    prefix: 'FNT',
                    ftype: 'NEW',
                    fid: FileID,
                    fpath: FilePath,
                    fname: FileName,
                    lang: FileLang,
                    parser: 'xml',
                    storeRecord: storeRecord,
                    syncScrollCB: false,
                    syncScroll: false,
                    skeleton: skeleton
                })]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('FNT-' + FileID);
    },

    initComponent: function(){
        Ext.apply(this, {
            items: [{
                xtype: 'displayfield',
                fieldLabel: _('Parent Folder'),
                value: this.node.id
            }, {
                xtype: 'textfield',
                fieldLabel: _('Name for the new file'),
                name: 'newFolderName',
                listeners: {
                    valid: function(){
                        Ext.getCmp('win-add-new-file-btn').enable();
                    },
                    invalid: function(){
                        Ext.getCmp('win-add-new-file-btn').disable();
                    }
                }
            }, {
                xtype: 'combo',
                triggerAction: 'all',
                width: 160,
                editable: false,
                store: new Ext.data.Store({
                    proxy: new Ext.data.HttpProxy({
                        url: './do/getSkeletonsNames'
                    }),
                    reader: new Ext.data.JsonReader({
                        root: 'Items',
                        idProperty: 'name',
                        fields: [{
                            name: 'name'
                        }, {
                            name: 'path'
                        }]
                    })
                }),
                listeners: {
                    select: function(c, r, n){
                        // If we haven't set any name for this file, we put the name of the skeleton
                        if (c.ownerCt.items.items[1].getValue() === "") {
                            c.ownerCt.items.items[1].setValue(r.data.name);
                        }

                    }
                },
                valueField: 'path',
                displayField: 'name',
                fieldLabel: _('Chose a skeleton')
            }]
        });
        ui.cmp._RepositoryTree.winAddNewFile.superclass.initComponent.call(this);
    }
});

// RepositoryTree : window to add a new folder
ui.cmp._RepositoryTree.winAddNewFolder = Ext.extend(Ext.Window, {
    title: _('Add a new folder'),
    iconCls: 'iconFolderNew',
    id: 'win-add-new-folder',
    layout: 'form',
    width: 350,
    height: 200,
    resizable: false,
    modal: true,
    bodyStyle: 'padding:5px 5px 0',
    labelWidth: 150,
    buttons: [{
        id: 'win-add-new-folder-btn',
        text: 'Add',
        disabled: true,
        handler: function(){
            var cmp = Ext.getCmp('win-add-new-folder'),
                parentFolder = cmp.node.id,
                newFolderName = cmp.items.items[1].getValue();

            XHR({
                params: {
                    task: 'addNewFolder',
                    parentFolder: parentFolder,
                    newFolderName: newFolderName
                },
                success: function(){
                    Ext.getCmp('win-add-new-folder').close();

                    cmp.node.reload();

                    // Notify
                    PhDOE.notify('info', _('Folder created'), String.format(_('Folder <br><br><b>{0}</b><br><br> was created sucessfully under {1} !'), newFolderName, parentFolder));
                },
                failure: function(r){
                    //Ext.getCmp('win-add-new-folder').close();
                    var o = Ext.util.JSON.decode(r.responseText);

                    if (o.type) {
                        PhDOE.winForbidden(o.type);
                    }
                    else {
                        PhDOE.winForbidden();
                    }
                }
            });
        }
    }],
    initComponent: function(){
        Ext.apply(this, {
            items: [{
                xtype: 'displayfield',
                fieldLabel: _('Parent Folder'),
                value: this.node.id
            }, {
                xtype: 'textfield',
                fieldLabel: _('Name for the new folder'),
                name: 'newFolderName',
                vtype: 'alphanum',
                listeners: {
                    valid: function(){
                        Ext.getCmp('win-add-new-folder-btn').enable();
                    },
                    invalid: function(){
                        Ext.getCmp('win-add-new-folder-btn').disable();
                    }
                }
            }, {
                xtype: 'box',
                html: _('Info: This new folder won\'t be commited until a new file will be commited into it. If you don\'t commit any new file into it until 8 days, it will be automatically deleted.')
            }]
        });
        ui.cmp._RepositoryTree.winAddNewFolder.superclass.initComponent.call(this);
    }
});

Ext.namespace('ui.cmp._RepositoryTree.menu');
// RepositoryTree folder context menu
// config - { node }
ui.cmp._RepositoryTree.menu.folder = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._RepositoryTree.menu.folder.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._RepositoryTree.menu.folder, Ext.menu.Menu, {
    init: function(){
        Ext.apply(this, {
            items: [{
                text: (this.node.isExpanded()) ? '<b>' + _('Collapse') + '</b>' : '<b>' + _('Expand') + '</b>',
                iconCls: 'iconFolderClose',
                scope: this,
                handler: function(){
                    if (this.node.isExpanded()) {
                        this.node.collapse();
                    }
                    else {
                        this.node.expand();
                    }
                }
            }, '-', {
                text: _('Update this folder'),
                disabled: true,
                iconCls: 'iconFilesNeedUpdate',
                scope: this,
                handler: function(){
                    // We start by expand this node.
                    this.node.expand();

                    //... and fire the update processus
                    new ui.task.UpdateSingleFolderTask(this.node);
                }
            }, {
                text: _('Add a new folder'),
                iconCls: 'iconFolderNew',
                hidden: (this.node.id === '/' ||
                (Ext.util.Format.substr(this.node.id, 0, 3) !== '/en' && Ext.util.Format.substr(this.node.id, 0, 9) !== '/doc-base')), // Don't allow to add a new folder into root system & in others root folder than /en & /doc-base
                scope: this,
                handler: function(){
                    // We start by expand this node.
                    this.node.expand();

                    // We display the Add New Folder window
                    var win = new ui.cmp._RepositoryTree.winAddNewFolder({
                        node: this.node
                    });
                    win.show(this.node.ui.getEl());
                }
            }, {
                text: _('Add a new file'),
                iconCls: 'iconFilesNeedTranslate',
                hidden: (this.node.id === '/' ||
                (Ext.util.Format.substr(this.node.id, 0, 3) !== '/en' && Ext.util.Format.substr(this.node.id, 0, 9) !== '/doc-base')), // Don't allow to add a new folder into root system & in others root folder than /en & /doc-base
                scope: this,
                handler: function(){
                    // We start by expand this node.
                    this.node.expand();

                    // We display the Add New Folder window
                    var win = new ui.cmp._RepositoryTree.winAddNewFile({
                        node: this.node
                    });
                    win.show(this.node.ui.getEl());
                }
            }]
        });
    }
});

// RepositoryTree file context menu
// config - { node }
ui.cmp._RepositoryTree.menu.file = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._RepositoryTree.menu.file.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._RepositoryTree.menu.file, Ext.menu.Menu, {
    init: function(){
        var FileName = this.node.attributes.text, t = this.node.attributes.id.split('/'), FileLang, FilePath;

        t.shift();
        FileLang = t[0];
        t.shift();
        t.pop();

        FilePath = t.join('/') + '/';

        Ext.apply(this, {
            items: [{
                text: '<b>' + _('Edit in a new tab') + '</b>',
                iconCls: 'iconTabNeedReviewed',
                scope: this,
                handler: function(){
                    ui.cmp._RepositoryTree.instance.fireEvent('dblclick', this.node);
                }
            }, {
                hidden: (this.node.attributes.from === 'search' || PhDOE.user.lang === 'en'),
                text: (FileLang === 'en') ? String.format(_('Open the same file in <b>{0}</b>'), Ext.util.Format.uppercase(PhDOE.user.lang)) : String.format(_('Open the same file in <b>{0}</b>'), 'EN'),
                iconCls: 'iconTabNeedReviewed',
                scope: this,
                handler: function(){
                    if (FileLang === 'en') {
                        ui.cmp._RepositoryTree.instance.openFile('byPath', PhDOE.user.lang + '/' + FilePath, FileName);
                    }
                    else {
                        ui.cmp._RepositoryTree.instance.openFile('byPath', 'en/' + FilePath, FileName);
                    }
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// RepositoryTree
ui.cmp.RepositoryTree = Ext.extend(Ext.ux.MultiSelectTreePanel, {
    animate: true,
    enableDD: true,
    ddGroup: 'mainPanelDDGroup',
    useArrows: true,
    autoScroll: true,
    border: false,
    containerScroll: true,
    root: ui.cmp._RepositoryTree.root,
    loader: ui.cmp._RepositoryTree.loader,

    onContextMenu: function(node, e){
        e.stopEvent();
        node.select();

        if (node.attributes.type === 'folder' || node.isRoot) {
            new ui.cmp._RepositoryTree.menu.folder({
                node: node
            }).showAt(e.getXY());
        }
        else
            if (node.attributes.type === 'file') {
                new ui.cmp._RepositoryTree.menu.file({
                    node: node
                }).showAt(e.getXY());
            }
    },

    onDblClick: function(node){
        if (node.attributes.type === 'file') // files only
        {
            this.openFile('byId', node.attributes.id, false);
        }
    },

    openFile: function(ftype, first, second){

        // Here, first argument is fpath and second, fname
        if (ftype === 'byPath') {
            Ext.getCmp('acc-all-files').expand();

            var fpath = first, fname = second, t = fpath.split('/'), cb = function(node){
                node.ensureVisible();
                if (t[0] && t[0] !== '') {
                    // walk into childs
                    for (var j = 0; j < node.childNodes.length; ++j) {
                        if (node.childNodes[j].text === t[0]) {
                            t.shift();
                            node.childNodes[j].expand(false, true, cb.createDelegate(this));
                        }
                    }
                }
                else {
                    // leaf node
                    for (var i = 0; i < node.childNodes.length; ++i) {
                        if (node.childNodes[i].text === fname) {
                            node.childNodes[i].ensureVisible();
                            node.childNodes[i].ui.highlight();
                            this.openFile('byId', node.childNodes[i].id, false);
                            //this.fireEvent('dblclick', node.childNodes[i]);
                        }
                    }
                }
            };
            this.root.expand(false, true, cb.createDelegate(this));
        }

        // Here, first argument is a nodeID. Second arguments don't exist
        if (ftype === 'byId') {
            var node = this.getNodeById(first), FilePath = node.attributes.id, extension = node.attributes.extension, t, FileID, FileLang, FileName, parser, panelWest, panelCenter;

            // CleanUp the path
            t = FilePath.split('/');
            t.shift();

            FileName = t.pop();

            FileLang = t.shift();
            FilePath = (t.length > 0) ? '/' + t.join('/') + '/' : '/';

            FileID = Ext.util.md5('AF-' + FileLang + FilePath + FileName);

            // Render only if this tab don't exist yet
            if (!Ext.getCmp('main-panel').findById('AF-' + FileID)) {

                if (extension !== 'html') {
                    parser = extension;
                }
                else {
                    parser = 'xml';
                }

                if (extension === 'gif' || extension === 'png' || extension === 'jpg') {
                    panelWest = {};

                    panelCenter = {
                        id: 'AF' + '-ALL-FILE-' + FileID, // We fake the content ID to allow closing this panel
                        xtype: 'panel',
                        region: 'center',
                        layout: 'fit',
                        bodyStyle: 'padding:5px 5px 0',
                        html: '<img src="./do/getImageContent?' +
                        'FileLang=' +
                        FileLang +
                        '&' +
                        'FilePath=' +
                        FilePath +
                        '&' +
                        'FileName=' +
                        FileName +
                        '&' +
                        'csrfToken=' +
                        csrfToken +
                        '" />'
                    };

                }
                else {

                    panelWest = {
                        xtype: 'panel',
                        region: 'west',
                        title: _('Tools'),
                        iconCls: 'iconConf',
                        collapsedIconCls: 'iconConf',
                        plugins: [Ext.ux.PanelCollapsedTitle],
                        layout: 'fit',
                        bodyBorder: false,
                        split: true,
                        collapsible: true,
                        collapsed: !PhDOE.user.conf.allFiles.toolsPanelDisplay,
                        width: PhDOE.user.conf.allFiles.toolsPanelWidth || 375,
                        listeners: {
                            collapse: function(){
                                if (this.ownerCt.tabLoaded) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'allFiles',
                                        itemName : 'toolsPanelDisplay',
                                        value: false,
                                        notify: false
                                    });
                                }
                            },
                            expand: function(){
                                if (this.ownerCt.tabLoaded) {
                                    new ui.task.UpdateConfTask({
                                        module   : 'allFiles',
                                        itemName : 'toolsPanelDisplay',
                                        value: true,
                                        notify: false
                                    });
                                }
                            },
                            resize: function(a, newWidth){
                                if (this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.user.conf.allFiles.toolsPanelWidth) { // As the type is different, we can't use !== to compare with !
                                    new ui.task.UpdateConfTask({
                                        module     : 'allFiles',
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
                            defaults: {
                                autoScroll: true
                            },
                            items: [{
                                title: _('Log'),
                                layout: 'fit',
                                items: [new ui.cmp.VCSLogGrid({
                                    prefix: 'AF',
                                    fid: FileID,
                                    fpath: FileLang + FilePath,
                                    fname: FileName,
                                    loadStore: PhDOE.user.conf.allFiles.toolsPanelLogLoad
                                })]
                            }, {
                                title: _('Entities'),
                                layout: 'fit',
                                items: [new ui.cmp.EntitiesAcronymsPanel({
                                    dataType: 'entities',
                                    prefix: 'AF',
                                    ftype: 'ALL',
                                    fid: FileID,
                                    loadStore: PhDOE.user.conf.allFiles.toolsPanelEntitiesLoad
                                })]
                            }, {
                                title: _('Acronyms'),
                                layout: 'fit',
                                items: [new ui.cmp.EntitiesAcronymsPanel({
                                    dataType: 'acronyms',
                                    prefix: 'AF',
                                    ftype: 'ALL',
                                    fid: FileID,
                                    loadStore: PhDOE.user.conf.allFiles.toolsPanelAcronymsLoad
                                })]
                            }]
                        }
                    };

                    panelCenter = new ui.cmp.FilePanel({
                        id: 'AF' + '-ALL-PANEL-' + FileID,
                        region: 'center',
                        title: _('File: ') + FileLang + FilePath + FileName,
                        prefix: 'AF',
                        ftype: 'ALL',
                        spellCheck: PhDOE.user.conf.allFiles.enableSpellCheck,
                        spellCheckConf: {module : 'allFiles', itemName : 'enableSpellCheck'},
                        fid: FileID,
                        fpath: FilePath,
                        fname: FileName,
                        lang: FileLang,
                        parser: parser,
                        storeRecord: node,
                        syncScrollCB: false,
                        syncScroll: false
                    });
                }

                Ext.getCmp('main-panel').add({
                    id: 'AF-' + FileID,
                    layout: 'border',
                    title: FileName,
                    originTitle: FileName,
                    closable: true,
                    tabLoaded: false,
                    panEntities: !PhDOE.user.conf.allFiles.toolsPanelEntitiesLoad,
                    panAcronyms: !PhDOE.user.conf.allFiles.toolsPanelAcronymsLoad,
                    panVCS: !PhDOE.user.conf.allFiles.toolsPanelLogLoad,
                    panLoaded: false,
                    tabTip: String.format(_('in {0}'), FilePath),
                    iconCls: 'iconAllFiles',
                    items: [panelCenter, panelWest]
                });
            }
            Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);
        }
    },

    initComponent: function(){
        Ext.apply(this, {
            tbar: [_('Search: '), ' ', new Ext.form.TwinTriggerField({
                id: 'AF-search',
                validationEvent: false,
                validateOnBlur: false,
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger',
                hideTrigger1: true,
                width: 180,
                enableKeyEvents: true,
                listeners: {
                    keypress: function(field, e){
                        if (e.getKey() === e.ENTER) {
                            this.onTrigger2Click();
                        }
                    }
                },
                onTrigger1Click: function(){
                    var instance = ui.cmp._RepositoryTree.instance;
                    this.setValue('');
                    this.triggers[0].hide();
                    this.setSize(180, 10);
                    instance.root.setText(_('Repository'));

                    // clear search
                    delete instance.loader.baseParams.search;
                    instance.root.reload();
                },
                onTrigger2Click: function(){
                    var instance = ui.cmp._RepositoryTree.instance, v = this.getValue();

                    if (v === '' || v.length < 3) {
                        this.markInvalid(_('Your search must contain at least 3 characters'));
                        return;
                    }
                    this.clearInvalid();

                    this.triggers[0].show();
                    this.setSize(180, 10);

                    // carry search
                    instance.loader.baseParams.search = v;
                    instance.root.reload(function(){
                        instance.root.setText(String.format(_('Search result: {0}'), instance.root.childNodes.length));
                    });
                }
            })]
        });
        ui.cmp.RepositoryTree.superclass.initComponent.call(this);

        this.on('contextmenu', this.onContextMenu, this);
        this.on('dblclick', this.onDblClick, this);

        new Ext.tree.TreeSorter(this, {
            folderSort: true
        });
    }
});

// singleton
ui.cmp._RepositoryTree.instance = null;
ui.cmp.RepositoryTree.getInstance = function(config){
    if (!ui.cmp._RepositoryTree.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._RepositoryTree.instance = new ui.cmp.RepositoryTree(config);
    }
    return ui.cmp._RepositoryTree.instance;
};
