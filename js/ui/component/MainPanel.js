Ext.namespace('ui','ui.component','ui.component.MainPanel');

ui.component.MainPanel = Ext.extend(Ext.ux.SlidingTabPanel, {
    activeTab         : 0,
    enableTabScroll   : true,
    plugins           : ['tabclosemenu', 'dblclickclosetabs'], //new Ext.ux.TabCloseMenu(),

    initComponent: function(config)
    {
        Ext.apply(this, config);
        ui.component.MainPanel.superclass.initComponent.call(this);

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

                cmp.tabLoaded = true;

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

                cmp.tabLoaded = true;
                
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

                cmp.tabLoaded = true;
                
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

                cmp.tabLoaded = true;
                
                cmp.panLANGLoaded = false;
                if (PhDOE.FNIENfilePendingOpen[0]) {
                    ui.component.NotInENGrid.getInstance().openFile(PhDOE.FNIENfilePendingOpen[0].id);
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

                cmp.tabLoaded = true;
                
                cmp.panPatchLoaded = cmp.panOriginLoaded  = cmp.panVCS = cmp.panPatchContent = false;
                if (PhDOE.PPfilePendingOpen[0]) {
                    ui.component.PendingPatchGrid.getInstance().openFile(PhDOE.PPfilePendingOpen[0].id);
                    PhDOE.PPfilePendingOpen.shift();
                }
            }
        }

    },

    onTabChange : function(panel, tab)
    {
        // We do somethings only if this panel contiens a tab's navigation button
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
                stateEn   = ( PhDOE.userLang === 'en' ) ? false : Ext.getCmp('FE-EN-FILE-' + PanType[1]).isModified;
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

    }
});
Ext.reg('mainpanel', ui.component.MainPanel);