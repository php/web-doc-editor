var PhDOE = function()
{
    Ext.QuickTips.init();

    return {
        // Variable
        userLogin  : null,
        userLang   : null,
        appName    : 'Php Docbook Online Editor',
        appVer     : 'X.XX',
        appLoaded  : false,
        uiRevision : '$Revision$',

        lastInfoDate : null,
        userConf   : '',

        project    : '',

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
                case 'encoding_error' :
                    title = _('Error');
                    mess  = _('You have used characters that require the use of UTF-8 despite the XML header.<br>Please delete these characters or change the header of the XML file in UTF-8 ; i.e.:<br><br><center><i>&lt;?xml version="1.0" encoding="utf-8"?&gt;</i></center>');
                    break;
                case 'tabs_found' :
                    title = _('Error');
                    mess  = _('It seems that you have inserted some tabs caracters into this files. Please, replace each one by one space.<br>Tip: You can use the "Re-indent all this file" button to replace all tabs by spaces.');
                    break;
                case 'folder_already_exist' :
                    title = _('Error');
                    mess  = _('This folder already exist in the current folder.');
                    break;
                case 'file_already_exist' :
                    title = _('Error');
                    mess  = _('This file already exist in the current folder.');
                    break;
            }

            Ext.MessageBox.alert(
                title,
                mess
            );
        },

        runDirectAccess: function()
        {
            if (directAccess) {
                ui.component.RepositoryTree.getInstance().openFile(
                    directAccess.lang + directAccess.path,
                    directAccess.name
                );
            }
        },

        // All we want to do after all dataStore are loaded
        afterLoadAllStore: function()
        {
            this.appLoaded = true;

            // Run DirectAccess if present
            this.runDirectAccess();

            //Load external data
            // Mails ?
            if( this.userConf.mainAppLoadMailsAtStartUp ) {
                ui.component.PortletLocalMail.getInstance().reloadData();
            }
            // Bugs ?
            if( this.userConf.mainAppLoadBugsAtStartUp ) {
                ui.component.PortletBugs.getInstance().reloadData();
            }
        },

        loadAllStore: function()
        {
            var progressBar = new Ext.ProgressBar({
                    width:300,
                    renderTo:'loading-progressBar'
                });
            progressBar.show();

            // Store to load for LANG project
            if (PhDOE.userLang !== 'en') {

                // We load all stores, one after the others
                document.getElementById("loading-msg").innerHTML = "Loading data...";
                progressBar.updateProgress(1/13, '1 of 13...');
                ui.component._MainMenu.store.load({
                    callback: function() {
                        progressBar.updateProgress(2/13, '2 of 13...');
                        ui.component.StaleFileGrid.getInstance().store.load({
                            callback: function() {
                                progressBar.updateProgress(3/13, '3 of 13...');
                                ui.component.ErrorFileGrid.getInstance().store.load({
                                    callback: function() {
                                        progressBar.updateProgress(4/13, '4 of 13...');
                                        ui.component.PendingReviewGrid.getInstance().store.load({
                                            callback: function() {
                                                progressBar.updateProgress(5/13, '5 of 13...');
                                                ui.component.NotInENGrid.getInstance().store.load({
                                                    callback: function() {
                                                        progressBar.updateProgress(6/13, '6 of 13...');
                                                        ui.component.PendingCommitGrid.getInstance().store.load({
                                                            callback: function() {
                                                                progressBar.updateProgress(7/13, '7 of 13...');
                                                                ui.component.PendingPatchGrid.getInstance().store.load({
                                                                    callback: function() {
                                                                        progressBar.updateProgress(8/13, '8 of 13...');
                                                                        ui.component.PortletSummary.getInstance().store.load({
                                                                            callback: function() {
                                                                                progressBar.updateProgress(9/13, '9 of 13...');
                                                                                ui.component.PortletTranslationGraph.getInstance().store.load({
                                                                                    callback: function() {
                                                                                        progressBar.updateProgress(10/13, '10 of 13...');
                                                                                        ui.component.PortletTranslationsGraph.getInstance().store.load({
                                                                                            callback: function() {
                                                                                                progressBar.updateProgress(11/13, '11 of 13...');
                                                                                                ui.component.PortletTranslator.getInstance().store.load({
                                                                                                    callback: function() {
                                                                                                        progressBar.updateProgress(12/13, '12 of 13...');
                                                                                                        ui.component.PendingTranslateGrid.getInstance().store.load({
                                                                                                            callback: function() {
                                                                                                                progressBar.updateProgress(13/13, '13 of 13...');
                                                                                                                ui.component.PortletInfo.getInstance().store.load({
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
                    }
                });
            } else {
                // Store to load only for EN project
                document.getElementById("loading-msg").innerHTML = "Loading data...";
                progressBar.updateProgress(1/6, '1 of 6...');
                ui.component._MainMenu.store.load({
                    callback: function() {
                        progressBar.updateProgress(2/6, '2 of 6...');
                        ui.component.PendingPatchGrid.getInstance().store.load({
                            callback: function() {
                                progressBar.updateProgress(3/6, '3 of 6...');
                                ui.component.PortletTranslationsGraph.getInstance().store.load({
                                    callback: function() {
                                        progressBar.updateProgress(4/6, '4 of 6...');
                                        ui.component.PendingCommitGrid.getInstance().store.load({
                                            callback: function() {
                                                progressBar.updateProgress(5/6, '5 of 6...');
                                                ui.component.ErrorFileGrid.getInstance().store.load({
                                                    callback: function() {
                                                        progressBar.updateProgress(6/6, '5 of 6...');
                                                        ui.component.PortletInfo.getInstance().store.load({
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
            var portal, portalEN, portalLANG, mainContentLeft=[], mainContentRight=[], allPortlet=[];
            
            // Default value for portalEN & portalLANG sort
            
            portalEN = {
                'col1' : ["portletLocalMail","portletBugs"],
                'col2' : ["portletInfo","portletTranslationsGraph"]
            };
            
            portalLANG = {
                'col1' : ["portletSummary","portletTranslator","portletLocalMail","portletBugs"],
                'col2' : ["portletInfo","portletTranslationGraph","portletTranslationsGraph"]
            };
            
            // Get user conf
            if ( this.userLang === 'en' ) {
                (this.userConf.portalSortEN) ? portal = Ext.util.JSON.decode(this.userConf.portalSortEN) : portal = portalEN;

                allPortlet["portletLocalMail"] = ui.component.PortletLocalMail.getInstance({lang: this.userLang});
                allPortlet["portletBugs"] = ui.component.PortletBugs.getInstance({lang: this.userLang});
                allPortlet["portletInfo"] = ui.component.PortletInfo.getInstance();
                allPortlet["portletTranslationsGraph"] = ui.component.PortletTranslationsGraph.getInstance();
            }
            else
            {
                (this.userConf.portalSortLANG) ? portal = Ext.util.JSON.decode(this.userConf.portalSortLANG) : portal = portalLANG;
                
                allPortlet["portletSummary"] = ui.component.PortletSummary.getInstance({lang: this.userLang});
                allPortlet["portletTranslator"] = ui.component.PortletTranslator.getInstance({lang: this.userLang});
                allPortlet["portletLocalMail"] = ui.component.PortletLocalMail.getInstance({lang: this.userLang});
                allPortlet["portletBugs"] = ui.component.PortletBugs.getInstance({lang: this.userLang});

                allPortlet["portletInfo"] = ui.component.PortletInfo.getInstance();
                allPortlet["portletTranslationGraph"] = ui.component.PortletTranslationGraph.getInstance();
                allPortlet["portletTranslationsGraph"] = ui.component.PortletTranslationsGraph.getInstance();
            }


            for( var i=0; i < portal.col1.length; i++ ) {
                mainContentLeft.push(allPortlet[portal.col1[i]]);
            }
            for( var i=0; i < portal.col2.length; i++ ) {
                mainContentRight.push(allPortlet[portal.col2[i]]);
            }
            
            // We keel alive our session by sending a ping every minute
            ui.task.PingTask.getInstance().delay(30000); // start after 1 minute.

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
                                    value : newWidth,
                                    notify: false
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
                        title     : _('Files need translate') + ' (<em id="acc-need-translate-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedTranslate',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.PendingTranslateGrid.getInstance() ],
                        collapsed : true
                    },{
                        id        : 'acc-need-update',
                        title     : _('Files need update') + ' (<em id="acc-need-update-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesNeedUpdate',
                        hidden    : (this.userLang === 'en'),
                        items     : [ ui.component.StaleFileGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-error',
                        title     : (this.userLang === 'en') ? "Number of failures to meet 'strict standards'" + ' (<em id="acc-error-nb">0</em>)' : _('Error in current translation') + ' (<em id="acc-error-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconFilesError',
                        items     : [ ui.component.ErrorFileGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-need-reviewed',
                        title     : _('Files need reviewed') + ' (<em id="acc-need-reviewed-nb">0</em>)',
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
                        title     : _('Pending patches') + ' (<em id="acc-pendingPatch-nb">0</em>)',
                        layout    : 'fit',
                        border    : false,
                        iconCls   : 'iconPendingPatch',
                        items     : [ ui.component.PendingPatchGrid.getInstance() ],
                        collapsed : true
                    }, {
                        id        : 'acc-google-translate',
                        title     : _('Google translation'),
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
                                                ((this.userLogin != "anonymous") ? String.format(_('Connected as <em>{0}</em>'), this.userLogin.ucFirst()) : String.format(_('Connected as <em>{0}</em>'), _('anonymous'))) +
                                                '<br/><br/>' +
                                                _('Project / Language: ') + '<em id="Info-Project">' + this.project + '</em> / <em id="Info-Language">-</em>'+
                                            '</h3>' +
                                        '</div>' +
                                     '</div>'

                        }, {
                            xtype  : 'portal',
                            border : false,
                            items  : [{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentLeft
                            },{
                                columnWidth : 0.5,
                                style       : 'padding:10px 5px 10px 5px',
                                items       : mainContentRight
                            }],
                            listeners: {
                                drop: function(a) {
                                    var portal, col1Sort = [], col2Sort = [], id;

                                    // Column 1
                                    for( var i=0; i < a.portal.items.items[0].items.items.length; i++ ) {
                                        id = a.portal.items.items[0].items.items[i].id;
                                        //console.log(id);
                                        col1Sort.push(id);
                                    }
                                    // Column 2
                                    for( var i=0; i < a.portal.items.items[1].items.items.length; i++ ) {
                                        id = a.portal.items.items[1].items.items[i].id;
                                        //console.log(id);
                                        col2Sort.push(id);
                                    }

                                    portal = {
                                        'col1' : col1Sort,
                                        'col2' : col2Sort
                                    };

                                    // We store this config var into portalSortEN for EN users, and portalSortLANG for LANG users

                                    new ui.task.UpdateConfTask({
                                        item  : (PhDOE.userLang === 'en') ? 'portalSortEN' : 'portalSortLANG',
                                        value : Ext.util.JSON.encode(portal),
                                        notify: false
                                    });
                                    
                                }
                            }
                        }]
                    }]
                }]
            });

            new Ext.dd.DropTarget(Ext.get('main-panel'), {
                ddGroup    : 'mainPanelDDGroup',
                notifyDrop : function(ddSource, e, data) {

                    var i, idToOpen;

                    // Special case for the repositoryTree
                    if( data.nodes ) {
                        for( i=0; i < data.nodes.length; i++ ) {
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
                    for( i=0; i < data.selections.length; i++ ) {
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

                    // We open the first file

                    if( data.grid.ownerCt.id === 'acc-need-translate' ) {
                        idToOpen = PhDOE.FNTfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNTfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-update' ) {
                        idToOpen = PhDOE.FNUfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNUfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-error' ) {
                        idToOpen = PhDOE.FEfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FEfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-reviewed' ) {
                        idToOpen = PhDOE.FNRfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNRfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-notInEn' ) {
                        idToOpen = PhDOE.FNIENfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.FNIENfilePendingOpen.shift();
                    }
                    if( data.grid.ownerCt.id === 'acc-need-pendingPatch' ) {
                        idToOpen = PhDOE.PPfilePendingOpen[0];
                        // We delete this from pending
                        PhDOE.PPfilePendingOpen.shift();
                    }

                    data.grid.openFile(idToOpen.id);

                    return true;
                }
            });

            // Load all store & remove the mask after all store are loaded
            this.loadAllStore();

        } // drawInterface
    }; // Return
}();
Ext.EventManager.onDocumentReady(PhDOE.init, PhDOE, true);