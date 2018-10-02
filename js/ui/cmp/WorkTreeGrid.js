Ext.namespace('ui', 'ui.cmp', 'ui.cmp._WorkTreeGrid', 'ui.cmp._WorkTreeGrid.menu');

//------------------------------------------------------------------------------
// WorkTreeGrid internals
ui.cmp._WorkTreeGrid.SetProgress = new Ext.util.DelayedTask(function(){
    new ui.task.SetFileProgressTask({
        idDB: this.node.attributes.idDB,
        progress: this.node.attributes.progress
    });
});


ui.cmp._WorkTreeGrid.isNotSavedFile = function(config) {

    var needToBeSaved = false;

    Ext.each(Ext.getCmp('main-panel').items.items, function(tab) {

        if( tab.isModified === true )
        {
             needToBeSaved = true;

             Ext.MessageBox.show({
                title   : _('Warning'),
                icon    : Ext.MessageBox.INFO,
                buttons : Ext.MessageBox.OK,
                msg     : _('There is some file unsaved. Please, save it before start a commit.'),
                fn: function() {
                    Ext.getCmp('main-panel').setActiveTab(tab.id);
                }
             });

             return false;

        }

    }, this);

    if( ! needToBeSaved ) {
        config.commitWindow.show();
    }
};


// WorkTreeGrid : adminstrator items for the context menu
// config - { module, from, node, folderNode, userNode }

ui.cmp._WorkTreeGrid.menu.admin = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.admin.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.admin, Ext.menu.Item, {

    listeners: {
        afterrender: function(){
            ui.cmp._WorkTreeGrid.menu.usersPatch({
                menuID: 'AdminPatchesMenu'
            });
        }
    },

    init: function() {

        var allFiles = [], items;

        allFiles.push(this.node);

        switch(this.from) {
            case 'file' :
                items = [{
                    text: _('Submit all files for review in patch:'),
                    iconCls: 'iconPendingPatch',
                    handler: function(){
                        return false;
                    },
                    menu: new Ext.menu.Menu({
                        id: 'AdminPatchesMenu',
                        itemRendered: false,
                        nodesToAdd: allFiles
                    })
                },{
                    scope: this,
                    iconCls: 'iconSwitchLang',
                    text: _('Change file\'s owner'),
                    handler: function()
                    {
                        new ui.cmp.ChangeFileOwner({
                            fileIdDB: this.node.attributes.idDB,
                            fileFolder: this.folderNode.attributes.task,
                            fileName: this.node.attributes.task,
                            currentOwner: this.userNode.attributes.task
                        });
                    }
                },{
                    scope: this,
                    iconCls: 'iconPageDelete',
                    text: ((this.node.attributes.type === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                    handler: function()
                    {
                        new ui.task.ClearLocalChangeTask({
                            ftype: this.node.attributes.type,
                            fpath: this.folderNode.attributes.task,
                            fname: this.node.attributes.task
                        });
                    }
                }];
                break;

            case 'patch' :
                items = [{
                    scope: this,
                    iconCls: 'iconTrash',
                    text: _('Delete this patch'),
                    handler: function()
                    {
                        ui.task.DeletePatchTask({
                            patchID: this.node.attributes.idDB
                        });
                    }
                }];
                break;
        }

        Ext.apply(this, {
            text: _('Administrator menu'),
            iconCls: 'iconAdmin',
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                items: items
            })
        });
    }
});



