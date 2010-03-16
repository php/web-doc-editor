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
            }]
        });
    }
});

// Grid for entities & acronyms
ui.component._RepositoryTree.grid = Ext.extend(Ext.grid.GridPanel,
{
    onRowClick: function(grid, rowIdx, e)
    {
        var data = grid.getSelectionModel().getSelected().data;

        Ext.getCmp('entities-details-'+this.fid).update(data.value);

    },
    onRowDblClick: function(grid, rowIdx, e)
    {
        var data           = grid.getSelectionModel().getSelected().data,
            cmp            = Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid),
            cursorPosition = Ext.util.JSON.decode(cmp.getCursorPosition());

        //Insert the entities at the cursor position
        cmp.insertIntoLine(cursorPosition.line, cursorPosition.caracter, '&' + data.entities + ';');
    },
    initComponent : function()
    {
       Ext.apply(this, {    
           region           : 'center',
           split            : true,
           loadMask         : true,
           autoScroll       : true,
           bodyBorder       : false,
           autoExpandColumn : 'entities',
           columns          : [
               { id: 'entities', header: _('Entities'), sortable: true, dataIndex: 'entities'},
               { header: _('From'), sortable: true, dataIndex: 'from' }
           ],
           viewConfig : {forceFit: true},
           sm         : new Ext.grid.RowSelectionModel({singleSelect: true}),
           store      : new Ext.data.Store({
               autoLoad : true,
               proxy    : new Ext.data.HttpProxy({
                   url : './do/getEntities'
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
                       name    : 'from',
                       mapping : 'from'
                   }, {
                       name    : 'entities',
                       mapping : 'entities'
                   }, {
                       name    : 'value',
                       mapping : 'value'
                   }
                   ])
               )
           }),
           tbar: [
               _('Filter: '), ' ',
               new Ext.form.TwinTriggerField({
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    listeners : {
                        specialkey : function(field, e)
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
                        this.ownerCt.ownerCt.store.clearFilter();
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
                        this.ownerCt.ownerCt.store.filter('entities', v, true);
                    }
                })
           ]
       });
       ui.component._RepositoryTree.grid.superclass.initComponent.call(this);

       this.on('rowclick',    this.onRowClick,    this);
       this.on('rowdblclick', this.onRowDblClick, this);

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
                panelWest, panelEast, panelCenter;

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
                        title       : _('VCS Log'),
                        iconCls     : 'iconVCSLog',
                        collapsedIconCls : 'iconVCSLog',
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
                                        value : false
                                    });
                                }
                            },
                            expand: function() {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'allFilesDisplaylogPanel',
                                        value : true
                                    });
                                }
                            },
                            resize: function(a,newWidth) {
                                if( this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.userConf.allFilesDisplaylogPanelWidth ) { // As the type is different, we can't use !== to compare with !
                                    new ui.task.UpdateConfTask({
                                        item  : 'allFilesDisplaylogPanelWidth',
                                        value : newWidth
                                    });
                                }
                            }
                        },
                        items       : {
                            xtype       : 'tabpanel',
                            activeTab   : 0,
                            tabPosition : 'bottom',
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
                            }]
                        }
                    };

                    panelEast = {
                        xtype       : 'panel',
                        region      : 'east',
                        title       : _('Entities & acronyms'),
                        iconCls     : 'iconVCSLog',
                        collapsedIconCls : 'iconVCSLog',
                        plugins     : [Ext.ux.PanelCollapsedTitle],
                        layout      : 'fit',
                        bodyBorder  : false,
                        split       : true,
                        collapsible : true,
                        width: 500,
                        items       : {
                            xtype       : 'tabpanel',
                            activeTab   : 0,
                            tabPosition : 'bottom',
                            defaults    : {autoScroll: true},
                            items       : [{
                                title  : _('Entities'),
                                layout : 'fit',
                                items  : [
                                    
                                    new Ext.Panel({
                                        border: false,
                                        layout: 'border',
                                        split: true,
                                        items: [
                                            new ui.component._RepositoryTree.grid({
                                                prefix    : 'AF',
                                                fid       : FileID,
                                                ftype     : 'ALL'
                                            }),
                                            {
                                                xtype        : 'panel',
                                                id           : 'entities-details-'+FileID,
                                                region       : 'south',
                                                split        : true,
                                                height       : 100,
                                                autoScroll   : true,
                                                bodyCssClass : 'entities-details',
                                                html         : _('Click on a row to display the content of the entitie.<br>Double-click on it to insert it at the cursor position.')
                                            }
                                        ]
                                    })
                                 ]
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
                    panVCS      : !PhDOE.userConf.allFilesDisplayLog,
                    panLoaded   : false, // Use to monitor if the LANG panel is loaded
                    tabTip      : String.format(_('in {0}'), FilePath),
                    iconCls     : 'iconAllFiles',
                    items       : [panelCenter, panelWest, panelEast]
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