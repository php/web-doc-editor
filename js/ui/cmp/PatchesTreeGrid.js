Ext.namespace('ui', 'ui.cmp', 'ui.cmp._PatchesTreeGrid', 'ui.cmp._PatchesTreeGrid.menu');

//------------------------------------------------------------------------------
// PatchesTreeGrid internals

// PatchesTreeGrid : context menu for users items
// config - { node }
ui.cmp._PatchesTreeGrid.menu.users = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.users.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.users, Ext.menu.Menu, {
    init: function(){
        var allFiles = [];

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);

        Ext.apply(this, {

            items: [{
                scope: this,
                text: String.format(_('Send an email to {0}'), "<b>" + this.node.attributes.task + "</b>"),
                iconCls: 'iconSendEmail',
                hidden: (this.node.attributes.task === PhDOE.user.login || !this.node.attributes.email),
                handler: function(){
                    var win = new ui.cmp.EmailPrompt();

                    win.setData(this.node.attributes.task, this.node.attributes.email);
                    win.show(this.node.el);
                }
            }, {
                text: _('Back all files to work in progress module'),
                hidden: (this.node.attributes.task !== PhDOE.user.login),
                disabled: Ext.isEmpty(allFiles),
                iconCls: 'iconWorkInProgress',
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.haveKarma && this.node.attributes.task == PhDOE.user.login)
            }, new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !(PhDOE.user.haveKarma && this.node.attributes.task == PhDOE.user.login),
                module: 'patches',
                from: 'user',
                node: false,
                folderNode: false,
                patchNode: false,
                userNode: this.node
            })]
        });
    }
});

// PatchesTreeGrid : context menu for patches items
// config - { node, e }
ui.cmp._PatchesTreeGrid.menu.patches = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.patches.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.patches, Ext.menu.Menu, {
    init: function(){
        var node = this.node, allFiles = [],
        currentUser = node.parentNode.attributes.task,
        currentUserIsAnonymous = node.parentNode.attributes.isAnonymous,
        currentUserHaveKarma = node.parentNode.attributes.haveKarma;

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);


        Ext.apply(this, {
            items: [{
                text: _('Edit the description of this patch'),
                iconCls: 'iconPendingPatch',
                hidden: (currentUser !== PhDOE.user.login),
                handler: function(){
                    var win = new ui.cmp.ManagePatchPrompt({
                        title: _('Modify this patch description'),
                        patchName : node.attributes.task,
                        patchDescription : node.attributes.patchDescription,
                        patchEmail : node.attributes.patchEmail,
                        patchID   : node.attributes.idDB
                    });
                    win.show(this.el);
                }
            }, {
                text: _('Delete this patch'),
                iconCls: 'iconTrash',
                hidden: (currentUser !== PhDOE.user.login),
                handler: function() {
                    ui.task.DeletePatchTask({
                        patchID: node.attributes.idDB
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(currentUser == PhDOE.user.login)
            }, {
                text: _('Back all this patch to work in progress module'),
                iconCls: 'iconWorkInProgress',
                hidden: !(currentUser == PhDOE.user.login),
                disabled: Ext.isEmpty(allFiles),
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator'
            },{
                text: _('View unified diff'),
                iconCls: 'iconViewDiff',
                handler: function(){
                    Ext.getCmp('main-panel').openDiffTab({
                        DiffType: 'file',
                        patchID: node.attributes.idDB,
                        patchName: node.attributes.task
                    });
                }
            }, {
                text: _('Download the unified diff as a patch'),
                iconCls: 'iconDownloadDiff',
                handler: function(){
                    window.location.href = './do/downloadPatch' +
                    '?patchID=' +
                    node.attributes.idDB +
                    '&csrfToken=' +
                    csrfToken;
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.haveKarma && (currentUser === PhDOE.user.login || !currentUserHaveKarma))
            },

            // Commit item only when this patch belong to an anonymous user or user without karma and the current user is a valid VCS user with karma

            new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !(PhDOE.user.haveKarma && (currentUser === PhDOE.user.login || !currentUserHaveKarma)),
                module: 'patches',
                from: currentUserIsAnonymous ? 'anonymousPatch' : 'patch',
                node: false,
                folderNode: false,
                patchNode: this.node,
                userNode: this.node.parentNode
            }),
            {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin)
            },
            new ui.cmp._WorkTreeGrid.menu.admin({
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin),
                from: 'patch',
                node: this.node
            })
            ]
        });
    }
});

