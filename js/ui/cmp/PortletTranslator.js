Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslator');

//------------------------------------------------------------------------------
// PortletTranslator internals

// Store : Translator with Informations like Revcheck first table
ui.cmp._PortletTranslator.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url: './do/getTranslatorInfo'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'name'},
            {name : 'email',    mapping : 'mail'},
            {name : 'nick'},
            {name : 'vcs'},
            {name : 'uptodate', type : 'int'},
            {name : 'stale',    type : 'int'},
            {name : 'sum',      type : 'int' }
        ]

    })
});
ui.cmp._PortletTranslator.store.setDefaultSort('nick', 'asc');

// PortletTranslator cell renderer for translator count
ui.cmp._PortletTranslator.translatorSumRenderer = function(v)
{
    if (v) {
        var v = (v === 0 || v > 1) ? v : 1;
        return String.format('('+_('{0} Translators')+')', v);
    } else {
        return false;
    }
};

// PortletTranslator cell renderer for up-to-date column
ui.cmp._PortletTranslator.uptodateRenderer = function(v)
{
    if (v === '0') {
        return false;
    } else {
        return '<span style="color:green; font-weight: bold;">' + v + '</span>';
    }
};

// PortletTranslator cell renderer for stale column
ui.cmp._PortletTranslator.staleRenderer = function(v)
{
    if (v === '0') {
        return false;
    } else {
        return '<span style="color:red; font-weight: bold;">' + v + '</span>';
    }
};

// PortletTranslator cell renderer for sum column
ui.cmp._PortletTranslator.sumRenderer = function(v)
{
    return (v === '0') ? '' : v;
};

// PortletTranslator columns definition
ui.cmp._PortletTranslator.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id              : 'GridTransName',
        header          : _('Name'),
        sortable        : true,
        dataIndex       : 'name',
        summaryType     : 'count',
        summaryRenderer : ui.cmp._PortletTranslator.translatorSumRenderer
    }, {
        header    : _('Email'),
        width     : 110,
        sortable  : true,
        dataIndex : 'email'
    }, {
        header    : _('Nick'),
        width     : 70,
        sortable  : true,
        dataIndex : 'nick'
    }, {
        header    : _('VCS'),
        width     : 45,
        sortable  : true,
        dataIndex : 'vcs'
    }, {
        header      : _('UptoDate'),
        width       : 60,
        sortable    : true,
        renderer    : ui.cmp._PortletTranslator.uptodateRenderer,
        dataIndex   : 'uptodate',
        summaryType : 'sum'
    }, {
        header      : _('Stale'),
        width       : 90,
        sortable    : true,
        renderer    : ui.cmp._PortletTranslator.staleRenderer,
        dataIndex   : 'stale',
        summaryType : 'sum'
    }, {
        header      : _('Sum'),
        width       : 50,
        sortable    : true,
        renderer    : ui.cmp._PortletTranslator.sumRenderer,
        dataIndex   : 'sum',
        summaryType : 'sum'
    }
];

//------------------------------------------------------------------------------
// PortletTranslator
ui.cmp._PortletTranslator.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    plugins          : [new Ext.ux.grid.GridSummary()],
    store            : ui.cmp._PortletTranslator.store,
    columns          : ui.cmp._PortletTranslator.gridColumns,
    autoExpandColumn : 'GridTransName',
    sm               : new Ext.grid.RowSelectionModel({singleSelect:true}),
    lang             : this.lang,
    EmailPrompt      : new ui.cmp.EmailPrompt(),

    onRowDblClick : function(grid, rowIndex)
    {

        this.getSelectionModel().selectRow(rowIndex);

        if( this.ctxTranslatorName ) {
            this.ctxTranslatorEmail = null;
            this.ctxTranslatorName  = null;
        }

        this.ctxTranslatorEmail = this.store.getAt(rowIndex).data.email;
        this.ctxTranslatorName  = this.store.getAt(rowIndex).data.name;
        var nick  = this.store.getAt(rowIndex).data.nick;

        // Don't open the email Prompt if the user is "nobody"
        if( nick == 'nobody' ) {
            return;
        }

        this.EmailPrompt.setData(this.ctxTranslatorName, this.ctxTranslatorEmail);
        this.EmailPrompt.show('lastUpdateTime');
    },

    onContextClick : function(grid, rowIndex, e)
    {
        if(!this.menu) {
            this.menu = new Ext.menu.Menu({
                id    : 'submenu-translators',
                items : [{
                    scope   : this,
                    text    : '',
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        this.EmailPrompt.setData(this.ctxTranslatorName, this.ctxTranslatorEmail);
                        this.EmailPrompt.show('lastUpdateTime');
                    }
                }, '-', {
                    scope   : this,
                    text    : String.format(_('Send an email to the {0}'), String.format(PhDOE.app.conf.projectMailList, this.lang)),
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        this.EmailPrompt.setData('Php Doc Team ' + this.lang, String.format(PhDOE.app.conf.projectMailList, this.lang));
                        this.EmailPrompt.show('lastUpdateTime');
                    }
                }]
            });
        }

        this.getSelectionModel().selectRow(rowIndex);
        e.stopEvent();

        if( this.ctxTranslatorName ) {
            this.ctxTranslatorName  = null;
            this.ctxTranslatorEmail = null;
        }
        this.ctxTranslatorName  = this.store.getAt(rowIndex).data.name;
        this.ctxTranslatorEmail = this.store.getAt(rowIndex).data.email;

        var nick  = this.store.getAt(rowIndex).data.nick;

        // Don't open the contextMenu if the user is "nobody"
        if( nick === 'nobody' ) {
            return;
        }

        // Set the title for items[0]
        this.menu.items.items[0].setText('<b>' + String.format(_('Send an email to {0}'), this.ctxTranslatorName) + '</b>');

        this.menu.showAt(e.getXY());

    },

    initComponent: function(config)
    {
        ui.cmp._PortletTranslator.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.on('rowcontextmenu', this.onContextClick, this);
        this.on('rowdblclick',    this.onRowDblClick,  this);
    }
});

//------------------------------------------------------------------------------
// PortletTranslator
ui.cmp.PortletTranslator = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Translators'),
    iconCls : 'iconTranslator',
    layout  : 'fit',
    store   : ui.cmp._PortletTranslator.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this grid'),
        handler : function() {
            ui.cmp._PortletTranslator.store.reload();
        }
    }],
    listeners : {
        expand : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletTranslatorCollapsed',
                    value : false,
                    notify: false
                });
            }
        },
        collapse : function() {
            if( PhDOE.app.loaded ) {
                new ui.task.UpdateConfTask({
                    item  : 'portletTranslatorCollapsed',
                    value : true,
                    notify: false
                });
            }
        },
        afterrender : function(cmp) {
            if( PhDOE.user.conf.portletTranslatorCollapsed ) {
                cmp.collapse();
            } else {
                cmp.expand();
            }
        }
    },

    initComponent : function(config)
    {
        this.id = 'portletTranslator';
        
        Ext.apply(this, config);
        ui.cmp.PortletTranslator.superclass.initComponent.apply(this);

        this.add(new ui.cmp._PortletTranslator.grid({lang: this.lang}));

    }
});

// singleton
ui.cmp._PortletTranslator.instance = null;
ui.cmp.PortletTranslator.getInstance = function(config)
{
    if (!ui.cmp._PortletTranslator.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletTranslator.instance = new ui.cmp.PortletTranslator(config);
    }
    return ui.cmp._PortletTranslator.instance;
};