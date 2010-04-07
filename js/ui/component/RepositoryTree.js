Ext.namespace('ui','ui.component','ui.component._RepositoryTree');

//------------------------------------------------------------------------------
// RepositoryTree internals

// RepositoryTree root node
ui.component._RepositoryTree.root = {
    nodeType  : 'async',
    id        : '/',
    text      : _('Repository'),
    draggable : false
};

// RepositoryTree default tree loader
ui.component._RepositoryTree.loader = new Ext.tree.TreeLoader({
    dataUrl : './do/getAllFiles'
});

// RepositoryTree : window to add a new folder
ui.component._RepositoryTree.winAddNewFolder = Ext.extend(Ext.Window,
{
    title      : _('Add a new folder'),
    iconCls    : 'iconFolderNew',
    id         : 'win-add-new-folder',
    layout     : 'form',
    width      : 350,
    height     : 200,
    resizable  : false,
    modal      : true,
    bodyStyle  : 'padding:5px 5px 0',
    labelWidth : 150,
    buttons : [{
        id   : 'win-add-new-folder-btn',
        text : 'Add',
        disabled: true,
        handler : function()
        {
            var cmp = Ext.getCmp('win-add-new-folder');
            var parentFolder = cmp.node.id;
            var newFolderName = cmp.items.items[1].getValue();

            XHR({
                params  : {
                    task          : 'addNewFolder',
                    parentFolder  : parentFolder,
                    newFolderName : newFolderName
                },
                success : function()
                {
                    Ext.getCmp('win-add-new-folder').close();

                    cmp.node.reload();

                    // Notify
                    PhDOE.notify('info', _('Folder created'), String.format(_('Folder <br><br><b>{0}</b><br><br> was created sucessfully under {1} !'), newFolderName, parentFolder));


                },
                failure : function()
                {
                    Ext.getCmp('win-add-new-folder').close();
                    console.log('error');
                }
            });
        }
    }],
    initComponent : function()
    {
        Ext.apply(this,
        {
            items: [{
                xtype      : 'displayfield',
                fieldLabel : 'Parent Folder',
                value      : this.node.id
            }, {
                xtype      : 'textfield',
                fieldLabel : 'Name for the new folder',
                name       : 'newFolderName',
                vtype      : 'alphanum',
                listeners: {
                    valid: function()
                    {
                        Ext.getCmp('win-add-new-folder-btn').enable();
                    },
                    invalid: function()
                    {
                        Ext.getCmp('win-add-new-folder-btn').disable();
                    }
                }
            },{
                xtype : 'box',
                html  : _('Info: This new folder won\'t be commited until a new file will be commited into it. If you don\'t commit any new file into it until 8 days, it will be automatically deleted.')
            }]
        });
        ui.component._RepositoryTree.winAddNewFolder.superclass.initComponent.call(this);
    }
});

Ext.namespace('ui.component._RepositoryTree.menu');
// RepositoryTree folder context menu
// config - { node }
ui.component._RepositoryTree.menu.folder = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._RepositoryTree.menu.folder.superclass.constructor.call(this);
};
Ext.extend(ui.component._RepositoryTree.menu.folder, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                text    : (this.node.isExpanded()) ? '<b>' + _('Collapse') + '</b>' : '<b>' + _('Expand') + '</b>',
                iconCls : 'iconFolderClose',
                scope   : this,
                handler : function()
                {
                    if (this.node.isExpanded()) {
                        this.node.collapse();
                    }
                    else {
                        this.node.expand();
                    }
                }
            },'-', {
                text    : _('Update this folder'),
                iconCls : 'iconFilesNeedUpdate',
                scope   : this,
                handler : function()
                {
                    // We start by expand this node.
                    this.node.expand();

                    //... and fire the update processus
                    new ui.task.UpdateSingleFolderTask(this.node);
                }
            }, {
                text    : _('Add a new folder'),
                iconCls : 'iconFolderNew',
                hidden  : (this.node.id === '/'), // Don't allow to add a new folder into root system
                scope   : this,
                handler : function()
                {
                    // We start by expand this node.
                    this.node.expand();

                    // We display the Add New Folder window
                    var win = new ui.component._RepositoryTree.winAddNewFolder({node : this.node});
                    win.show(this.node.ui.getEl());
                }
            }]
        });
    }
});

