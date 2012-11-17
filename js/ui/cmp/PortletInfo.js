Ext.namespace('ui','ui.cmp','ui.cmp._PortletInfo');

//------------------------------------------------------------------------------
// PortletInfo Internals

// Store : storeInfo
ui.cmp._PortletInfo.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getInfos'
    }),
    baseParams : {
        start : 0,
        limit : 10
    },
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'field'},
            {name : 'value'},
            {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s' },
            {name : 'elapsedTime'}
        ]
    }),
    listeners : {
        load : function(s)
        {
            var d = s.data.items[0].data.date;
            PhDOE.lastInfoDate = d.format("Y-m-d H:i:s");
        }
    }
});
ui.cmp._PortletInfo.store.setDefaultSort('date', 'desc');

// PortletInfo cell renderer for type column
ui.cmp._PortletInfo.typeRenderer = function(value, md, record)
{
    var user, lang, nbFolders, nbFilesCreate, nbFilesDelete, nbFilesUpdate, nbFiles, img;

    switch (value) {

        // Update datas
        case 'updateData' :
            user = record.data.value.user;

            return String.format(
                    _('{0} updated app\'s data'),
                    user);

        break;
        case 'changeFilesOwner' :
            user = record.data.value.user;

            return String.format(
                    _('{0} changed file\'s owner'),
                    user);

        break;
        case 'checkEntities' :
            user = record.data.value.user;

            return String.format(
                    _('{0} check all entitites'),
                    user);

        break;
        
        case 'computeUsageStatistics' :
            return _('Usage statistics were calculated');
        break;

        // Login / logout
        case 'logout' :
            user = record.data.value.user;

            return String.format(
                    _('{0} logged out'),
                    user);

        break;
        case 'login' :
            user = record.data.value.user;
            lang = record.data.value.lang;
            authService = record.data.value.authService;
            img = '';
            
            if( authService == 'google' ) {
                img = '<img src="themes/img/google.png" style="vertical-align: middle;"> ';
            } else if( authService == 'facebook' ) {
                img = '<img src="themes/img/icon_facebook.png" style="vertical-align: middle;"> ';
            }
            
            return img + String.format(
                    _('{0} is logged in using the {1} language'),
                    user,
                    lang.ucFirst());

        break;
        
        // Commit
        case 'commitFolders' :
            user      = record.data.value.user;
            lang      = record.data.value.lang;
            nbFolders = record.data.value.nbFolders;

            return String.format(
                    _('{0} committed {1} new folder(s) in the {2} language'),
                    user,
                    nbFolders,
                    lang.ucFirst());

        break;
        case 'commitFiles' :
            user          = record.data.value.user;
            lang          = record.data.value.lang;
            nbFilesCreate = record.data.value.nbFilesCreate;
            nbFilesDelete = record.data.value.nbFilesDelete;
            nbFilesUpdate = record.data.value.nbFilesUpdate;
            nbFiles       = nbFilesCreate + nbFilesDelete + nbFilesUpdate;

            return String.format(
                    _('{0} committed {1} file(s) ({2} new, {3} update, {4} delete) in the language {5}'),
                    user,
                    nbFiles,
                    nbFilesCreate,
                    nbFilesUpdate,
                    nbFilesDelete,
                    lang.ucFirst()
                   );

        break;

    }
};

// PortletInfo grid's columns definition
ui.cmp._PortletInfo.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id        : 'Type',
        header    : _('Type'),
        width     : 180,
        sortable  : true,
        dataIndex : 'field',
        renderer  : ui.cmp._PortletInfo.typeRenderer
    }, {
        header    : _('Since'),
        width     : 110,
        sortable  : false,
        dataIndex : 'elapsedTime',
        renderer  : function(v, m, r) {
            
            if( !v ) {
                v = _('Less than one second');
            } else {
                v = String.format(_('{0} ' + v.units), v.value);
            }
            return "<span ext:qtip='" + r.data.date.format(_('Y-m-d, H:i')) + "'>" + v + "</span>";
            
        }
    },{
        header    : _('Date'),
        width     : 110,
        sortable  : true,
        dataIndex : 'date',
        hidden    : true,
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// PortletInfo grid
ui.cmp._PortletInfo.grid = Ext.extend(Ext.grid.GridPanel,
{
    autoExpandColumn : 'Type',
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    store            : ui.cmp._PortletInfo.store,
    columns          : ui.cmp._PortletInfo.gridColumns,
    view             : ui.cmp._PortletInfo.gridView,

    initComponent : function()
    {
        
        Ext.apply(this, {
            bbar: new Ext.PagingToolbar({
                pageSize: 10,
                store: this.store,
                displayInfo: true
            })
        });
        
        ui.cmp._PortletInfo.grid.superclass.initComponent.call(this);
        
        this.on('rowdblclick', this.onRowdblclick, this);
    }
});

//------------------------------------------------------------------------------
// PortletInfo
ui.cmp.PortletInfo = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Information'),
    iconCls : 'iconInfo',
    layout  : 'fit',
    store   : ui.cmp._PortletInfo.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletInfo.store.reload();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletInfoCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletInfoCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletInfoCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        this.id = 'portletInfo';
        Ext.apply(this, config);
        ui.cmp.PortletInfo.superclass.initComponent.apply(this);

        this.add(new ui.cmp._PortletInfo.grid());

    }
});

// singleton
ui.cmp._PortletInfo.instance = null;
ui.cmp.PortletInfo.getInstance = function(config)
{
    if (!ui.cmp._PortletInfo.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletInfo.instance = new ui.cmp.PortletInfo(config);
    }
    return ui.cmp._PortletInfo.instance;
};
