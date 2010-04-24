Ext.namespace('ui','ui.component','ui.component._BuildStatus');

//------------------------------------------------------------------------------
// BuildStatus Internals
ui.component._BuildStatus.display = function(config)
{

    Ext.apply(this, config);

    // Display
    if ( Ext.getCmp('main-panel').findById('last_failed_build_' + this.lang) ) {
        Ext.getCmp('main-panel').remove('last_failed_build_' + this.lang);
    }

    Ext.getCmp('main-panel').add({
        xtype      : 'panel',
        id         : 'last_failed_build_' + this.lang,
        title      : String.format(_('Last failed build for {0}'),Ext.util.Format.uppercase(this.lang)),
        tabTip     : String.format(_('Last failed build for the documentation {0}'), Ext.util.Format.uppercase(this.lang)),
        closable   : true,
        autoScroll : true,
        iconCls    : 'iconCheckBuild',
        html       : '<div class="check-build-content" id="check-build-content"></div>'
    });
    Ext.getCmp('main-panel').setActiveTab('last_failed_build_' + this.lang);

    Ext.getCmp('main-panel').el.mask(_('Please, wait...'));

    XHR({
        scope   : this,
        params  : {
            task          : 'getFailedBuildData',
            idFailedBuild : this.idFailedBuild
        },
        success : function(r)
        {
            var o    = Ext.decode(r.responseText),
                mess = o.mess.join("<br/>");

            // If the result is too large, the controller have limitated it. So, we add a button to allow the download of the full content
            if( o.state === 'truncate' ) {

                Ext.get('check-build-content').dom.innerHTML = mess + '<div style="text-align: center; margin: 20px 0 20px 0" class="x-toolbar">' + _('This log is too large and have been truncated. Use the following button to download the full content of it.') + '<div id="check-build-content-download-btn"></div></div>';

                new Ext.Button({
                    scope: this,
                    text: _('Download the full content of this log'),
                    renderTo: 'check-build-content-download-btn',
                    style: {margin: 'auto'},
                    handler : function()
                    {
                        window.location.href = './do/downloadFailedBuildLog' +
                                               '?idFailedBuild=' + this.idFailedBuild;
                    }

                });

            } else {
                Ext.get('check-build-content').dom.innerHTML = mess;
            }

            Ext.getCmp('main-panel').el.unmask();

        }
    });
};

// BuildStatus Grid datastore
ui.component._BuildStatus.ds = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getFailedBuild'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'lang'},
            {name : 'date', type : 'date',dateFormat : 'Y-m-d H:i:s' }
        ]
    })
});
ui.component._BuildStatus.ds.setDefaultSort('date', 'desc');

// BuildStatus Grid language cell renderer
ui.component._BuildStatus.rendererLanguage = function(value)
{
    return '<div><div class="flags flag-' + value + '" style="float: left;"></div><div style="padding-left: 24px">' + value + '</div></div>';
};

// BuildStatus Grid columns definition
ui.component._BuildStatus.columns = [
    {
        id        : 'date',
        header    : _("Date"),
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }, {
        header    : _('Language'),
        width     : 45,
        sortable  : true,
        dataIndex : 'lang',
        renderer  : ui.component._BuildStatus.rendererLanguage
    }
];

// BuildStatus context menu
ui.component._BuildStatus.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIndex : function(rowIndex) {
        this.rowIndex = rowIndex;
    },

    initComponent : function()
    {
        Ext.apply(this, {
            items : [{
                scope   : this,
                text    : '<b>' + _('View in a new Tab') + '</b>',
                iconCls : 'iconOpenInTab',
                handler : function()
                {
                    this.grid.fireEvent('rowdblclick',
                        this.grid, this.rowIndex, this.event
                    );
                }
            }]
        });
        ui.component._BuildStatus.menu.superclass.initComponent.call(this);
    }
});

//------------------------------------------------------------------------------
// BuildStatus Grid
ui.component.BuildStatus = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    bodyBorder       : false,
    autoExpandColumn : 'date',
    store            : ui.component._BuildStatus.ds,
    columns          : ui.component._BuildStatus.columns,

    view             : new Ext.grid.GridView({
                           forceFit: true
    }),
    listeners : {
        render : function()
        {
            this.store.load.defer(20, this.store);
        }
    },

    onRowdblclick: function(grid, rowIndex, e)
    {
        var storeRecord = this.store.getAt(rowIndex);

        new ui.component._BuildStatus.display({
            idFailedBuild : storeRecord.id,
            lang          : storeRecord.data.lang
        });
    },

    onRowContextMenu: function(grid, rowIndex, e)
    {
            if( ! this.menu ) {
                this.menu = new ui.component._BuildStatus.menu({
                    grid   : grid,
                    rowIdx : '',
                    event  : e
                });
            }

            e.stopEvent();
            this.getSelectionModel().selectRow(rowIndex);
            this.menu.setRowIndex(rowIndex);
            this.menu.showAt(e.getXY());
    },

    initComponent: function(config)
    {
        ui.component.BuildStatus.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowdblclick',    this.onRowdblclick,  this);
        this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});
