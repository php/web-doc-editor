var PhDOE = function()
{
    Ext.QuickTips.init();

    return {
        // Variable
        userLogin  : null,
        userLang   : null,
        appName    : 'Php Docbook Online Editor',
        appVer     : 'X.XX',
        uiRevision : '$Revision$',

        userConf : '',

        project : '',

        FNTfilePendingOpen   : [],
        FNUfilePendingOpen   : [],
        FEfilePendingOpen    : [],
        FNRfilePendingOpen   : [],
        FNIENfilePendingOpen : [],
        AFfilePendingOpen    : [],
        PPfilePendingOpen    : [],

        init : function()
        {
            // We load the configuration for this user
            new ui.task.LoadConfigTask();
        },

        notify : function (type, title, message) {

            var _notify, iconCls;

            if( type == 'info' ) {
                iconCls = 'iconInfo';
            }

            if( type == 'error' ) {
                iconCls = 'iconError';
            }

            _notify = new Ext.ux.Notification({
                iconCls     : iconCls,
                title       : title,
                html        : message,
                autoDestroy : true,
                hideDelay   :  5000
            });

            _notify.show(document); 

        },

        winForbidden : function(type)
        {

            var title = _('Forbidden'),
                mess  = _('You can\'t do this action as anonymous user.');

            switch (type) {
                case 'fs_error' :
                    title = _('Error');
                    mess  = _('File system error. Check read/write permission under data folder.');
                    break;
            }

            Ext.MessageBox.alert(
                title,
                mess
            );
        },

        runDirectAccess: function() {

            if (directAccess) {
                ui.component.RepositoryTree.getInstance().openFile(
                    directAccess.lang + directAccess.path,
                    directAccess.name
                );
            }

        },

        // All we want to do after all dataStore are loaded
        afterLoadAllStore: function() {

            // Run DirectAccess if present
            this.runDirectAccess();

            //Load external data
            // Mails ?
            if( this.userConf['mainAppLoadMailsAtStartUp'] ) {
                ui.component.PortletLocalMail.getInstance().reloadData();
            }
            // Bugs ?
            if( this.userConf['mainAppLoadBugsAtStartUp'] ) {
                ui.component.PortletBugs.getInstance().reloadData();
            }

        },

        loadAllStore: function() {

            var progressBar = new Ext.ProgressBar({
                    width:300,
                    renderTo:'loading-progressBar'
                });
            progressBar.show();;

            // Store to load for LANG project
            if (PhDOE.userLang !== 'en') {

                // We load all stores, one after the others
                document.getElementById("loading-msg").innerHTML = "Loading data...";
                progressBar.updateProgress(1/12, '1 of 12...');
                ui.component._MainMenu.store.load({
                    callback: function() {
                        progressBar.updateProgress(2/12, '2 of 12...');
                        ui.component.StaleFileGrid.getInstance().store.load({
                            callback: function() {
                                progressBar.updateProgress(3/12, '3 of 12...');
                                ui.component.ErrorFileGrid.getInstance().store.load({
                                    callback: function() {
                                        progressBar.updateProgress(4/12, '4 of 12...');
                                        ui.component.PendingReviewGrid.getInstance().store.load({
                                            callback: function() {
                                                progressBar.updateProgress(5/12, '5 of 12...');
                                                ui.component.NotInENGrid.getInstance().store.load({
                                                    callback: function() {
                                                        progressBar.updateProgress(6/12, '6 of 12...');
                                                        ui.component.PendingCommitGrid.getInstance().store.load({
                                                            callback: function() {
                                                                progressBar.updateProgress(7/12, '7 of 12...');
                                                                ui.component.PendingPatchGrid.getInstance().store.load({
                                                                    callback: function() {
                                                                        progressBar.updateProgress(8/12, '8 of 12...');
                                                                        ui.component.PortletSummary.getInstance().store.load({
                                                                            callback: function() {
                                                                                progressBar.updateProgress(9/12, '9 of 12...');
                                                                                ui.component.PortletTranslationGraph.getInstance().store.load({
                                                                                    callback: function() {
                                                                                        progressBar.updateProgress(10/12, '10 of 12...');
                                                                                        ui.component.PortletTranslationsGraph.getInstance().store.load({
                                                                                            callback: function() {
                                                                                                progressBar.updateProgress(11/12, '11 of 12...');
                                                                                                ui.component.PortletTranslator.getInstance().store.load({
                                                                                                    callback: function() {
                                                                                                        progressBar.updateProgress(12/12, '12 of 12...');
                                                                                                        ui.component.PendingTranslateGrid.getInstance().store.load({
                                                                                                            callback: function() {
                                                                                                                // Now, we can to remove the global mask
                                                                                                                Ext.get('loading').remove();
                                                                                                                Ext.fly('loading-mask').fadeOut({ remove : true });
                                                                                                                progressBar.destroy();
                                                                                                                PhDOE.afterLoadAllStore();
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                // Store to load only for EN project
                document.getElementById("loading-msg").innerHTML = "Loading data...";
                progressBar.updateProgress(1/4, '1 of 4...');
                ui.component._MainMenu.store.load({
                    callback: function() {
                        progressBar.updateProgress(2/4, '2 of 4...');
                        ui.component.PendingPatchGrid.getInstance().store.load({
                            callback: function() {
                                progressBar.updateProgress(3/4, '3 of 4...');
                                ui.component.PortletTranslationsGraph.getInstance().store.load({
                                    callback: function() {
                                        progressBar.updateProgress(4/4, '4 of 4...');
                                        ui.component.PendingCommitGrid.getInstance().store.load({
                                            callback: function() {
                                                // Now, we can to remove the global mask
                                                Ext.get('loading').remove();
                                                Ext.fly('loading-mask').fadeOut({ remove : true });
                                                progressBar.destroy();
                                                PhDOE.afterLoadAllStore();
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        },

        reloadAllStore: function() {

            // Store to reload for LANG project
            if (PhDOE.userLang !== 'en') {
                // We reload all stores, one after the others
                ui.component.PendingTranslateGrid.getInstance().store.reload({
                    callback: function() {
                        ui.component.StaleFileGrid.getInstance().store.reload({
                            callback: function() {
                                ui.component.ErrorFileGrid.getInstance().store.reload({
                                    callback: function() {
                                        ui.component.PendingReviewGrid.getInstance().store.reload({
                                            callback: function() {
                                                ui.component.NotInENGrid.getInstance().store.reload({
                                                    callback: function() {
                                                        ui.component.PendingCommitGrid.getInstance().store.reload({
                                                            callback: function() {
                                                                ui.component.PendingPatchGrid.getInstance().store.reload({
                                                                    callback: function() {
                                                                        ui.component.PortletSummary.getInstance().store.reload({
                                                                            callback: function() {
                                                                                ui.component.PortletTranslator.getInstance().store.reload({
                                                                                    callback: function() {
                                                                                        ui.component.PortletTranslationGraph.getInstance().store.reload({
                                                                                            callback: function() {
                                                                                                ui.component.PortletTranslationsGraph.getInstance().store.reload();
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                // Store to reload only for EN project
                ui.component.PendingCommitGrid.getInstance().store.reload({
                    callback: function() {
                        ui.component.PendingPatchGrid.getInstance().store.reload();
                    }
                });
            }
        },

        drawInterface: function()
        {
            // We keel alive our session by sending a ping every minute
            ui.task.PingTask.getInstance().delay(30000); // start after 1 minute.

                mainContentLeft = (this.userLang === 'en') ? [
                    ui.component.PortletLocalMail.getInstance({lang: this.userLang}),
                    ui.component.PortletBugs.getInstance({lang: this.userLang})
                ] : [
                    ui.component.PortletSummary.getInstance({lang: this.userLang}),
                    ui.component.PortletTranslator.getInstance({lang: this.userLang}),
                    ui.component.PortletLocalMail.getInstance({lang: this.userLang})
                ];

                mainContentRight = (this.userLang === 'en') ? [
                    ui.component.PortletTranslationsGraph.getInstance()
                ] : [
                    ui.component.PortletTranslationGraph.getInstance() ,
                    ui.component.PortletTranslationsGraph.getInstance(),
                    ui.component.PortletBugs.getInstance({lang: this.userLang})
                ];

            new Ext.Viewport({
                layout : 'border',
                    id           : 'main-app',
                items : [{
                    // logo
                    region     : 'north',
                    html       : '<h1 class="x-panel-header">' +
                                    '<img src="themes/img/mini_php.png" ' +
                                        'style="vertical-align: middle;" />&nbsp;&nbsp;' +
                                    this.appName +
                                 '</h1>',
                    autoHeight : true,
                    border     : false,
                    margins    : '0 0 5 0'
                }, {
                    // accordion
                    region       : 'west',
                    id           : 'main-menu-panel',
                    layout       : 'accordion',
                    collapsible  : true,
                    collapseMode : 'mini',
                    animate      : true,
                    split        : true,
                    width        : PhDOE.userConf.mainAppMainMenuWidth || 300,
                    header       : false,
                    listeners: {
                        resize: function(a,newWidth) {

                            if( newWidth && newWidth != PhDOE.userConf.mainAppMainMenuWidth ) { // As the type is different, we can't use !== to compare with !
                                var tmp = new ui.task.UpdateConfTask({
                                    item  : 'mainAppMainMenuWidth',
                                    value : newWidth
                                });
                            }
                        }
                    },
                    tbar : [{
                        text    : _('Main Menu'),
                        iconCls : 'MainMenu',
                        menu    : new ui.component.MainMenu()
                    }],
                    items : [{
                        id        : 'acc-need-translate',
                        title     : _('Files Need Translate') + ' (<em id="acc-need-translate-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedTranslate',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.PendingTranslateGrid.getInstance() ],
                        collapsed : true
                    },{
                        id        : 'acc-need-update',
                        title     : _('Files Need Update') + ' (<em id="acc-need-update-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedUpdate',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.StaleFileGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-error',
                        title     : _('Error in current translation') + ' (<em id="acc-error-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesError',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.ErrorFileGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-need-reviewed',
                        title     : _('Files Need Reviewed') + ' (<em id="acc-need-reviewed-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedReviewed',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.PendingReviewGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-notInEn',
                        title     : _('Not in EN tree') + ' (<em id="acc-notInEn-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconNotInEn',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.NotInENGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-all-files',
                        title     : _('All files'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconAllFiles',
                        items     : [ ui.component.RepositoryTree.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-need-pendingCommit',
                        tools     : [{
                            id      : 'gear',
                            hidden  : (this.userLogin == 'anonymous' ),
                            qtip    : _('Open the Log Message Manager'),
                            handler : function() {
                                if( ! Ext.getCmp('commit-log-win') )
                                {
                                    var win = new ui.component.CommitLogManager();
                                }
                                Ext.getCmp('commit-log-win').show('acc-need-pendingCommit');
                            }
                        }],
                        title     : _('Pending for commit') + ' (<em id="acc-pendingCommit-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconPendingCommit',
                        items     : [ ui.component.PendingCommitGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-need-pendingPatch',
                        title     : _('Pending Patch') + ' (<em id="acc-pendingPatch-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconPendingPatch',
                        items     : [ ui.component.PendingPatchGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-google-translate',
                        title     : _('Google Translation'),
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconGoogle',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.GoogleTranslationPanel.getInstance() ],
                        collapsed : true
                    }]
                }, {
                    // main panel
                    xtype             : 'mainpanel',
                    id                : 'main-panel',
                    region            : 'center',
                    items : [{
                        xtype      : 'panel',
                        id         : 'MainInfoTabPanel',
                        title      : _('Home'),
                        baseCls    : 'MainInfoTabPanel',
                        autoScroll : true,
                        plain      : true,
                        items : [{
                            xtype  : 'panel',
                            border : false,
                            html   : '<div class="res-block">' +
                                        '<div class="res-block-inner">' +
                                            '<h3>' +
                                                ((this.userLogin != "anonymous") ? String.format(_('Connected as <em>{0}</em>'), this.userLogin) : String.format(_('Connected as <em>{0}</em>'), _('anonymous'))) +
                                                '<br/><br/>' +
                                                _('Project / Language: ') + '<em id="Info-Project">' + this.project + '</em> / <em id="Info-Language">-</em>'+
                                            '</h3>' +
                                        '</div>' +
                                     '</div>' +
                                     '<div class="res-block">' +
                                        '<div class="res-block-inner">' +
                                            '<p>' +
                                            _('Last data update: ') + '<em id="Info-LastUpdateData">-</em>' +
                                            '<br/><br/>' +
                                            _('Last entities check: ') + '<em id="Info-LastCheckEntities">-</em>' +
                                            '</p>' +
                                        '</div>' +
                                     '</div>'

                        }, {
                            xtype      : 'portal',
                            border: false,
                            items:[{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentLeft
                            },{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentRight
                            }]
                        }]
                    }]
                }]
            });

            new Ext.dd.DropTarget(Ext.get('main-panel'), {
                ddGroup    : 'mainPanelDDGroup',
                notifyDrop : function(ddSource, e, data) {

                    // Special case for the repositoryTree
                    if( data.nodes ) {
                        for( var i=0; i < data.nodes.length; i++ ) {
                            PhDOE.AFfilePendingOpen[i] = {
                                nodeID: data.nodes[i].attributes.id
                            };
                        }
                        
                        // Start the first
                        ui.component.RepositoryTree.getInstance().openFile(
                            'byId',
                            PhDOE.AFfilePendingOpen[0].nodeID,
                            false
                        );

                        PhDOE.AFfilePendingOpen.shift();
                        return true;
                    }

                    // Special case for PendingCommit grid. As this grid can open a file in all modules, we can't use this mechanism. As it, we have disable the possibility to open multi-files. Just one can be open at once.
                    if( data.grid.ownerCt.id === 'acc-need-pendingCommit' ) {
                        data.grid.openFile(data.selections[0].data.id);
                        return true;
                    }

                    // We store the data
                    for( var i=0; i < data.selections.length; i++ ) {
                        if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                            PhDOE.FNTfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-update' ) {
                            PhDOE.FNUfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-error' ) {
                            PhDOE.FEfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                            PhDOE.FNRfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                            PhDOE.FNIENfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                            PhDOE.PPfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                        if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                            PhDOE.PPfilePendingOpen[i] = { id: data.selections[i].data.id };
                        }
                    }

                    // On ouvre le premier
                    var idToOpen;

                    if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                        idToOpen = PhDOE.FNTfilePendingOpen[0];
                        // On le supprime de la pile
                        PhDOE.FNTfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-update' ) {
                        idToOpen = PhDOE.FNUfilePendingOpen[0];
                        // On le supprime de la pile
                        PhDOE.FNUfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-error' ) {
                        idToOpen = PhDOE.FEfilePendingOpen[0];
                        // On le supprime de la pile
                        PhDOE.FEfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                        idToOpen = PhDOE.FNRfilePendingOpen[0];
                        // On le supprime de la pile
                        PhDOE.FNRfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                        idToOpen = PhDOE.FNIENfilePendingOpen[0];
                        // On le supprime de la pile
                        PhDOE.FNIENfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                        idToOpen = PhDOE.PPfilePendingOpen[0];
                        // On le supprime de la pile
                        PhDOE.PPfilePendingOpen.shift();
                    }

                    data.grid.openFile(idToOpen.id);

                    return true;
                }
            });

            // Add Events to main-panel
            Ext.getCmp('main-panel').addEvents('tabLoaded');

            //
            Ext.getCmp('main-panel').on('tabLoaded', function(prefix, fid) {

                var cmp = Ext.getCmp(prefix + '-' + fid);

                // FNT panel
                if( prefix == 'FNT' ) {
                    if( cmp.panTRANSLoaded && cmp.panGGTRANSLoaded ) {
                        cmp.panTRANSLoaded = panGGTRANSLoaded = false;

                        if (PhDOE.FNTfilePendingOpen[0]) {
                            ui.component.PendingTranslateGrid.getInstance().openFile(PhDOE.FNTfilePendingOpen[0].id);
                            PhDOE.FNTfilePendingOpen.shift();
                        }

                    }
                }
                // FNU panel
                if( prefix == 'FNU' ) {
                    if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panDiffLoaded && cmp.panVCSLang && cmp.panVCSEn ) {
                        cmp.panLANGLoaded = cmp.panENLoaded = cmp.panDiffLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                        if (PhDOE.FNUfilePendingOpen[0]) {
                            ui.component.StaleFileGrid.getInstance().openFile(PhDOE.FNUfilePendingOpen[0].id);
                            PhDOE.FNUfilePendingOpen.shift();
                        }
                    }
                }
                // FE panel
                if( prefix == 'FE' ) {
                    if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panVCSLang && cmp.panVCSEn ) {
                        cmp.panLANGLoaded = cmp.panENLoaded = cmp.panVCSLang = cmp.panVCSEn = false;
                        
                        if (PhDOE.FEfilePendingOpen[0]) {
                            ui.component.ErrorFileGrid.getInstance().openFile(PhDOE.FEfilePendingOpen[0].id);
                            PhDOE.FEfilePendingOpen.shift();
                        }
                    }
                }
                // FNR panel
                if( prefix == 'FNR' ) {
                    if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panVCSLang && cmp.panVCSEn ) {
                        cmp.panLANGLoaded = cmp.panENLoaded = cmp.panVCSLang = cmp.panVCSEn = false;
                        
                        if (PhDOE.FNRfilePendingOpen[0]) {
                            ui.component.PendingReviewGrid.getInstance().openFile(PhDOE.FNRfilePendingOpen[0].id);
                            PhDOE.FNRfilePendingOpen.shift();
                        }
                    }
                }

                // FNIEN panel
                if( prefix == 'FNIEN' ) {
                    if( cmp.panLANGLoaded ) {
                        cmp.panLANGLoaded = false;
                        if (PhDOE.FNIENfilePendingOpen[0]) {
                            ui.component.NotInENGrid.getInstance().openFile(PhDOE.FNIENfilePendingOpen[0].id);
                            PhDOE.FNIENfilePendingOpen.shift();
                        }
                    }
                }

                // AF panel
                if( prefix == 'AF' ) {
                    if( cmp.panLoaded && cmp.panVCS ) {
                        cmp.panLoaded = cmp.panVCS = false;
                        if (PhDOE.AFfilePendingOpen[0]) {
                            ui.component.RepositoryTree.getInstance().openFile(
                                ( PhDOE.AFfilePendingOpen[0].nodeID ) ? 'byId' : 'byPath',
                                ( PhDOE.AFfilePendingOpen[0].nodeID ) ? PhDOE.AFfilePendingOpen[0].nodeID : PhDOE.AFfilePendingOpen[0].fpath,
                                ( PhDOE.AFfilePendingOpen[0].nodeID ) ? false                             : PhDOE.AFfilePendingOpen[0].fname
                            );
                            PhDOE.AFfilePendingOpen.shift();
                        }
                    }
                }

                // PP panel
                if( prefix == 'PP' ) {
                    if( cmp.panPatchLoaded && cmp.panOriginLoaded  && cmp.panVCS && cmp.panPatchContent ) {
                        cmp.panPatchLoaded = cmp.panOriginLoaded  = cmp.panVCS = cmp.panPatchContent = false;
                        if (PhDOE.PPfilePendingOpen[0]) {
                            ui.component.PendingPatchGrid.getInstance().openFile(PhDOE.PPfilePendingOpen[0].id);
                            PhDOE.PPfilePendingOpen.shift();
                        }
                    }
                }


            }, this);

            // Load all store & remove the mask after all store are loaded
            this.loadAllStore();

        } // drawInterface
    }; // Return
}();
Ext.EventManager.onDocumentReady(PhDOE.init, PhDOE, true);
