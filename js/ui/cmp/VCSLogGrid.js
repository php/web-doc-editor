Ext.namespace('ui','ui.cmp','ui.cmp._VCSLogGrid');

//------------------------------------------------------------------------------
// VCSLogGrid internals

// VCSLogGrid log information store
ui.cmp._VCSLogGrid.store = Ext.extend(Ext.data.Store,
{
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'revision'},
            {name : 'date', type : 'date',dateFormat : 'Y/m/d H:i:s' },
            {name : 'author'},
            {name : 'content'}
        ]
    })
});

// VCSLogGrid selection model
// config - {fid}
ui.cmp._VCSLogGrid.sm = Ext.extend(Ext.grid.CheckboxSelectionModel,
{
    singleSelect : false,
    header       : '',
    width        : 22,

    listeners : {
        beforerowselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                return false;
            }
            return true;
        },
        rowselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).enable();
                Ext.get(sm.prefix + '-PANEL-btn-log-' + sm.fid).frame("3F8538");
            } else {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).disable();
            }
        },
        rowdeselect : function(sm)
        {
            var nbRowsSelected = sm.getCount();
            if (nbRowsSelected === 2) {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).enable();
                Ext.get(sm.prefix + '-PANEL-btn-log-' + sm.fid).frame("3F8538");
            } else {
                Ext.getCmp(sm.prefix + '-PANEL-btn-log-' + sm.fid).disable();
            }
        }
    }
});

// VCSLogGrid columns definition
ui.cmp._VCSLogGrid.columns = [
    {
        id        : 'id',
        header    : _('Rev.'),
        width     : 40,
        sortable  : false,
        dataIndex : 'revision'
    }, {
        header    : _('Content'),
        width     : 130,
        sortable  : true,
        dataIndex : 'content'
    }, {
        header    : _('By'),
        width     : 50,
        sortable  : true,
        dataIndex : 'author'
    }, {
        header    : _('Date'),
        width     : 85,
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// VCSLogGrid
// config - {prefix, fid, fpath, fname, loadStore}
ui.cmp.VCSLogGrid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    bodyBorder       : false,
    border           : false,
    autoExpandColumn : 'content',

    initComponent : function()
    {
        var sm = new ui.cmp._VCSLogGrid.sm({
            fid    : this.fid,
            prefix : this.prefix
        }),
        store = new ui.cmp._VCSLogGrid.store({
            autoLoad : this.loadStore,
            proxy : new Ext.data.HttpProxy({
                url : './do/getLog'
            }),
            baseParams : {
                Path : this.fpath,
                File : this.fname
            },
            listeners: {
                scope: this,
                load: function(store, records) {

                    // FNU Panel
                    if( this.prefix === 'FNU-EN' ) {
                        Ext.getCmp('FNU-' + this.fid).panVCSEn = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNU', this.fid);
                    }
                    if( this.prefix === 'FNU-LANG' ) {
                        Ext.getCmp('FNU-' + this.fid).panVCSLang = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNU', this.fid);
                    }

                    // FE panel
                    if( this.prefix === 'FE-EN' ) {
                        Ext.getCmp('FE-' + this.fid).panVCSEn = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FE', this.fid);
                    }
                    if( this.prefix === 'FE-LANG' ) {
                        Ext.getCmp('FE-' + this.fid).panVCSLang = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FE', this.fid);
                    }

                    // FE panel
                    if( this.prefix === 'FNR-EN' ) {
                        Ext.getCmp('FNR-' + this.fid).panVCSEn = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNR', this.fid);
                    }
                    if( this.prefix === 'FNR-LANG' ) {
                        Ext.getCmp('FNR-' + this.fid).panVCSLang = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'FNR', this.fid);
                    }

                    // AF panel
                    if( this.prefix === 'AF' ) {
                        Ext.getCmp('AF-' + this.fid).panVCS = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'AF', this.fid);
                    }

                    // PP panel
                    if( this.prefix === 'PP' ) {
                        Ext.getCmp('PP-' + this.fid).panVCS = true;
                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'PP', this.fid);
                    }
                }
            }
        }),
        columns = [], i;

        columns.push(sm);
        for (i = 0; i < ui.cmp._VCSLogGrid.columns.length; ++i) {
            columns.push(ui.cmp._VCSLogGrid.columns[i]);
        }

        store.setDefaultSort('date', 'desc');

        Ext.apply(this,
        {
            sm      : sm,
            store   : store,
            columns : columns,
            view    : new Ext.grid.GridView({
                forceFit      : true,
                emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '<br><br>'+_('(You can change this behavior by setting an option in the configuration window)') + '</div>',
                deferEmptyText: false
            }),
            tbar : [{
                scope   : this,
                id      : this.prefix + '-PANEL-btn-refreshlog-' + this.fid,
                tooltip : _('<b>Load/Refresh</b> revisions'),
                iconCls : 'iconRefresh',
                handler : function()
                {
                    this.store.reload();
                }
            }, {
                scope    : this,
                id       : this.prefix + '-PANEL-btn-log-' + this.fid,
                tooltip  : _('<b>View</b> the diff'),
                iconCls  : 'iconViewDiff',
                disabled : true,
                handler  : function()
                {
                    var s    = this.getSelectionModel().getSelections(),
                        rev1 = s[0].data.revision,
                        rev2 = s[1].data.revision;

                    Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Finding the diff. Please, wait...'));

                    // Load diff data
                    XHR({
                        params : {
                            task     : 'getDiff',
                            DiffType : 'vcs',
                            FilePath : this.fpath,
                            FileName : this.fname,
                            Rev1     : rev1,
                            Rev2     : rev2
                        },
                        success : function(r)
                        {
                            var o = Ext.util.JSON.decode(r.responseText), winStatus;

                            Ext.getBody().unmask();

                            // We display in diff window
                            winStatus = new Ext.Window({
                                title      : String.format(_('Diff between {0} & {1}'), rev1, rev2),
                                width      : 650,
                                height     : 350,
                                resizable  : false,
                                modal      : true,
                                autoScroll : true,
                                bodyStyle  : 'background-color: white; padding: 5px;',
                                html       : '<div class="diff-content">' + o.content + '</div>',
                                buttons    : [{
                                    text    : _('Close'),
                                    handler : function()
                                    {
                                        winStatus.close();
                                    }
                                }]
                            });
                            winStatus.show();
                        }
                    });
                }
            }]
        });
        ui.cmp.VCSLogGrid.superclass.initComponent.call(this);
    }
});