// WorkTreeGrid : commit items for the context menu
// config - { module, from, node, folderNode, userNode }
ui.cmp._WorkTreeGrid.menu.commit = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.commit.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.commit, Ext.menu.Item, {
    init: function(){

        Ext.apply(this, {
            text: _('Commit...'),
            iconCls: 'iconCommitFileVcs',
            disabled: (!PhDOE.user.haveKarma),
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                items: [{
                    scope: this,
                    text: _('...this file'),
                    hidden: (this.from === 'user' || this.from === 'folder' || this.from === 'patch' || this.from === 'anonymousPatch'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){

                        var file = [{
                            fid: Ext.util.md5(this.folderNode.attributes.task + this.node.attributes.task),
                            fpath: this.folderNode.attributes.task,
                            fname: this.node.attributes.task,
                            fdbid: this.node.attributes.idDB,
                            ftype: this.node.attributes.type,
                            fdate: Date.parseDate(this.node.attributes.last_modified,'Y-m-d H:i:s'),
                            fby: this.userNode.attributes.task
                        }];

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: file
                                              })
                        });
                    }
                }, {
                    scope: this,
                    text: _('...all files from this folder'),
                    hidden: (this.from === 'user' || this.from === 'patch' || this.from === 'anonymousPatch'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [];

                        this.folderNode.cascade(function(node){
                            if (node.attributes.type !== 'folder' && node.attributes.type !== 'user') {
                                files.push({
                                    fid: Ext.util.md5(this.folderNode.attributes.task + node.attributes.task),
                                    fpath: this.folderNode.attributes.task,
                                    fname: node.attributes.task,
                                    fdbid: node.attributes.idDB,
                                    ftype: node.attributes.type,
                                    fdate: Date.parseDate(node.attributes.last_modified,'Y-m-d H:i:s'),
                                    fby: this.userNode.attributes.task
                                });
                            }
                        }, this);

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: files
                                              })
                        });

                    }
                }, {
                    scope: this,
                    text: _('...all files from this patch'),
                    hidden: (this.module !== 'patches' || this.from === 'user'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [], defaultCommitMessage = '', patchID = false, anonymousName;

                        // We build the default commit message for a commit issue from an anonymous patch
                        if( this.from === 'anonymousPatch' )
                        {
                            anonymousName = this.patchNode.parentNode.attributes.task;

                            // We must remove # caracter from the automatic comment to avoid bug system problem.
                            // See this thread : http://news.php.net/php.doc/969384624

                            if( this.patchNode.parentNode.attributes.isAnonymous ) {
                                anonymousName = 'anonymous ' + this.patchNode.parentNode.attributes.userID;
                            }

                            defaultCommitMessage = this.patchNode.attributes.patchDescription + "\n\n-- \nProvided by " + anonymousName + ' ('+this.patchNode.attributes.patchEmail+')';

                            patchID = this.patchNode.attributes.idDB;

                        }

                        this.patchNode.cascade(function(node){
                            if (node.attributes.type !== 'folder' && node.attributes.type !== 'user' && node.attributes.type !== 'patch') {
                                files.push({
                                    fid: Ext.util.md5(node.parentNode.attributes.task + node.attributes.task),
                                    fpath: node.parentNode.attributes.task,
                                    fname: node.attributes.task,
                                    fdbid: node.attributes.idDB,
                                    ftype: node.attributes.type,
                                    fdate: Date.parseDate(node.attributes.last_modified,'Y-m-d H:i:s'),
                                    fby: this.userNode.attributes.task
                                });
                            }
                        }, this);

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: files,
                                                    defaultMessage: defaultCommitMessage,
                                                    patchID: patchID
                                              })
                        });

                    }
                }, {
                    scope: this,
                    text: _('...all files modified by me'),
                    hidden: (this.from === 'anonymousPatch'),
                    iconCls: 'iconCommitFileVcs',
                    handler: function(){
                        var files = [];

                        this.userNode.cascade(function(node){
                            if (node.attributes.type !== 'folder' && node.attributes.type !== 'user' && node.attributes.type !== 'patch') {
                                files.push({
                                    fid: Ext.util.md5(node.parentNode.attributes.task + node.attributes.task),
                                    fpath: node.parentNode.attributes.task,
                                    fname: node.attributes.task,
                                    fdbid: node.attributes.idDB,
                                    ftype: node.attributes.type,
                                    fdate: Date.parseDate(node.attributes.last_modified,'Y-m-d H:i:s'),
                                    fby: this.userNode.attributes.task
                                });
                            }
                        }, this);

                        ui.cmp._WorkTreeGrid.isNotSavedFile({
                                commitWindow: new ui.cmp.CommitPrompt({
                                                    files: files
                                              })
                        });

                    }
                }]
            })
        });
    }
});

