Ext.namespace('ui','ui.component','ui.component.MainPanel');

ui.component.MainPanel = Ext.extend(Ext.ux.SlidingTabPanel, {
    activeTab         : 0,
    enableTabScroll   : true,
    plugins           : new Ext.ux.TabCloseMenu(),

    initComponent: function(config){

        Ext.apply(this, config);
        ui.component.MainPanel.superclass.initComponent.call(this);

        this.on('beforeremove', this.onBeforeRemove, this);
        this.on('tabchange',    this.onTabChange,    this);
        this.on('endDrag',    this.onTabChange,    this);

    },

    onTabChange : function(panel, tab)
    {
        // We do somethings only if this panel contiens a tab's navigation button
        if ( Ext.getCmp(tab.id + '-btn-tabRight-LANG')    ||
             Ext.getCmp(tab.id + '-btn-tabRight-EN')      ||
             Ext.getCmp(tab.id + '-btn-tabRight-ALL')     ||
             Ext.getCmp(tab.id + '-btn-tabRight-NotInEN') ||
             Ext.getCmp(tab.id + '-btn-tabRight-PATCH')   ||
             Ext.getCmp(tab.id + '-btn-tabRight-TRANS')  ) {

            var currentTabId = tab.id,
                tabs         = Ext.getCmp('main-panel').layout.container.items.items,
                nextTabId    = false,
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
            }
            if (PanType[0] === 'FNU') {
                stateLang = Ext.getCmp('FNU-LANG-FILE-' + PanType[1]).isModified;
            }
            if (PanType[0] === 'FNR') {
                stateLang = Ext.getCmp('FNR-LANG-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FE') {
                stateEn = Ext.getCmp('FE-EN-FILE-' + PanType[1]).isModified;
            }
            if (PanType[0] === 'FNU') {
                stateEn = Ext.getCmp('FNU-EN-FILE-' + PanType[1]).isModified;
            }
            if (PanType[0] === 'FNR') {
                stateEn = Ext.getCmp('FNR-EN-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'PP') {
                state = Ext.getCmp('PP-PATCH-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'AF') {
                state = Ext.getCmp('AF-ALL-FILE-' + PanType[1]).isModified;
            }

            if (PanType[0] === 'FNT') {
                state = Ext.getCmp('FNT-TRANS-FILE-' + PanType[1]).isModified;
            }

            if (stateEn || stateLang || state) {
                Ext.Msg.show({
                    scope   : this,
                    title   : _('Confirm'),
                    msg     : _('This file has been modified without being saved.<br/>' +
                                'Do you really want to close?'),
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