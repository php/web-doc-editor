Ext.namespace('ui','ui.cmp','ui.cmp.MainPanel');

ui.cmp.MainPanel = Ext.extend(Ext.ux.SlidingTabPanel, {
    activeTab       : 0,
    enableTabScroll : true,
    plugins         : ['tabclosemenu', 'dblclickclosetabs'],

    initComponent: function(config)
    {
        Ext.apply(this, config);
        ui.cmp.MainPanel.superclass.initComponent.call(this);

        this.addEvents({
            tabLoaded : true
        });

        this.on('beforeremove', this.onBeforeRemove, this);
        this.on('tabchange',    this.onTabChange,    this);
        this.on('endDrag',      this.onTabChange,    this);
        this.on('tabLoaded',    this.onTabLoaded,    this);

    },

    onTabLoaded: function(prefix, fid)
    {
        var cmp = Ext.getCmp(prefix + '-' + fid);

        // FNT panel
        if( prefix === 'FNT' ) {
            if( cmp.panTRANSLoaded && cmp.panTRANSSecondLoaded ) {

                cmp.tabLoaded = true;

                cmp.panTRANSLoaded = cmp.panTRANSSecondLoaded = false;

                if (PhDOE.FNTfilePendingOpen[0]) {
                    ui.cmp.PendingTranslateGrid.getInstance().openFile(PhDOE.FNTfilePendingOpen[0].id);
                    PhDOE.FNTfilePendingOpen.shift();
                }

            }
        }
        // FNU panel
        if( prefix === 'FNU' ) {
            if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panDiffLoaded && cmp.panVCSLang && cmp.panVCSEn ) {

                cmp.tabLoaded = true;

                cmp.panLANGLoaded = cmp.panENLoaded = cmp.panDiffLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                if (PhDOE.FNUfilePendingOpen[0]) {
                    ui.cmp.StaleFileGrid.getInstance().openFile(PhDOE.FNUfilePendingOpen[0].id);
                    PhDOE.FNUfilePendingOpen.shift();
                }
            }
        }
        // FE panel
        if( prefix === 'FE' ) {
            if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panVCSLang && cmp.panVCSEn ) {

                cmp.tabLoaded = true;

                cmp.panLANGLoaded = cmp.panENLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                if (PhDOE.FEfilePendingOpen[0]) {
                    ui.cmp.ErrorFileGrid.getInstance().openFile(PhDOE.FEfilePendingOpen[0].id);
                    PhDOE.FEfilePendingOpen.shift();
                }
            }
        }
        // FNR panel
        if( prefix === 'FNR' ) {
            if( cmp.panLANGLoaded && cmp.panENLoaded && cmp.panVCSLang && cmp.panVCSEn ) {

                cmp.tabLoaded = true;

                cmp.panLANGLoaded = cmp.panENLoaded = cmp.panVCSLang = cmp.panVCSEn = false;

                if (PhDOE.FNRfilePendingOpen[0]) {
                    ui.cmp.PendingReviewGrid.getInstance().openFile(PhDOE.FNRfilePendingOpen[0].id);
                    PhDOE.FNRfilePendingOpen.shift();
                }
            }
        }

        // FNIEN panel
        if( prefix === 'FNIEN' ) {
            if( cmp.panLANGLoaded ) {

                cmp.tabLoaded = true;

                cmp.panLANGLoaded = false;
                if (PhDOE.FNIENfilePendingOpen[0]) {
                    ui.cmp.NotInENGrid.getInstance().openFile(PhDOE.FNIENfilePendingOpen[0].id);
                    PhDOE.FNIENfilePendingOpen.shift();
                }
            }
        }

        // AF panel
        if( prefix === 'AF' ) {
            if( cmp.panLoaded && cmp.panVCS && cmp.panEntities && cmp.panAcronyms ) {

                cmp.tabLoaded = true;

                cmp.panLoaded = cmp.panVCS = false;
                if (PhDOE.AFfilePendingOpen[0]) {
                    ui.cmp.RepositoryTree.getInstance().openFile(
                    ( PhDOE.AFfilePendingOpen[0].nodeID ) ? 'byId' : 'byPath',
                    ( PhDOE.AFfilePendingOpen[0].nodeID ) ? PhDOE.AFfilePendingOpen[0].nodeID : PhDOE.AFfilePendingOpen[0].fpath,
                    ( PhDOE.AFfilePendingOpen[0].nodeID ) ? false                             : PhDOE.AFfilePendingOpen[0].fname
                );
                    PhDOE.AFfilePendingOpen.shift();
                }
            }
        }

        // PP panel
        if( prefix === 'PP' ) {
            if( cmp.panPatchLoaded && cmp.panOriginLoaded  && cmp.panVCS && cmp.panPatchContent ) {

                cmp.tabLoaded = true;

                cmp.panPatchLoaded = cmp.panOriginLoaded  = cmp.panVCS = cmp.panPatchContent = false;
                if (PhDOE.PPfilePendingOpen[0]) {
                    ui.cmp.PendingPatchGrid.getInstance().openFile(PhDOE.PPfilePendingOpen[0].id);
                    PhDOE.PPfilePendingOpen.shift();
                }
            }
        }

    },

    onTabChange : function(panel, tab)
    {
        // We do somethings only if this panel contains a tab's navigation button
        if ( Ext.getCmp(tab.id + '-btn-tabRight-LANG')    ||
             Ext.getCmp(tab.id + '-btn-tabRight-EN')      ||
             Ext.getCmp(tab.id + '-btn-tabRight-ALL')     ||
             Ext.getCmp(tab.id + '-btn-tabRight-NotInEN') ||
             Ext.getCmp(tab.id + '-btn-tabRight-PATCH')   ||
             Ext.getCmp(tab.id + '-btn-tabRight-TRANS')   ||
             Ext.getCmp(tab.id + '-btn-tabRight-NEW')  ) {

            var currentTabId = tab.id,
                tabs         = Ext.getCmp('main-panel').layout.container.items.items,
                currentTabIndex,
                i;

            for( i=0; i < tabs.length; i++ ) {
                if( tabs[i].id === currentTabId ) {
                    currentTabIndex = i;
                }
            }

            // Do we need to activate some button ?
            if( tabs[currentTabIndex + 1] ) {
                if ( Ext.getCmp(tab.id + '-btn-tabRight-LANG'    ) ) { Ext.getCmp(tab.id + '-btn-tabRight-LANG'    ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-EN'      ) ) { Ext.getCmp(tab.id + '-btn-tabRight-EN'      ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-ALL'     ) ) { Ext.getCmp(tab.id + '-btn-tabRight-ALL'     ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-NotInEN' ) ) { Ext.getCmp(tab.id + '-btn-tabRight-NotInEN' ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-PATCH'   ) ) { Ext.getCmp(tab.id + '-btn-tabRight-PATCH'   ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-TRANS'   ) ) { Ext.getCmp(tab.id + '-btn-tabRight-TRANS'   ).enable(); }
                if ( Ext.getCmp(tab.id + '-btn-tabRight-NEW'     ) ) { Ext.getCmp(tab.id + '-btn-tabRight-NEW'     ).enable(); }
            }

        }
    },

    openDirectAction: function(opt)
    {
        new ui.cmp.DirectActionWin(opt);
    },

    // Need confirm if we want to close a tab and the content have been modified.
    onBeforeRemove : function(tabpanel, tab)
    {
        var stateLang, stateEn, state, PanType = tab.id.split('-');

        if ((PanType[0] === 'FE' || PanType[0] === 'FNU' || PanType[0] === 'FNR' || PanType[0] === 'PP' || PanType[0] === 'AF' || PanType[0] === 'FNT') && PanType[1] !== 'help') {

            if (PanType[0] === 'FE') {
                stateLang = Ext.getCmp('FE-LANG-FILE-' + PanType[1]).isModified;
                stateEn   = ( PhDOE.user.lang === 'en' ) ? false : Ext.getCmp('FE-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNU') {
                stateLang = Ext.getCmp('FNU-LANG-FILE-' + PanType[1]).isModified;
                stateEn   = Ext.getCmp('FNU-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNR') {
                stateLang = Ext.getCmp('FNR-LANG-FILE-' + PanType[1]).isModified;
                stateEn   = Ext.getCmp('FNR-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'PP') {
                state = Ext.getCmp('PP-PATCH-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'AF') {
                state = Ext.getCmp('AF-ALL-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNT') {
                state = (Ext.getCmp('FNT-TRANS-FILE-' + PanType[1])) ? Ext.getCmp('FNT-TRANS-FILE-' + PanType[1]).isModified : Ext.getCmp('FNT-NEW-FILE-' + PanType[1]).isModified ;
            }

            if (stateEn || stateLang || state) {
                Ext.Msg.show({
                    scope   : this,
                    title   : _('Confirm'),
                    msg     : _('This file has been modified without being saved.<br/>Do you really want to close?'),
                    buttons : Ext.Msg.YESNO,
                    icon    : Ext.Msg.QUESTION,
                    fn : function(btn, text)
                    {
                        if (btn === 'yes') {
                            tabpanel.un('beforeremove', this.onBeforeRemove, this);
                            tabpanel.remove(tab);
                            tabpanel.addListener('beforeremove', this.onBeforeRemove, this);
                        }
                    }
                });
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }

    },
    openDiffTab: function(DiffOption)
    {
        var DiffType = DiffOption.DiffType,
            currentOwner = DiffOption.currentOwner || '',
            fileIdDB = DiffOption.fileIdDB || '',
            FileName = DiffOption.FileName || '',
            FilePath = DiffOption.FilePath || '',
            patchID  = DiffOption.patchID || '',
            patchName  = DiffOption.patchName || '',
            patchURI,
            FileMD5  = Ext.util.md5(patchName+patchID+FilePath+FileName),
            tabTIP, toolTip, tBar, previewPanelHeight, previewUrl, loadDataPatch, optNbLine, optB, optW;

        optNbLine = (Ext.util.Cookies.get('optNbLine') || 3);
        optB = ( Ext.util.Cookies.get('optB') && Ext.util.Cookies.get('optB') == 'true' ) ? true : false;
        optW = ( Ext.util.Cookies.get('optW') && Ext.util.Cookies.get('optW') == 'true' ) ? true : false;

        // tabTIP
        if( patchID != '' ) {
            tabTIP = String.format(_('Diff for patch: {0}'), patchName);
            patchURI = './do/downloadPatch?patchID=' + patchID + '&csrfToken=' + csrfToken;
            toolTip = _('Download the unified diff as a patch');
        } else {
            tabTIP = String.format(_('Diff for file: {0}'), FilePath + FileName);
            patchURI = './do/downloadPatch?FilePath=' + FilePath + '&FileName=' + FileName + '&csrfToken=' + csrfToken;
            toolTip = _('Download the diff as a patch');
        }

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('diff_panel_' + FileMD5)) {

            // Prepare the tbar
            tBar = [{
                xtype : 'buttongroup',
                items: [{
                    xtype:'button',
                    iconCls: 'iconEdit',
                    tooltip: _('Edit in a new tab'),
                    handler: function()
                    {
                        ui.cmp.RepositoryTree.getInstance().openFile('byPath',
                            FilePath, FileName
                        );
                    }
                },{
                    xtype:'button',
                    iconCls: 'iconDownloadDiff',
                    tooltip: toolTip,
                    handler: function(){
                        window.location.href = patchURI;
                    }
                }]

            },

            (( PhDOE.user.isGlobalAdmin || PhDOE.user.isLangAdmin ) ?

            {
                xtype : 'buttongroup',
                items: [{
                    xtype:'button',
                    iconCls: 'iconPageDelete',
                    tooltip: _('Clear this change'),
                    handler: function()
                    {
                        // We clear local change
                        new ui.task.ClearLocalChangeTask({
                            ftype: 'update',
                            fpath: FilePath,
                            fname: FileName
                        });

                        // We close this window
                        Ext.getCmp('main-panel').remove('diff_panel_' + FileMD5);

                    }
                },{
                    xtype:'button',
                    iconCls: 'iconSwitchLang',
                    tooltip: _('Change file\'s owner'),
                    handler: function() {
                        new ui.cmp.ChangeFileOwner({
                            fileIdDB: fileIdDB,
                            fileFolder: FilePath,
                            fileName: FileName,
                            currentOwner: currentOwner
                        });
                    }
                }]

            } : '' ), '->',{
                xtype : 'buttongroup',
                items: [{
                  iconCls: 'iconTabView',
                  tooltip: _('Display the preview panel'),
                  enableToggle: true,
                  pressed: PhDOE.user.conf.diff.displayPreviewPanel,
                  toggleHandler: function(item, pressed)
                  {
                      if( pressed )
                      {
                          Ext.getCmp('diff_panel_' + FileMD5).items.items[1].expand(true);
                      } else
                      {
                          Ext.getCmp('diff_panel_' + FileMD5).items.items[1].collapse(true);
                      }

                      // Save this configuration option
                      new ui.task.UpdateConfTask({
                          module:'diff',
                          itemName  : 'displayPreviewPanel',
                          value : pressed
                      });

                  }
                }]

            },{
                xtype : 'buttongroup',
                items: [{
                  iconCls: 'iconRefresh',
                  tooltip: _('Reload data'),
                  handler: function()
                  {
                      var expire;

                      // Get opt & store into cookies

                      optNbLine = this.ownerCt.items.items[2].getValue();
                      optB = this.ownerCt.items.items[4].getValue();
                      optW = this.ownerCt.items.items[7].getValue();
                      expire = new Date().add(Date.YEAR,1);

                      Ext.util.Cookies.set('optNbLine', optNbLine, expire);
                      Ext.util.Cookies.set('optB', optB, expire);
                      Ext.util.Cookies.set('optW', optW, expire);

                      loadDataPatch();
                  }
                },{
                  xtype:'tbtext',
                  text: _('Nb lines of contexte: ')
                },{
                    xtype:'spinnerfield',
                    width : 60,
                    hideLabel: true,
                    minValue: 3,
                    value: optNbLine

                },{
                    xtype:'tbseparator'
                },{
                    xtype:'checkbox',
                    checked: optB
                },{
                  xtype:'tbtext',
                  text: ': ' + _('Ignore changes in the amount of white space'),
                  listeners: {
                      afterrender: function(c) {
                        new Ext.ToolTip({
                            anchor: 'right',
                            target: c.el,
                            html: _('Option <b>b</b> for the diff command')
                        });
                      }
                  }
                },{
                    xtype:'tbseparator'
                },{
                    xtype:'checkbox',
                    checked: optW
                },{
                  xtype:'tbtext',
                  text: ': '+_('Ignore all white space'),
                  listeners: {
                      afterrender: function(c) {
                        new Ext.ToolTip({
                            anchor: 'right',
                            target: c.el,
                            html: _('Option <b>w</b> for the diff command')
                        });
                      }
                  }
                }]
            }

            ];

            previewPanelHeight = Ext.getCmp('main-panel').getHeight() - 200;

            // Load diff data only if FilePath & FileName exist
            if( FilePath !== '' && FileName !== '' )
            {
                previewUrl = 'https://' + window.location.host + ':' +
                                 window.location.port + '/diffPreview.php';

                XHR({
                    params: {
                        task: 'getURLToOriginalManualPage',
                        fileFullPath: FilePath + FileName
                    },
                    success: function(r) {
                        var o = Ext.util.JSON.decode(r.responseText), frameSite, urlSite;

                        if( o.url === '404' ) {

                            urlSite = 'https://' + window.location.host + ':' +
                                 window.location.port + '/diffPreview.php?'+Ext.urlEncode({
                                     msg: _('Documentation page not available')
                                });

                            previewPanelHeight = 60;

                            if( Ext.getCmp('diff_panel_' + FileMD5).items.items[1] )
                            {
                                Ext.getCmp('diff_panel_' + FileMD5).items.items[1].setHeight(previewPanelHeight);
                                Ext.getCmp('diff_panel_' + FileMD5).doLayout();
                            }


                        } else {
                            urlSite = o.url;
                        }

                        // We get the iFrame witch contains the original documentation page
                        frameSite = Ext.getCmp('diff_panel_' + FileMD5).items.items[1].items.items[0];

                        // We set the URL
                        frameSite.setUrl(urlSite);
                    }
                });
            } else {
                previewUrl = 'https://' + window.location.host + ':' +
                                 window.location.port + '/diffPreview.php?'+Ext.urlEncode({
                                     msg: _('Documentation page not available')
                                });
                previewPanelHeight = 60;
            }


            // Add tab for the diff
            Ext.getCmp('main-panel').add({
                layout: 'border',
                id: 'diff_panel_' + FileMD5,
                title: _('Diff'),
                closable: true,
                iconCls: 'iconTabLink',
                tabTip: tabTIP,
                border: false,
                defaults : {
                    split: true
                },
                items:[{
                    xtype: 'panel',
                    region:'center',
                    autoScroll: true,
                    html: '<div id="diff_content_' + FileMD5 + '" class="diff-content"></div>',
                    tbar: tBar
                },{
                    xtype: 'panel',
                    collapsed: ! PhDOE.user.conf.diff.displayPreviewPanel,
                    region:'south',
                    height: previewPanelHeight,
                    layout: 'fit',
                    items: [ new Ext.ux.IFrameComponent({ id: Ext.id(), url: previewUrl }) ]
                }]
            });

            // We need to activate HERE this tab, otherwise, we can't mask it (el() is not defined)
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);


            loadDataPatch = function()
            {
                Ext.get('diff_panel_' + FileMD5).mask('<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" />' +
                _('Please, wait...'));

                // Load diff data
                XHR({
                    params: {
                        task: 'getDiff',
                        DiffType: DiffType,
                        FilePath: FilePath,
                        FileName: FileName,
                        patchID: patchID,
                        optNbLine: optNbLine,
                        optB: optB,
                        optW: optW
                    },
                    success: function(r){
                        var o = Ext.util.JSON.decode(r.responseText),
                            patchPermLink='';

                        if( patchID == '' ) {
                            patchPermLink = '<a href="https://' + window.location.host + ':' +
                                    window.location.port + window.location.pathname +
                                    '?patch='+FilePath+FileName+'&project=' + PhDOE.project + '"><h2>' +
                                    _('Direct link to this patch')+' ; ' + _('File: ') + FilePath+FileName+'</h2></a>';
                        } else {
                            patchPermLink = '<a href="https://' + window.location.host + ':' +
                                    window.location.port + window.location.pathname +
                                    '?patchID='+patchID+'&project=' + PhDOE.project + '"><h2>' +
                                    _('Direct link to this patch')+' ; ' + _('Patch Name: ') + patchName+'</h2></a>';
                        }

                        // We add the perm link into the content
                        o.content = patchPermLink + o.content;

                        // We display in diff div
                        Ext.get('diff_content_' + FileMD5).dom.innerHTML = o.content;
                        Ext.get('diff_panel_' + FileMD5).unmask();
                    }
                });

            };
            loadDataPatch();

        }
        else {
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);
        }
    }
});
Ext.reg('mainpanel', ui.cmp.MainPanel);