ui.cmp._WorkTreeGrid.menu.usersPatch = function(config){
    Ext.apply(this, config);

    var menu = Ext.getCmp(this.menuID), newItem, patchesList;

    // We remove all this menu
    menu.removeAll();
    menu.doLayout();

    patchesList = ui.cmp.PatchesTreeGrid.getInstance().getUserPatchesList();

    if (patchesList) {

        Ext.each(patchesList, function(item){

            newItem = new Ext.menu.Item({
                id: Ext.id(),
                text: item.attributes.task,
                handler: function(){
                    ui.task.MoveToPatch({
                        patchID: item.attributes.idDB,
                        patchName: item.attributes.task,
                        nodesToAdd: menu.nodesToAdd
                    });
                }
            });
            menu.add(newItem);

        }, this);

    }
    else {
        newItem = new Ext.menu.Item({
            disabled: true,
            text: _('You have no patch currently. You must create one.')
        });
        menu.add(newItem);
    }

    // Set the default action : Add a new patch
    newItem = new Ext.menu.Item({
        text: _('Create a new patch'),
        iconCls: 'iconAdd',
        handler: function(){
            var win = new ui.cmp.ManagePatchPrompt({
                title: _('Create a new patch'),
                nodesToAdd: menu.nodesToAdd
            });
            win.show(this.el);
        }
    });
    menu.add('-', newItem);

    menu.doLayout();
    menu.itemRendered = true;

};


// WorkTreeGrid : context menu for users items
// config - { node }
ui.cmp._WorkTreeGrid.menu.users = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.users.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.users, Ext.menu.Menu, {
    listeners: {
        show: function(){
            if (this.node.attributes.task === PhDOE.user.login) {
                ui.cmp._WorkTreeGrid.menu.usersPatch({
                    menuID: 'usersPatchesMenu'
                });
            }
        }
    },

    init: function(){
        var allFiles = [], items;

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'user' && node.attributes.type !== 'folder') {
                allFiles.push(node);
            }
        }, this);

        items = (this.node.attributes.task === PhDOE.user.login) ? [{
            text: _('Submit all files for review in patch:'),
            iconCls: 'iconPendingPatch',
            handler: function(){
                return false;
            },
            menu: new Ext.menu.Menu({
                id: 'usersPatchesMenu',
                itemRendered: false,
                nodesToAdd: allFiles
            })
        }, {
            xtype: 'menuseparator',
            hidden: !PhDOE.user.haveKarma
        },


        new ui.cmp._WorkTreeGrid.menu.commit({
            hidden: !PhDOE.user.haveKarma,
            from: 'user',
            node: false,
            folderNode: false,
            userNode: this.node
        })
        ] : [{
            scope: this,
            text: String.format(_('Send an email to {0}'), "<b>" + this.node.attributes.task + "</b>"),
            iconCls: 'iconSendEmail',
            hidden: !this.node.attributes.email,
            handler: function(){
                var win = new ui.cmp.EmailPrompt();

                win.setData(this.node.attributes.task, this.node.attributes.email);
                win.show(this.node.el);
            }
        }];

        Ext.apply(this, {
            items: items
        });
    }
});

// WorkTreeGrid : context menu for folders items
// config - { node }
ui.cmp._WorkTreeGrid.menu.folders = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.folders.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.folders, Ext.menu.Menu, {
    listeners: {
        show: function(){

            if (this.node.parentNode.attributes.task === PhDOE.user.login) {
                ui.cmp._WorkTreeGrid.menu.usersPatch({
                    menuID: 'foldersPatchesMenu'
                });
            }
        }
    },

    init: function(){
        var allFiles = [];

        // We don't display all of this menu if the current user isn't the owner
        if (this.node.parentNode.attributes.task !== PhDOE.user.login) {
            return false;
        }

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder') {
                allFiles.push(node);
            }
        }, this);


        Ext.apply(this, {
            items: [{
                text: _('Submit all files in this directory in patch:'),
                iconCls: 'iconPendingPatch',
                handler: function(){
                    return false;
                },
                menu: new Ext.menu.Menu({
                    id: 'foldersPatchesMenu',
                    itemRendered: false,
                    nodesToAdd: allFiles
                })
            }, {
                xtype: 'menuseparator',
                hidden: !PhDOE.user.haveKarma
            },
            new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !PhDOE.user.haveKarma,
                from: 'folder',
                node: false,
                folderNode: this.node,
                userNode: this.node.parentNode
            })]
        });
    }
});



