Ext.namespace('ui','ui.component','ui.component._PortletInfo');

//------------------------------------------------------------------------------
// PortletInfo Internals

// Store : storeInfo
ui.component._PortletInfo.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getInfos'
    }),
    baseParams : {
        start:0,
        limit:10
    },
    reader : new Ext.data.JsonReader(
        {
            root          : 'Items',
            totalProperty : 'nbItems',
            id            : 'id'
        }, Ext.data.Record.create([
            {
                name    : 'id',
                mapping : 'id'
            }, {
                name    : 'field',
                mapping : 'field'
            }, {
                name    : 'value',
                mapping : 'value'
            }, {
                name       : 'date',
                mapping    : 'date',
                type       : 'date',
                dateFormat : 'Y-m-d H:i:s'
            }
        ])
    ),
    listeners: {
        load: function(s)
        {
            var d = s.data.items[0].data.date;
            PhDOE.lastInfoDate = d.format("Y-m-d H:i:s");
        }
    }
});
ui.component._PortletInfo.store.setDefaultSort('date', 'desc');

// PortletInfo cell renderer for type column
ui.component._PortletInfo.typeRenderer = function(value, md, record)
{
    var user, lang, nbFolders, nbFilesCreate, nbFilesDelete, nbFilesUpdate, nbFiles;

    switch (value) {

        // Update datas
        case 'updateData' :
            user = record.data.value.user;

            return String.format(
                    _('{0} update app\'s data'),
                    user.ucFirst());

        break;
        case 'checkEntities' :
            user = record.data.value.user;

            return String.format(
                    _('{0} check all entitites'),
                    user.ucFirst());

        break;

        // Login / logout
        case 'logout' :
            user = record.data.value.user;

            return String.format(
                    _('{0} logged out'),
                    user.ucFirst());

        break;
        case 'login' :
            user = record.data.value.user;
            lang = record.data.value.lang;

            return String.format(
                    _('{0} is logged in using the {1} language !'),
                    user.ucFirst(),
                    lang.ucFirst());

        break;
        
        // Commit
        case 'commitFolders' :
            user      = record.data.value.user;
            lang      = record.data.value.lang;
            nbFolders = record.data.value.nbFolders;

            return String.format(
                    _('{0} committed {1} new folder(s) in {2} language'),
                    user.ucFirst(),
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
                    _('{0} committed {1} file(s) ({2} new, {3} update, {4} delete) in {5} language'),
                    user.ucFirst(),
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
ui.component._PortletInfo.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id        : 'Type',
        header    : _('Type'),
        width     : 180,
        sortable  : true,
        dataIndex : 'field',
        renderer  : ui.component._PortletInfo.typeRenderer
    }, {
        header    : _('Date'),
        width     : 110,
        sortable  : true,
        dataIndex : 'date',
        renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
    }
];

//------------------------------------------------------------------------------
// PortletInfo grid
ui.component._PortletInfo.grid = Ext.extend(Ext.grid.GridPanel,
{
    autoExpandColumn : 'Type',
    loadMask   : true,
    autoScroll : true,
    autoHeight : true,
    store      : ui.component._PortletInfo.store,
    columns    : ui.component._PortletInfo.gridColumns,
    view       : ui.component._PortletInfo.gridView,

    initComponent: function(config)
    {
        
        Ext.apply(this, {
            bbar: new Ext.PagingToolbar({
                pageSize: 10,
                store: this.store,
                displayInfo: true
            })
        });
        
        ui.component._PortletInfo.grid.superclass.initComponent.call(this);
        
        this.on('rowdblclick', this.onRowdblclick, this);
    }
});

//------------------------------------------------------------------------------
// PortletInfo
ui.component.PortletInfo = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Information'),
    id      : 'portletInfo',
    iconCls : 'iconInfo',
    layout  : 'fit',
    store   : ui.component._PortletInfo.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this grid'),
        handler: function() {
            ui.component._PortletInfo.store.reload();
        }
    }],
    listeners: {
        expand: function(p) {
            if( PhDOE.appLoaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletInfoCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse: function(p) {
            if( PhDOE.appLoaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletInfoCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender: function(cmp) {
            if( PhDOE.userConf.portletInfoCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent: function(config)
    {
        ui.component.PortletInfo.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.add(new ui.component._PortletInfo.grid());

    }
});

// singleton
ui.component._PortletInfo.instance = null;
ui.component.PortletInfo.getInstance = function(config)
{
    if (!ui.component._PortletInfo.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletInfo.instance = new ui.component.PortletInfo(config);
    }
    return ui.component._PortletInfo.instance;
};