// RepositoryTree file context menu
// config - { node }
ui.component._RepositoryTree.menu.file = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._RepositoryTree.menu.file.superclass.constructor.call(this);
};
Ext.extend(ui.component._RepositoryTree.menu.file, Ext.menu.Menu,
{
    init : function()
    {
        var FileName = this.node.attributes.text,
            t        = this.node.attributes.id.split('/'),
            FileLang, FilePath;

            t.shift();
            FileLang = t[0];
            t.shift();
            t.pop();

            FilePath = t.join('/') + '/';
 
        Ext.apply(this,
        {
            items : [{
                text    : '<b>'+_('Edit in a new Tab')+'</b>',
                iconCls : 'iconTabNeedReviewed',
                scope   : this,
                handler : function()
                {
                    ui.component._RepositoryTree.instance.fireEvent('dblclick', this.node);
                }
            }, {
                hidden  : (this.node.attributes.from === 'search' || PhDOE.userLang == 'en' ),
                text    : (FileLang === 'en') ? String.format( _('Open the same file in <b>{0}</b>'), Ext.util.Format.uppercase(PhDOE.userLang)) : String.format( _('Open the same file in <b>{0}</b>'), 'EN'),
                iconCls : 'iconTabNeedReviewed',
                scope   : this,
                handler : function()
                {
                    if (FileLang === 'en') {
                        ui.component._RepositoryTree.instance.openFile(
                            'byPath',
                            PhDOE.userLang + '/' + FilePath,
                            FileName
                        );
                    } else {
                        ui.component._RepositoryTree.instance.openFile(
                            'byPath',
                            'en/' + FilePath,
                            FileName
                        );
                    }
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// RepositoryTree
ui.component.RepositoryTree = Ext.extend(Ext.ux.MultiSelectTreePanel,
{
    animate         : true,
    enableDD        : true,
    ddGroup         : 'mainPanelDDGroup',
    useArrows       : true,
    autoScroll      : true,
    border          : false,
    containerScroll : true,
    root            : ui.component._RepositoryTree.root,
    loader          : ui.component._RepositoryTree.loader,

    onContextMenu : function(node, e)
    {
        e.stopEvent();
        node.select();

        if (node.attributes.type === 'folder' || node.isRoot) {
            new ui.component._RepositoryTree.menu.folder({
                node : node
            }).showAt(e.getXY());
        } else if (node.attributes.type === 'file') {
            new ui.component._RepositoryTree.menu.file({
                node : node
            }).showAt(e.getXY());
        }
    },

    onDblClick : function(node, e)
    {
        if (node.attributes.type === 'file') // files only
        {
            this.openFile(
                'byId',
                node.attributes.id,
                false
            );
        }
    },

    openFile: function(ftype, first, second)
    {
        // Here, first argument is fpath and second, fname
        if( ftype === 'byPath' )
        {
            Ext.getCmp('acc-all-files').expand();

            var fpath = first, fname = second,
            t = fpath.split('/'), cb = function(node)
            {
                node.ensureVisible();
                if (t[0] && t[0] !== '') {
                    // walk into childs
                    for (var j = 0; j < node.childNodes.length; ++j) {
                        if (node.childNodes[j].text === t[0]) {
                            t.shift();
                            node.childNodes[j].expand(false, true, cb.createDelegate(this));
                        }
                    }
                } else {
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
        if( ftype === 'byId' )
        {
            var node      = this.getNodeById(first),
                FilePath  = node.attributes.id,
                extension = node.attributes.extension,
                t, FileID, FileLang, FileName, parser,
                panelWest, panelCenter;

            // CleanUp the path
            t = FilePath.split('/');
            t.shift();

            FileName = t.pop();

            FileLang = t.shift();
            FilePath = (t.length > 0) ? '/' + t.join('/') + '/' : '/';

            FileID = Ext.util.md5('AF-' + FileLang + FilePath + FileName);

            // Render only if this tab don't exist yet
            if (!Ext.getCmp('main-panel').findById('AF-' + FileID)) {

                if ( extension !== 'html' ) {
                    parser = extension;
                } else {
                    parser = 'xml';
                }

                if (extension === 'gif' || extension === 'png')
                {
                    panelWest = {};

                    panelCenter = {
                        id        : 'AF' + '-ALL-FILE-' + FileID, // We fake the content ID to allow closing this panel
                        xtype     : 'panel',
                        region    : 'center',
                        layout    : 'fit',
                        bodyStyle : 'padding:5px 5px 0',
                        html      : '<img src="./do/getImageContent?' +
                                'FileLang=' + FileLang + '&' +
                                'FilePath=' + FilePath + '&' +
                                'FileName=' + FileName +
                                '" />'
                    };

                } else {

                    panelWest = {
                        xtype       : 'panel',
                        region      : 'west',
                        title       : _('Tools'),
                        iconCls     : 'iconConf',
                        collapsedIconCls : 'iconConf',
                        plugins     : [Ext.ux.PanelCollapsedTitle],
                        layout      : 'fit',
                        bodyBorder  : false,
                        split       : true,
                        collapsible : true,
                        collapsed   : !PhDOE.userConf.allFilesDisplaylogPanel,
                        width       : PhDOE.userConf.allFilesDisplaylogPanelWidth || 375,
                        listeners   : {
                            collapse: function() {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'allFilesDisplaylogPanel',
                                        value : false,
                                        notify: false
                                    });
                                }
                            },
                            expand: function() {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'allFilesDisplaylogPanel',
                                        value : true,
                                        notify: false
                                    });
                                }
                            },
                            resize: function(a,newWidth) {
                                if( this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.userConf.allFilesDisplaylogPanelWidth ) { // As the type is different, we can't use !== to compare with !
                                    new ui.task.UpdateConfTask({
                                        item  : 'allFilesDisplaylogPanelWidth',
                                        value : newWidth,
                                        notify: false
                                    });
                                }
                            }
                        },
                        items       : {
                            xtype       : 'tabpanel',
                            activeTab   : 0,
                            defaults    : {autoScroll: true},
                            items       : [{
                                title  : _('Log'),
                                layout : 'fit',
                                items  : [new ui.component.VCSLogGrid({
                                    prefix    : 'AF',
                                    fid       : FileID,
                                    fpath     : FileLang + FilePath,
                                    fname     : FileName,
                                    loadStore : PhDOE.userConf.allFilesDisplayLog
                                })]
                            }, {
                                title  : _('Entities'),
                                layout : 'fit',
                                items  : [new ui.component.EntitiesAcronymsPanel({
                                    dataType  : 'entities',
                                    prefix    : 'AF',
                                    ftype     : 'ALL',
                                    fid       : FileID,
                                    loadStore : PhDOE.userConf.allFilesEntitiesLoadData
                                })]
                            }, {
                                title  : _('Acronyms'),
                                layout : 'fit',
                                items  : [new ui.component.EntitiesAcronymsPanel({
                                    dataType  : 'acronyms',
                                    prefix    : 'AF',
                                    ftype     : 'ALL',
                                    fid       : FileID,
                                    loadStore : PhDOE.userConf.allFilesAcronymsLoadData
                                })]
                            }]
                        }
                    };

                    panelCenter = new ui.component.FilePanel({
                        id             : 'AF' + '-ALL-PANEL-' + FileID,
                        region         : 'center',
                        title          : _('File: ') + FileLang + FilePath + FileName,
                        prefix         : 'AF',
                        ftype          : 'ALL',
                        spellCheck     : PhDOE.userConf.allFilesSpellCheck,
                        spellCheckConf : 'allFilesSpellCheck',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : FileLang,
                        parser         : parser,
                        storeRecord    : node,
                        syncScrollCB   : false,
                        syncScroll     : false
                    });
                }

                Ext.getCmp('main-panel').add({
                    id          : 'AF-' + FileID,
                    layout      : 'border',
                    title       : FileName,
                    originTitle : FileName,
                    closable    : true,
                    tabLoaded   : false,
                    panEntities : !PhDOE.userConf.allFilesEntitiesLoadData,
                    panAcronyms : !PhDOE.userConf.allFilesAcronymsLoadData,
                    panVCS      : !PhDOE.userConf.allFilesDisplayLog,
                    panLoaded   : false,
                    tabTip      : String.format(_('in {0}'), FilePath),
                    iconCls     : 'iconAllFiles',
                    items       : [panelCenter, panelWest]
                });
            }
            Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            tbar:[
                _('Search: '), ' ',
                new Ext.form.TwinTriggerField({
                    id              : 'AF-search',
                    validationEvent : false,
                    validateOnBlur  : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    hideTrigger1    : true,
                    width           : 180,
                    enableKeyEvents : true,
                    listeners : {
                        keypress : function(field, e)
                        {
                            if (e.getKey() == e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click : function()
                    {
                        var instance = ui.component._RepositoryTree.instance;
                        this.setValue('');
                        this.triggers[0].hide();
                        this.setSize(180,10);
                        instance.root.setText(_('Repository'));

                        // clear search
                        delete instance.loader.baseParams.search;
                        instance.root.reload();
                    },
                    onTrigger2Click: function()
                    {
                        var instance = ui.component._RepositoryTree.instance,
                            v        = this.getValue();

                        if( v === '' || v.length < 3) {
                            this.markInvalid(_('Your search must contain at least 3 characters'));
                            return;
                        }
                        this.clearInvalid();

                        this.triggers[0].show();
                        this.setSize(180,10);

                        // carry search
                        instance.loader.baseParams.search = v;
                        instance.root.reload(function()
                        {
                            instance.root.setText(
                                String.format(
                                    _('Search result: {0}'),
                                    instance.root.childNodes.length
                                )
                            );
                        });

                    }
                })
            ]
        });
        ui.component.RepositoryTree.superclass.initComponent.call(this);

        this.on('contextmenu', this.onContextMenu, this);
        this.on('dblclick',    this.onDblClick,  this);

        new Ext.tree.TreeSorter(this, {
            folderSort : true
        });
    }
});

// singleton
ui.component._RepositoryTree.instance = null;
ui.component.RepositoryTree.getInstance = function(config)
{
    if (!ui.component._RepositoryTree.instance) {
        if (!config) {
            config = {};
        }
        ui.component._RepositoryTree.instance = new ui.component.RepositoryTree(config);
    }
    return ui.component._RepositoryTree.instance;
};