// PatchesTreeGrid : context menu for folders items
// config - { node }
ui.cmp._PatchesTreeGrid.menu.folders = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.folders.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.folders, Ext.menu.Menu, {
    init: function(){
        var allFiles = [];

        // We don't display all of this menu if the current user isn't the owner
        if (this.node.parentNode.parentNode.attributes.task !== PhDOE.user.login) {
            return false;
        }

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);

        Ext.apply(this, {
            items: [{
                text: _('Back all this folder to work in progress module'),
                iconCls: 'iconWorkInProgress',
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !PhDOE.user.haveKarma
            },
            new ui.cmp._WorkTreeGrid.menu.commit({
                hidden: !PhDOE.user.haveKarma,
                module: 'patches',
                from: 'folder',
                node: false,
                folderNode: this.node,
                patchNode: this.node.parentNode,
                userNode: this.node.parentNode.parentNode
            })
            ]
        });
    }
});

// PatchesTreeGrid : context menu for files items
// config - { node }
ui.cmp._PatchesTreeGrid.menu.files = function(config){
    Ext.apply(this, config);
    this.init();
    ui.cmp._PatchesTreeGrid.menu.files.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PatchesTreeGrid.menu.files, Ext.menu.Menu, {
    init: function(){
        var node = this.node,
            FileType = node.attributes.type,
            FileLang,
            FilePath = node.parentNode.attributes.task,
            FileName = node.attributes.task, treeGrid = node.ownerTree,
            FileID = node.attributes.idDB,
            allFiles = [],
            owner = this.node.parentNode.parentNode.parentNode.attributes.task,
            ownerHaveKarma = this.node.parentNode.parentNode.parentNode.attributes.haveKarma,
            tmp;

        tmp = node.parentNode.attributes.task.split('/');
        FileLang = tmp[0];

        // We search for files to pass to patch
        this.node.cascade(function(node){
            if (node.attributes.type !== 'folder' && node.attributes.type !== 'patch' && node.attributes.type !== 'user') {
                allFiles.push(node);
            }
        }, this);

        Ext.apply(this, {
            items: [{
                text: '<b>' + ((FileType === 'delete') ? _('View in a new tab') : _('Edit in a new tab')) + '</b>',
                iconCls: 'iconEdit',
                handler: function(){
                    ui.cmp.WorkTreeGrid.getInstance().openFile(node);
                }
            }, {
                text: _('Back this file to work in progress module'),
                hidden: (owner !== PhDOE.user.login),
                iconCls: 'iconWorkInProgress',
                handler: function(){
                    ui.task.MoveToWork({
                        nodesToAdd: allFiles
                    });
                }
            }, '-', {
                text: _('View diff'),
                iconCls: 'iconViewDiff',
                handler: function(){
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
                hidden: !(owner == PhDOE.user.login)
            }, {
                text: ((FileType === 'delete') ? _('Cancel this deletion') : _('Clear this change')),
                hidden: !(owner == PhDOE.user.login),
                iconCls: 'iconPageDelete',
                handler: function(){
                    new ui.task.ClearLocalChangeTask({
                        ftype: FileType,
                        fpath: FilePath,
                        fname: FileName
                    });
                }
            }, {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.haveKarma && (owner === PhDOE.user.login || !ownerHaveKarma))
            },
                new ui.cmp._WorkTreeGrid.menu.commit({
                module: 'patches',
                hidden: !(PhDOE.user.haveKarma && (owner === PhDOE.user.login || !ownerHaveKarma)),
                from: 'file',
                node: this.node,
                folderNode: this.node.parentNode,
                patchNode: this.node.parentNode.parentNode,
                userNode: this.node.parentNode.parentNode.parentNode
            }), {
                xtype: 'menuseparator',
                hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin)
            },
                new ui.cmp._WorkTreeGrid.menu.admin({
                    hidden: !(PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin),
                    fileLang: FileLang,
                    from: 'file',
                    node: this.node,
                    folderNode: this.node.parentNode,
                    userNode: this.node.parentNode.parentNode.parentNode
                })
            ]
        });
    }
});

