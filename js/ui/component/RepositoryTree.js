Ext.namespace('ui','ui.component','ui.component._RepositoryTree');

//------------------------------------------------------------------------------
// RepositoryTree internals

// RepositoryTree root node
ui.component._RepositoryTree.root = new Ext.tree.AsyncTreeNode({
    id        : '/',
    text      : _('Repository'),
    draggable : false // disable root node dragging
});

// RepositoryTree default tree loader
ui.component._RepositoryTree.loader = new Ext.tree.TreeLoader({
    dataUrl    : './do/getAllFiles'
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
            t.shift();
            t.pop();

            FileLang = t.shift();
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
                hidden  : (this.node.attributes.from === 'search'),
                text    : (FileLang === 'en') ? String.format( _('Open the same file in <b>{0}</b>'), Ext.util.Format.uppercase(phpDoc.userLang)) : String.format( _('Open the same file in <b>{0}</b>'), 'EN'),
                iconCls : 'iconTabNeedReviewed',
                scope   : this,
                handler : function()
                {
                    if (FileLang === 'en') {
                        ui.component._RepositoryTree.instance.openFile(
                            phpDoc.userLang + '/' + FilePath, FileName
                        );
                    } else {
                        ui.component._RepositoryTree.instance.openFile(
                            'en/' + FilePath, FileName
                        );
                    }
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// RepositoryTree
ui.component.RepositoryTree = Ext.extend(Ext.tree.TreePanel,
{
    animate         : true,
    enableDD        : false,
    useArrows       : true,
    autoScroll      : true,
    bodyBorder      : false,
    containerScroll : true,

    root   : ui.component._RepositoryTree.root,
    loader : ui.component._RepositoryTree.loader,

    listeners: {
        contextmenu : function(node, e)
        {
            var tmp;
            node.select();

            if (node.attributes.type === 'folder' || node.isRoot) {
                tmp = new ui.component._RepositoryTree.menu.folder({
                    node : node
                }).showAt(e.getXY());
            } else if (node.attributes.type === 'file') {
                tmp = new ui.component._RepositoryTree.menu.file({
                    node : node
                }).showAt(e.getXY());
            }
        },
        dblclick : function(node, e)
        {
            if (node.attributes.type === 'file') { // files only

                var FilePath  = node.attributes.id,
                    FileID    = Ext.util.md5('AF-' + FilePath),
                    extension = node.attributes.extension,
                    t, FileLang, FileName, parser,
                    panelWest, panelCenter;

                // Render only if this tab don't exist yet
                if (!Ext.getCmp('main-panel').findById('AF-' + FileID)) {

                    // CleanUp the path
                    t = FilePath.split('/');
                    t.shift();

                    FileName = t.pop();

                    FileLang = t.shift();
                    FilePath = (t.length > 0) ? '/' + t.join('/') + '/' : '/';

                    if (extension !== 'html' && extension !== 'php') {
                        parser = extension;
                    } else {
                        parser = 'xml';
                    }

                    if (extension === 'gif' || extension === 'png') {

                        panelWest = {};

                        panelCenter = {
                            xtype: 'panel',
                            layout: 'fit',
                            bodyStyle: 'padding:5px 5px 0',
                            html: '<img src="/data/' + this.userLogin +
                                    '/phpdoc-' + this.userLang + FilePath + '" />'
                        };

                    } else {

                        panelWest = {
                            xtype       : 'panel',
                            region      : 'west',
                            title       : _('VCSLog'),
                            layout      : 'fit',
                            bodyBorder  : false,
                            split       : true,
                            collapsible : true,
                            collapsed   : true,
                            width       : 375,
                            items       : {
                                xtype       : 'tabpanel',
                                activeTab   : 0,
                                tabPosition : 'bottom',
                                defaults    : { autoScroll: true },
                                items       : [{
                                    title  : 'Log',
                                    layout : 'fit',
                                    items  : [new ui.component.VCSLogGrid({
                                        prefix    : 'AF',
                                        fid       : FileID,
                                        fpath     : FileLang + FilePath,
                                        fname     : FileName,
                                        loadStore : (phpDoc.userConf.conf_allfiles_displaylog === "true")
                                    })]
                                }]
                            }
                        };

                        panelCenter = new ui.component.FilePanel({
                            id           : 'AF' + '-ALL-PANEL-' + FileID,
                            region       : 'center',
                            title        : _('File: ') + FileLang + FilePath + FileName,
                            prefix       : 'AF',
                            ftype        : 'ALL',
                            fid          : FileID,
                            fpath        : FilePath,
                            fname        : FileName,
                            lang         : FileLang,
                            parser       : parser,
                            storeRecord  : node,
                            syncScrollCB : false,
                            syncScroll   : false
                        });
                    }

                    Ext.getCmp('main-panel').add({
                        id          : 'AF-' + FileID,
                        layout      : 'border',
                        title       : FileName,
                        originTitle : FileName,
                        closable    : true,
                        tabTip      : String.format(_('in {0}'), FilePath),
                        iconCls     : 'AllFiles',
                        items       : [panelCenter, panelWest]
                    });

                    Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);

                } else {
                    // This tab already exist. We focus it.
                    Ext.getCmp('main-panel').setActiveTab('AF-' + FileID);
                    // if opening multiple files, dequeue and continue
                    if (phpDoc.filePendingOpen[0]) {
                        if (phpDoc.filePendingOpen[0]) {
                            if (phpDoc.filePendingOpen[0].fpath) {
                                this.openFile(
                                    phpDoc.filePendingOpen[0].fpath,
                                    phpDoc.filePendingOpen[0].fname
                                );
                            }
                        }
                    }
                }
            }
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

        var tmp = new Ext.tree.TreeSorter(this, {
            folderSort : true
        });
    },

    openFile : function(fpath, fname)
    {
        Ext.getCmp('acc-all-files').expand();

        var t = fpath.split('/'), cb = function(node)
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
                        this.fireEvent('dblclick', node.childNodes[i]);
                    }
                }
            }
        };
        this.root.expand(false, true, cb.createDelegate(this));
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