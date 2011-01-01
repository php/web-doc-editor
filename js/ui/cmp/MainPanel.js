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
        if( prefix == 'FNT' ) {
            if( cmp.panTRANSLoaded && cmp.panGGTRANSLoaded ) {

                cmp.tabLoaded = true;

                cmp.panTRANSLoaded = cmp.panGGTRANSLoaded = false;

                if (PhDOE.FNTfilePendingOpen[0]) {
                    ui.cmp.PendingTranslateGrid.getInstance().openFile(PhDOE.FNTfilePendingOpen[0].id);
                    PhDOE.FNTfilePendingOpen.shift();
                }

            }
        }
        // FNU panel
        if( prefix == 'FNU' ) {
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
        if( prefix == 'FE' ) {
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
        if( prefix == 'FNR' ) {
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
        if( prefix == 'FNIEN' ) {
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
        if( prefix == 'AF' ) {
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
        if( prefix == 'PP' ) {
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
            FileName = DiffOption.FileName,
            FilePath = DiffOption.FilePath,
            FileMD5  = Ext.util.md5(FilePath+FileName);
        
        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('diff_panel_' + FileMD5)) {
        
            // Add tab for the diff
            Ext.getCmp('main-panel').add({
                xtype: 'panel',
                id: 'diff_panel_' + FileMD5,
                title: _('Diff'),
                tabTip: String.format(_('Diff for file: {0}'), FilePath + FileName),
                closable: true,
                autoScroll: true,
                iconCls: 'iconTabLink',
                html: '<div id="diff_content_' + FileMD5 + '" class="diff-content"></div>'
            });
            
            // We need to activate HERE this tab, otherwise, we can't mask it (el() is not defined)
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);
            
            Ext.get('diff_panel_' + FileMD5).mask('<img src="themes/img/loading.gif" ' +
            'style="vertical-align: middle;" />' +
            _('Please, wait...'));
            
            // Load diff data
            XHR({
                params: {
                    task: 'getDiff',
                    DiffType: DiffType,
                    FilePath: FilePath,
                    FileName: FileName
                },
                success: function(r){
                    var o = Ext.util.JSON.decode(r.responseText);
                    
                    // We add the perm link into the content
                    o.content = '<a href="http://' + window.location.host + ':' + window.location.port + window.location.pathname + '?patch='+FilePath+FileName+'&project='+PhDOE.project+'"><h2>'+_('Direct link to this patch')+' ; ' + _('File: ') + FilePath+FileName+'</h2></a>' + o.content;
                    
                    // We display in diff div
                    Ext.get('diff_content_' + FileMD5).dom.innerHTML = o.content;
                    Ext.get('diff_panel_' + FileMD5).unmask();
                }
            });
        }
        else {
            Ext.getCmp('main-panel').setActiveTab('diff_panel_' + FileMD5);
        }
    }
});
Ext.reg('mainpanel', ui.cmp.MainPanel);