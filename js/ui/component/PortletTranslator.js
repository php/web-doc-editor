Ext.namespace('ui','ui.component','ui.component._PortletTranslator');

//------------------------------------------------------------------------------
// PortletTranslator internals

// Store : Translator with Informations like Revcheck first table
ui.component._PortletTranslator.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url: './do/getTranslatorInfo'
    }),
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
                name    : 'name',
                mapping : 'name'
            }, {
                name    : 'email',
                mapping : 'mail'
            }, {
                name    : 'nick',
                mapping : 'nick'
            }, {
                name    : 'vcs',
                mapping : 'vcs'
            }, {
                name    : 'uptodate',
                mapping : 'uptodate',
                type    : 'int'
            }, {
                name    : 'stale',
                mapping : 'stale',
                type    : 'int'
            }, {
                name    : 'sum',
                mapping : 'sum',
                type    : 'int'
            }
        ])
    )
});
ui.component._PortletTranslator.store.setDefaultSort('nick', 'asc');

// PortletTranslator cell renderer for translator count
ui.component._PortletTranslator.translatorSumRenderer = function(value)
{
    if (value) {
        var v = (value === 0 || value > 1) ? value : 1;
        return String.format('('+_('{0} Translators')+')', v);
    } else {
        return;
    }
};

// PortletTranslator cell renderer for up-to-date column
ui.component._PortletTranslator.uptodateRenderer = function(value)
{
    if (value === '0') {
        return;
    } else {
        return '<span style="color:green; font-weight: bold;">' + value + '</span>';
    }
};

// PortletTranslator cell renderer for stale column
ui.component._PortletTranslator.staleRenderer = function(value)
{
    if (value === '0') {
        return;
    } else {
        return '<span style="color:red; font-weight: bold;">' + value + '</span>';
    }
};

// PortletTranslator cell renderer for sum column
ui.component._PortletTranslator.sumRenderer = function(value)
{
    return (value === '0') ? '' : value;
};

// PortletTranslator columns definition
ui.component._PortletTranslator.gridColumns = [
    new Ext.grid.RowNumberer(), {
        id              : 'GridTransName',
        header          : _('Name'),
        sortable        : true,
        dataIndex       : 'name',
        summaryType     : 'count',
        summaryRenderer : ui.component._PortletTranslator.translatorSumRenderer
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
        renderer    : ui.component._PortletTranslator.uptodateRenderer,
        dataIndex   : 'uptodate',
        summaryType : 'sum'
    }, {
        header      : _('Stale'),
        width       : 90,
        sortable    : true,
        renderer    : ui.component._PortletTranslator.staleRenderer,
        dataIndex   : 'stale',
        summaryType : 'sum'
    }, {
        header      : _('Sum'),
        width       : 50,
        sortable    : true,
        renderer    : ui.component._PortletTranslator.sumRenderer,
        dataIndex   : 'sum',
        summaryType : 'sum'
    }
];

//------------------------------------------------------------------------------
// PortletTranslator
ui.component._PortletTranslator.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoScroll       : true,
    autoHeight       : true,
    plugins          : [new Ext.ux.grid.GridSummary()],
    store            : ui.component._PortletTranslator.store,
    columns          : ui.component._PortletTranslator.gridColumns,
    autoExpandColumn : 'GridTransName',
    sm               : new Ext.grid.RowSelectionModel({singleSelect:true}),
    lang             : this.lang,
    listeners : {
        rowdblclick : function(grid, rowIndex, e)
        {
            var TranslatorEmail = grid.store.getAt(rowIndex).data.email,
                TranslatorName  = grid.store.getAt(rowIndex).data.name;

            grid.getSelectionModel().selectRow(rowIndex);

            var tmp = new ui.component.EmailPrompt({
                name  : TranslatorName,
                email : TranslatorEmail
            }).show();
        },
        rowcontextmenu: function(grid, rowIndex, e)
        {

            e.stopEvent();
        
            var TranslatorEmail = grid.store.getAt(rowIndex).data.email,
                TranslatorName  = grid.store.getAt(rowIndex).data.name,
                tmp='';

            grid.getSelectionModel().selectRow(rowIndex);

            tmp = new Ext.menu.Menu({
                id    : 'submenu',
                items : [{
                    text    : '<b>' + String.format(_('Send an email to {0}'), TranslatorName) + '</b>',
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        var tmp = new ui.component.EmailPrompt({
                            name  : TranslatorName,
                            email : TranslatorEmail
                        }).show();
                    }
                }, '-', {
                    text    : String.format(_('Send an email to the {0}'), 'doc-' + this.lang + '@lists.php.net'),
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        var tmp = new ui.component.EmailPrompt({
                            name  : 'Php Doc Team ' + this.lang,
                            email : 'doc-' + this.lang + '@lists.php.net'
                        }).show();
                    }
                }]
            });
            tmp.showAt(e.getXY());

        }
    },
    initComponent: function(config)
    {
        ui.component._PortletTranslator.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }
});

//------------------------------------------------------------------------------
// PortletTranslator
ui.component.PortletTranslator = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Translators'),
    iconCls : 'iconTranslator',
    layout  : 'fit',
    store   : ui.component._PortletTranslator.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this grid'),
        handler: function() {
            ui.component._PortletTranslator.store.reload();
        }
    }],
    initComponent: function(config) {

        ui.component.PortletTranslator.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.add(new ui.component._PortletTranslator.grid({lang: this.lang}));

    }
});

// singleton
ui.component._PortletTranslator.instance = null;
ui.component.PortletTranslator.getInstance = function(config)
{
    if (!ui.component._PortletTranslator.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletTranslator.instance = new ui.component.PortletTranslator(config);
    }
    return ui.component._PortletTranslator.instance;
};