// WorkTreeGrid : context menu for files items
// config - { node, progressValue }
ui.cmp._WorkTreeGrid.menu.files = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._WorkTreeGrid.menu.files.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._WorkTreeGrid.menu.files, Ext.menu.Menu, {
    listeners: {
        show: function(){
            ui.cmp._WorkTreeGrid.menu.usersPatch({
                menuID: 'filePatchesMenu'
            });
        }
    },

    init: function(){
        var node = this.node,
            FileType = node.attributes.type,
            FileLang,
            FilePath = node.parentNode.attributes.task,
            FileName = node.attributes.task,
            treeGrid = node.ownerTree,
            owner = node.parentNode.parentNode.attributes.task,
            allFiles = [],
            tmp;

        // Get the lang of this file
        tmp = node.parentNode.attributes.task.split('/');
        FileLang = tmp[0];

        allFiles.push(this.node);

        Ext.apply(this, {
            items: [{
                text: '<b>' + ((FileType === 'delete') ? _('View in a new tab') : _('Edit in a new tab')) + '</b>',
                iconCls: 'iconEdit',
                handler: function(){
                    treeGrid.openFile(node);
                }
            }, {
                text: _('Submit as patch for review in:'),
                iconCls: 'iconPendingPatch',
                hidden: !(owner === PhDOE.user.login || !PhDOE.user.isAnonymous ),
                handler: function(){
                    return false;
                },
                menu: new Ext.menu.Menu({
                    id: 'filePatchesMenu',
                    itemRendered: false,
                    nodesToAdd: allFiles
                })
            }, {
                text: _('Set the progress...'),
                iconCls: 'iconProgress',
                hidden: (FileType === 'delete' || owner !== PhDOE.user.login),
                menu: {
                    xtype: 'menu',
                    showSeparator: false,
                    items: [{
                        xtype: 'slider',
                        width: 200,
                        value: this.node.attributes.progress,
                        increment: 10,
                        minValue: 0,
                        maxValue: 100,
                        plugins: new Ext.slider.Tip({
                            getText: function(thumb){
                                return String.format('<b>' + _('{0}% complete') + '</b>', thumb.value);
                            }
                        }),
                        refreshNodeColumns: function(n){
                            var t = n.getOwnerTree(), a = n.attributes, cols = t.columns, el = n.ui.getEl().firstChild, cells = el.childNodes, i, d, v, len;

                            for (i = 1, len = cols.length; i < len; i++) {
                                d = cols[i].dataIndex;
                                v = (a[d] !== null) ? a[d] : '';

                                if (cols[i].tpl && cols[i].tpl.html === "{progress:this.formatProgress}") {
                                    cells[i].firstChild.innerHTML = cols[i].tpl.apply('out:' + v);
                                }
                            }
                        },
                        listeners: {
                            scope: this,
                            change: function(s, n){
                                this.node.attributes.progress = n;
                                s.refreshNodeColumns(this.node);

                                ui.cmp._WorkTreeGrid.SetProgress.delay(1000, null, this);
                            }
                        }
                    }]
                }
            }, '-', {
                scope: this,
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                handler: function()
                {
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        FileName: FileName,
                        FilePath: FilePath,
                        currentOwner: owner,
                        fileIdDB: node.attributes.idDB
                    });
                }
            }, {
                text: _('Download the diff as a patch'),
                iconCls: 'iconDownloadDiff',
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?FilePath=' +
                    FilePath +
                    '&FileName=' +
                    FileName +
                    '&csrfToken=' +
                    csrfToken;
                }
            }, {
                xtype: 'menuseparator',
                hidden: owner !== PhDOE.user.login
            }, {
                text: ((FileType === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                iconCls: 'iconPageDelete',
                hidden: owner !== PhDOE.user.login,
                handler: function(){

                    new ui.task.ClearLocalChangeTask({
                        ftype: FileType,
                        fpath: FilePath,
                        fname: FileName
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.haveKarma && owner === PhDOE.user.login)
            }, new ui.cmp._WorkTreeGrid.menu.commit({
                from: 'file',
                hidden: !(PhDOE.user.haveKarma && owner === PhDOE.user.login),
                node: this.node,
                folderNode: this.node.parentNode,
                userNode: this.node.parentNode.parentNode
            }),
            {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin)
            },
                new ui.cmp._WorkTreeGrid.menu.admin({
                    fileLang: FileLang,
                    from: 'file',
                    hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin),
                    node: this.node,
                    folderNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode
                })
            ]
        });
    }
});