//------------------------------------------------------------------------------
// PatchesTreeGrid
ui.cmp.PatchesTreeGrid = Ext.extend(Ext.ux.tree.TreeGrid, {
    onContextMenu: function(node, e){
        e.stopEvent();

        var type = node.attributes.type, contextMenu;

        switch (type) {

            case "user":
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.users({
                    node: node
                });
                break;

            case "folder":
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.folders({
                    node: node
                });
                break;

            case "patch":
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.patches({
                    node: node
                });
                break;

            default: // Use default for file as the type can be update, delete or new
                node.select();
                contextMenu = new ui.cmp._PatchesTreeGrid.menu.files({
                    node: node
                });
                break;

        }

        contextMenu.showAt(e.getXY());

    },

    modPatchName: function(a)
    {
        var rootNode  = this.getRootNode(),
            patchNode = rootNode.findChild('idDB', a.patchID, true);

        patchNode.setText(a.newPatchName);
        patchNode.attributes.patchDescription = a.newPatchDescription;
        patchNode.attributes.patchEmail = a.newPatchEmail;
        patchNode.attributes.task = a.newPatchName;
    },

    initComponent: function(){

        Ext.apply(this, {
            animate: true,
            //enableDD        : true,
            //ddGroup         : 'mainPanelDDGroup',
            useArrows: true,
            autoScroll: true,
            border: false,
            containerScroll: true,
            selModel: new Ext.tree.MultiSelectionModel(),
            columns: [{
                header: _('Users'),
                dataIndex: 'task',
                uiProvider: {
                    editable: true,
                    qtip: 'help'
                },
                tpl: new Ext.XTemplate('{task:this.formatUserName}', {
                    formatUserName: function(v, data){

                        if( data.type === 'user' ) {

                            if( data.userID ) {
                                data.qtip= _('userID: ') + data.userID;
                            }
                            return v;
                        }

                        if( data.type === 'patch' ) {

                            if( data.creationDate ) {
                                data.qtip= _('Creation date: ') + Date.parseDate(data.creationDate, 'Y-m-d H:i:s').format(_('Y-m-d, H:i'));
                            }

                            return v;
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
                        if( data.type !== 'user' && data.type !== 'folder'  && data.type !== 'patch') {
                            return Date.parseDate(v, 'Y-m-d H:i:s').format(_('Y-m-d, H:i'));
                        } else {
                            return '';
                        }
                    }
                })
            }],
            loader: {
                dataUrl: './do/getWork',
                baseParams: {
                    module: 'PatchesForReview'
                },
                listeners: {
                    beforeload: function() {
                        Ext.getCmp('acc-patches').setIconClass('iconLoading');

                    },
                    load: function() {
                        Ext.getCmp('acc-patches').setIconClass('iconPatch');
                    }
                }
            }
        });
        ui.cmp.PatchesTreeGrid.superclass.initComponent.call(this);

        this.on('contextmenu', this.onContextMenu, this);
        this.on('resize', this.resizeCmp, this);
        this.on('dblclick', ui.cmp.WorkTreeGrid.getInstance().openFile, this);

        this.getRootNode().on('beforechildrenrendered', function(){
            this.updateFilesCounter.defer(200, this);
        }, this);
    },

    resizeCmp: function(c, a, b, w){

        this.columns[0].width = w - (this.columns[1].width + 5);
        this.updateColumnWidths();
    },

    deletePatch: function(patchID){
        var rootNode = this.getRootNode(), user, patches, folders, file, nodesToAdd = [], i, j, k, l;

        for (i = 0; i < rootNode.childNodes.length; i++) {
            user = rootNode.childNodes[i];

            for (j = 0; j < user.childNodes.length; j++) {
                patches = user.childNodes[j];

                if (patches.attributes.idDB === patchID) {

                    // If this patch contains some folders/Files, we get it to put into work in progress module
                    if (!Ext.isEmpty(patches.childNodes)) {

                        for (k = 0; k < patches.childNodes.length; k++) {
                            folders = patches.childNodes[k];

                            for (l = 0; l < folders.childNodes.length; l++) {
                                file = folders.childNodes[k];
                                nodesToAdd.push(file);
                            }
                        }

                        // We put this files to work in progress module
                        ui.cmp.WorkTreeGrid.getInstance().addToWork(nodesToAdd);

                    }

                    // Now, we remove this patches
                    patches.remove(true);

                    // Is Folder contains some others child ? If not, we remove this user too.
                    if (Ext.isEmpty(user.childNodes)) {
                        user.remove(true);
                    }

                    // We update the FilesCounter
                    this.updateFilesCounter();

                    return;


                }
            }
        }
    },

    delRecord: function(fid){
        var rootNode = this.getRootNode(), user, patches, folder, file, i, j, g, h;

        for (i = 0; i < rootNode.childNodes.length; i++) {
            user = rootNode.childNodes[i];

            for (j = 0; j < user.childNodes.length; j++) {
                patches = user.childNodes[j];

                for (g = 0; g < patches.childNodes.length; g++) {
                    folder = patches.childNodes[g];

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
        }

        // We update the FilesCounter
        this.updateFilesCounter();
    },

    getUserPatchesList: function(){
        var rootNode = this.getRootNode(), userNode = rootNode.findChild('task', PhDOE.user.login), patchesList = [];

        // We start by searching if this user have a node
        if (!userNode) {
            return false;
        }
        else {

            if (!userNode.hasChildNodes()) {
                return false;
            }
            else {

                userNode.eachChild(function(node){
                    patchesList.push(node);
                }, this);

                return patchesList;
            }
        }
    },

    addToPatch: function(PatchID, PatchName, nodesToAdd, PatchDescription, PatchEmail){
        var rootNode, userNode, PatchNode, folderNode, type, iconCls, fileNode, nowDate, i;

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

        // We search now into this user the right patch
        PatchNode = userNode.findChild('task', PatchName);

        // If this folder don't exist, we create it
        if (!PatchNode) {

            PatchNode = new Ext.tree.TreeNode({
                task: PatchName,
                patchDescription:PatchDescription,
                patchEmail:PatchEmail,
                type: 'patch',
                iconCls: 'iconPatch',
                expanded: true,
                idDB: PatchID
            });

            userNode.appendChild(PatchNode);
            userNode.expand(); // This allow to show our new node
        }

        /* Now, our patch exist into the tree. If there is some files to add in, we add it now */
        if (nodesToAdd) {

            // We walk into the nodes to add
            for (i = 0; i < nodesToAdd.length; i++) {

                // We search now into this patch the right folder
                folderNode = PatchNode.findChild('task', nodesToAdd[i].parentNode.attributes.task);

                // If this folder don't exist, we create it
                if (!folderNode) {

                    folderNode = new Ext.tree.TreeNode({
                        task: nodesToAdd[i].parentNode.attributes.task,
                        type: 'folder',
                        iconCls: 'iconFolderOpen',
                        expanded: true
                    });

                    PatchNode.appendChild(folderNode);
                    PatchNode.expand(); // This allow to show our new node
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
        var rootNode, userNode, folderNode, fileNode, nowDate, iconCls;

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
        var rootNode = this.getRootNode(), nbFiles = 0, user, folder, files, i, j, h, g;

        rootNode.cascade(function(node){
                if( !node.isRoot && node.attributes.type !== 'user' && node.attributes.type !== 'folder' && node.attributes.type !== 'patch') {
                        if (node.parentNode.parentNode.parentNode.attributes.task === PhDOE.user.login) {
                                nbFiles++;
                        }
                }
        }, this);

        return nbFiles;
    },

    updateFilesCounter: function(){
        var count = this.countFiles();

        Ext.getDom('acc-patches-nb').innerHTML = count;

    }
});

// singleton
ui.cmp._PatchesTreeGrid.instance = null;
ui.cmp.PatchesTreeGrid.getInstance = function(config){
    if (!ui.cmp._PatchesTreeGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PatchesTreeGrid.instance = new ui.cmp.PatchesTreeGrid(config);
    }
    return ui.cmp._PatchesTreeGrid.instance;
};