//------------------------------------------------------------------------------
// WorkTreeGrid
ui.cmp.WorkTreeGrid = Ext.extend(Ext.ux.tree.TreeGrid, {
    onContextMenu: function(node, e){
        e.stopEvent();
        var selectedNodes, NBselectedNodes, type, contextMenu;

        selectedNodes = this.getSelectionModel().getSelectedNodes();
        NBselectedNodes = selectedNodes.length;

        // We clean up the multi-selection and keep only files own by the current user
        if( NBselectedNodes > 1 ) {

            for( var i=0; i < NBselectedNodes; i++ ) {

                if( selectedNodes[i].attributes.type == 'folder' || selectedNodes[i].attributes.type == 'user') {
                    selectedNodes[i].unselect(true);
                }

                if( selectedNodes[i].attributes.type != 'folder' && selectedNodes[i].attributes.type != 'user') {

                    var fileOwner = selectedNodes[i].parentNode.parentNode.attributes.task;

                    if( fileOwner != PhDOE.user.login ) {
                        selectedNodes[i].unselect(true);
                    }
                }
            }
            selectedNodes = this.getSelectionModel().getSelectedNodes();
            NBselectedNodes = selectedNodes.length;
        }

        // Now we have only owns files selected
        if( NBselectedNodes > 1 ) {

            contextMenu = new Ext.menu.Menu({

                listeners: {
                    show: function() {
                        ui.cmp._WorkTreeGrid.menu.usersPatch({
                            menuID: 'globalPatchesMenu'
                        });
                    }
                },
                items: [{
                    text: _('Submit all this files for review in patch:'),
                    iconCls: 'iconPendingPatch',
                    handler: function(){
                        return false;
                    },
                    menu: new Ext.menu.Menu({
                        id: 'globalPatchesMenu',
                        itemRendered: false,
                        nodesToAdd: selectedNodes
                    })
                }]
            });
            contextMenu.showAt(e.getXY());

            return;
        }

        type = node.attributes.type;

        switch (type) {

            case "user":
                // We only select this row/ If there is multi-selection, this clear the selection and select only the current one.
                node.select();
                contextMenu = new ui.cmp._WorkTreeGrid.menu.users({
                    node: node
                });
                break;

            case "folder":
                node.select();
                contextMenu = new ui.cmp._WorkTreeGrid.menu.folders({
                    node: node
                });
                break;

            default: // Use default for file as the type can be update, delete or new
                node.select();
                contextMenu = new ui.cmp._WorkTreeGrid.menu.files({
                    node: node
                });
                break;

        }

        contextMenu.showAt(e.getXY());

    },

    initComponent: function(){

        function renderProgress(v, p){
            p.css += ' x-grid3-progresscol';

            return String.format('<div class="x-progress-wrap"><div class="x-progress-inner"><div class="x-progress-bar{0}" style="width:{1}%;">{2}</div></div>', this.getStyle(v), (v / this.ceiling) * 100, this.getText(v));
        }

        Ext.apply(this, {
            animate: true,
            useArrows: true,
            autoScroll: true,
            border: false,
            containerScroll: true,
            defaults: {
                autoScroll: true
            },
            selModel: new Ext.tree.MultiSelectionModel(),
            columns: [{
                // By default, it's the first column who is an autoExpandColumn
                header: _('Users'),
                dataIndex: 'task',
                tpl: new Ext.XTemplate('{task:this.formatUserName}', {
                    formatUserName: function(v, data)
                    {
                        if( data.userID ) {
                            data.qtip= _('userID: ') + data.userID;
                        }
                        return v;
                    }

                })
            }, {
                header: _('Last modified'),
                width: 120,
                dataIndex: 'last_modified',
                align: 'center',
                tpl: new Ext.XTemplate('{last_modified:this.formatDate}', {
                    formatDate: function(v, data){
                        if( data.type !== 'user' && data.type !== 'folder' ) {
                            return Date.parseDate(v, 'Y-m-d H:i:s').format(_('Y-m-d, H:i'));
                        } else {
                            return '';
                        }
                    }
                })
            }, {
                header: _('Estimated progress'),
                dataIndex: 'progress',
                width: 100,
                align: 'center',
                tpl: new Ext.XTemplate('{progress:this.formatProgress}', {
                    formatProgress: function(v, v2){

                        // We re-use this template from the slider. So, we must use this hack to pass the new value
                        if (Ext.util.Format.substr(v2, 0, 4) === 'out:') {
                            var t = v2.split(':');
                            v = t[1];
                        }

                        if (!v && v !== 0) {
                            return '';
                        }

                        function getText(v){
                            var textClass = (v < (100 / 2)) ? 'x-progress-text-back' : 'x-progress-text-front' +
                            (Ext.isIE6 ? '-ie6' : ''), text;

                            // ugly hack to deal with IE6 issue
                            text = String.format('</div><div class="x-progress-text {0}" style="width:100%;" id="{1}">{2}</div></div>', textClass, Ext.id(), v + '%');

                            return (v < (100 / 1.05)) ? text.substring(0, text.length - 6) : text.substr(6);
                        }

                        function getStyle(v){
                            if (v <= 100 && v > (100 * 0.67)) {
                                return '-green';
                            }
                            if (v < (100 * 0.67) && v > (100 * 0.33)) {
                                return '-orange';
                            }
                            if (v < (100 * 0.33)) {
                                return '-red';
                            }
                            return '';
                        }

                        return String.format('<div class="x-progress-wrap"><div class="x-progress-inner"><div class="x-progress-bar{0}" style="width:{1}%;">{2}</div></div>', getStyle(v), (v / 100) * 100, getText(v));
                    }
                })

            }],
            loader: {
                dataUrl: './do/getWork',
                baseParams: {
                    module: 'workInProgress'
                },
                listeners: {
                    beforeload: function() {
                        Ext.getCmp('acc-work-in-progress').setIconClass('iconLoading');

                    },
                    load: function() {
                        Ext.getCmp('acc-work-in-progress').setIconClass('iconWorkInProgress');
                    }
                }
            }
        });
        ui.cmp.WorkTreeGrid.superclass.initComponent.call(this);

        this.on('contextmenu', this.onContextMenu, this);
        this.on('resize', this.resizeCmp, this);
        this.on('dblclick', this.openFile, this);

        this.getRootNode().on('beforechildrenrendered', function(){
            this.updateFilesCounter.defer(200, this);
        }, this);
    },

    resizeCmp: function(c, a, b, w){

        this.columns[0].width = w - (this.columns[1].width + this.columns[2].width + 5);
        this.updateColumnWidths();
    },

    delRecord: function(fid){
        var rootNode = this.getRootNode(), i, j, h, user, folder, file;

        for (i = 0; i < rootNode.childNodes.length; i++) {
            user = rootNode.childNodes[i];

            for (j = 0; j < user.childNodes.length; j++) {
                folder = user.childNodes[j];

                for (h = 0; h < folder.childNodes.length; h++) {
                    file = folder.childNodes[h];

                    // We can't use === operator here. Sometimes, fid is a string, Sometimes, it's an integer ( see Bug #55316 )
                    if (file.attributes.idDB == fid) {

                        file.remove(true);

                        // Is Folder contains some others child ?
                        if (Ext.isEmpty(folder.childNodes)) {

                            folder.remove(true);

                            // Is User contains some others child ?
                            if (Ext.isEmpty(user.childNodes)) {

                                user.remove(true);

                                this.updateFilesCounter();
                                return;
                            }
                            this.updateFilesCounter();
                            return;
                        }
                        this.updateFilesCounter();
                        return;
                    }
                }

            }
        }

        // We update the FilesCounter
        this.updateFilesCounter();
    },

    addToWork: function(nodesToAdd){
        var rootNode, userNode, folderNode, type, iconCls, fileNode, nowDate, i;

        rootNode = this.getRootNode();

        // We start by searching if this user have a node
        userNode = rootNode.findChild('task', PhDOE.user.login);

        // If the user node don't exist, we create it
        if (!userNode) {

            userNode = new Ext.tree.TreeNode({
                task: PhDOE.user.login,
                type: 'user',
                email: PhDOE.user.email,
                iconCls: 'iconUser',
                expanded: true
            });

            rootNode.appendChild(userNode);
            rootNode.expand(); // This allow to show our new node
        }

        if (nodesToAdd) {

            // We walk into the nodes to add
            for (i = 0; i < nodesToAdd.length; i++) {

                // We search now into this patch the right folder
                folderNode = userNode.findChild('task', nodesToAdd[i].parentNode.attributes.task);

                // If this folder don't exist, we create it
                if (!folderNode) {

                    folderNode = new Ext.tree.TreeNode({
                        task: nodesToAdd[i].parentNode.attributes.task,
                        type: 'folder',
                        iconCls: 'iconFolderOpen',
                        expanded: true
                    });

                    userNode.appendChild(folderNode);
                    userNode.expand(); // This allow to show our new node
                }

                // We add now this file into this folder
                type = nodesToAdd[i].attributes.type;

                if (type === 'update') {
                    iconCls = 'iconRefresh';
                }
                if (type === 'new') {
                    iconCls = 'iconNewFiles';
                }
                if (type === 'delete') {
                    iconCls = 'iconTrash';
                }

                nowDate = new Date();

                fileNode = new Ext.tree.TreeNode({
                    task: nodesToAdd[i].attributes.task,
                    type: type,
                    iconCls: iconCls,
                    expanded: true,
                    last_modified: nowDate.format('Y-m-d H:i:s'),
                    progress: nodesToAdd[i].attributes.progress,
                    idDB: nodesToAdd[i].attributes.idDB
                });

                folderNode.appendChild(fileNode);
                folderNode.expand(); // This allow to show our new node
            }

        } // End of adding folders/files into this patch
        // We update the FilesCounter
        this.updateFilesCounter();

    },

    addRecord: function(fid, fpath, fname, type){
        var rootNode = this.getRootNode(), userNode, folderNode, fileNode, nowDate, iconCls;

        // We start by searching if this user have a node
        userNode = rootNode.findChild('task', PhDOE.user.login);

        // If the user node don't exist, we create it
        if (!userNode) {

            userNode = new Ext.tree.TreeNode({
                task: PhDOE.user.login,
                type: 'user',
                email: PhDOE.user.email,
                iconCls: 'iconUser',
                expanded: true,
                nbFiles: 1
            });

            rootNode.appendChild(userNode);
            rootNode.expand(); // This allow to show our new node
        }

        // We search now into this user the right folder
        folderNode = userNode.findChild('task', fpath);

        // If this folder don't exist, we create it
        if (!folderNode) {

            folderNode = new Ext.tree.TreeNode({
                task: fpath,
                type: 'folder',
                iconCls: 'iconFolderOpen',
                expanded: true
            });

            userNode.appendChild(folderNode);
            userNode.expand(); // This allow to show our new node
        }

        // We search now into this folder the right file
        fileNode = folderNode.findChild('task', fname);

        // If this folder don't exist, we create it
        if (!fileNode) {

            if (type === 'update') {
                iconCls = 'iconRefresh';
            }
            if (type === 'new') {
                iconCls = 'iconNewFiles';
            }
            if (type === 'delete') {
                iconCls = 'iconTrash';
            }

            nowDate = new Date();

            fileNode = new Ext.tree.TreeNode({
                task: fname,
                type: type,
                iconCls: iconCls,
                expanded: true,
                last_modified: nowDate.format('Y-m-d H:i:s'),
                progress: 100,
                idDB: fid
            });

            folderNode.appendChild(fileNode);
            folderNode.expand(); // This allow to show our new node
        }

        // We update the FilesCounter
        this.updateFilesCounter();
    },

    countFiles: function(){
        var rootNode = this.getRootNode(), nbFiles = 0;

        rootNode.cascade(function(node){
            if( !node.isRoot && node.attributes.type !== 'user' && node.attributes.type !== 'folder' ) {
                if (node.parentNode.parentNode.attributes.task === PhDOE.user.login) {
                    nbFiles++;
                }
            }
        }, this);

        return nbFiles;
    },

    updateFilesCounter: function(){
        var count = this.countFiles();

        Ext.getDom('acc-work-in-progress-nb').innerHTML = count;

    },

    openFile: function(node){
        var FileType = node.attributes.type, FilePath = node.parentNode.attributes.task, FileName = node.attributes.task, tmp;

        if (FileType === 'user' || FileType === 'folder') {
            return false;
        }

        tmp = FilePath.split('/');
        FileLang = tmp[0];
        tmp.shift();

        FilePath = "/" + tmp.join('/');

        switch (FileType) {
            case "new":
                // Find the id of this row into PendingTranslateGrid.store and open it !
                ui.cmp.PendingTranslateGrid.getInstance().store.each(function(row){
                    if ((row.data.path) === FilePath && row.data.name === FileName) {
                        ui.cmp.PendingTranslateGrid.getInstance().openFile(row.data.id);
                        return;
                    }
                });
                break;

            case "delete":
                // Find the id of this row into NotInENGrid.store and open it !
                ui.cmp.NotInENGrid.getInstance().store.each(function(row){

                    if ((row.data.path) === FilePath && row.data.name === FileName) {
                        ui.cmp.NotInENGrid.getInstance().openFile(row.data.id);
                        return;
                    }
                });
                break;

            case "update":
                // For EN file, we open this new file into the "All files" module
                if (FileLang === 'en') {
                    ui.cmp.RepositoryTree.getInstance().openFile('byPath', FileLang + FilePath, FileName);
                }
                else {

                    found = false;

                    // Find the id of this row into StaleFileGrid.store and open it !
                    ui.cmp.StaleFileGrid.getInstance().store.each(function(row){

                        if ((row.data.path) === FilePath && row.data.name === FileName) {
                            ui.cmp.StaleFileGrid.getInstance().openFile(row.data.id);
                            found = true;
                            return;
                        }
                    });

                    // If we haven't found this file in StaleFileGrid, we try into File in error grid.
                    if (!found) {

                        // Find the id of this row into ErrorFileGrid.store and open it !
                        ui.cmp.ErrorFileGrid.getInstance().store.each(function(row){

                            if ((row.data.path) === FilePath && row.data.name === FileName) {
                                ui.cmp.ErrorFileGrid.getInstance().openFile(row.data.id);
                                found = true;
                                return;
                            }
                        });
                    }

                    // If we haven't found this file in File in error grid, we search in Pending Reviewed grid.
                    if (!found) {

                        // Find the id of this row into PendingReviewGrid.store and open it !
                        ui.cmp.PendingReviewGrid.getInstance().store.each(function(row){

                            if ((row.data.path) === FilePath && row.data.name === FileName) {
                                ui.cmp.PendingReviewGrid.getInstance().openFile(row.data.id);
                                found = true;
                                return;
                            }
                        });
                    }

                    // FallBack : We open it into "All files" modules
                    if (!found) {
                        ui.cmp.RepositoryTree.getInstance().openFile('byPath', FileLang + FilePath, FileName);
                    }
                }
                break;
        }
    }
});

// singleton
ui.cmp._WorkTreeGrid.instance = null;
ui.cmp.WorkTreeGrid.getInstance = function(config){
    if (!ui.cmp._WorkTreeGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._WorkTreeGrid.instance = new ui.cmp.WorkTreeGrid(config);
    }
    return ui.cmp._WorkTreeGrid.instance;
};
