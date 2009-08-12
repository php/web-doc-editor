Ext.namespace('ui','ui.component','ui.component._TranslatorGrid');

//------------------------------------------------------------------------------
// TranslatorGrid internals

// Store : Translator with Informations like Revcheck first table
ui.component._TranslatorGrid.store = new Ext.data.Store({
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
                name    : 'old',
                mapping : 'old',
                type    : 'int'
            }, {
                name    : 'critical',
                mapping : 'critical',
                type    : 'int'
            }, {
                name    : 'sum',
                mapping : 'sum',
                type    : 'int'
            }
        ])
    )
});
ui.component._TranslatorGrid.store.setDefaultSort('nick', 'asc');

// TranslatorGrid cell renderer for translator count
ui.component._TranslatorGrid.translatorSumRenderer = function(value)
{
    if (value) {
        var v = (value === 0 || value > 1) ? value : 1;
        return '(' + v + ' Translators)';
    } else {
        return;
    }
}

// TranslatorGrid cell renderer for up-to-date column
ui.component._TranslatorGrid.uptodateRenderer = function(value)
{
    if (value === '0') {
        return;
    } else {
        return '<span style="color:green; font-weight: bold;">' + value + '</span>';
    }
}

// TranslatorGrid cell renderer for old/sum column
ui.component._TranslatorGrid.old_sumRenderer = function(value)
{
    return (value === '0') ? '' : value;
}

// TranslatorGrid cell renderer for critical column
ui.component._TranslatorGrid.criticalRenderer = function(value)
{
    if (value === '0') {
        return;
    } else {
        return '<span style="color:red; font-weight: bold;">' + value + '</span>';
    }
}

// TranslatorGrid columns definition
ui.component._TranslatorGrid.columns = [
    new Ext.grid.RowNumberer(), {
        id              : 'GridTransName',
        header          : _('Name'),
        sortable        : true,
        dataIndex       : 'name',
        summaryType     : 'count',
        summaryRenderer : ui.component._TranslatorGrid.translatorSumRenderer
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
        header    : _('Cvs'),
        width     : 45,
        sortable  : true,
        dataIndex : 'cvs'
    }, {
        header      : _('UptoDate'),
        width       : 60,
        sortable    : true,
        renderer    : ui.component._TranslatorGrid.uptodateRenderer,
        dataIndex   : 'uptodate',
        summaryType : 'sum'
    }, {
        header      : _('Old'),
        width       : 45,
        sortable    : true,
        renderer    : ui.component._TranslatorGrid.old_sumRenderer,
        dataIndex   : 'old',
        summaryType : 'sum'
    }, {
        header      : _('Critical'),
        width       : 60,
        sortable    : true,
        renderer    : ui.component._TranslatorGrid.criticalRenderer,
        dataIndex   : 'critical',
        summaryType : 'sum'
    }, {
        header      : _('Sum'),
        width       : 50,
        sortable    : true,
        renderer    : ui.component._TranslatorGrid.old_sumRenderer,
        dataIndex   : 'sum',
        summaryType : 'sum'
    }
];

//------------------------------------------------------------------------------
// TranslatorGrid
ui.component.TranslatorGrid = Ext.extend(Ext.grid.GridPanel,
{
    title            : _('Translators'),
    iconCls          : 'iconTranslator',
    loadMask         : true,
    autoScroll       : true,
    height           : 400,
    width            : 800,
    plugins          : [new Ext.ux.grid.GridSummary()],
    store            : ui.component._TranslatorGrid.store,
    columns          : ui.component._TranslatorGrid.columns,
    autoExpandColumn : 'GridTransName',

    listeners : {
        render : function(grid)
        {
            grid.store.load.defer(20, grid.store);
        },
        rowdblclick : function(grid, rowIndex, e)
        {
            var TranslatorEmail = grid.store.getAt(rowIndex).data.email,
                TranslatorName  = grid.store.getAt(rowIndex).data.name;

            grid.getSelectionModel().selectRow(rowIndex);

            new ui.component.EmailPrompt({
                name  : TranslatorName,
                email : TranslatorEmail
            }).show();
        },
        rowcontextmenu: function(grid, rowIndex, e)
        {
            var TranslatorEmail = grid.store.getAt(rowIndex).data.email,
                TranslatorName  = grid.store.getAt(rowIndex).data.name;

            grid.getSelectionModel().selectRow(rowIndex);

            new Ext.menu.Menu({
                id    : 'submenu',
                items : [{
                    text    : '<b>' + String.format(_('Send an email to {0}'), TranslatorName) + '</b>',
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        new ui.component.EmailPrompt({
                            name  : TranslatorName,
                            email : TranslatorEmail
                        }).show();
                    }
                }, '-', {
                    text    : String.format(_('Send an email to the {0}'), 'doc-' + phpDoc.userLang + '@lists.php.net'),
                    iconCls : 'iconSendEmail',
                    handler : function()
                    {
                        new ui.component.EmailPrompt({
                            name  : 'Php Doc Team ' + phpDoc.userLang,
                            email : 'doc-' + phpDoc.userLang + '@lists.php.net'
                        }).show();
                    }
                }]
            }).showAt(e.getXY());
        }
    }
});

// singleton
ui.component._TranslatorGrid.instance = null;
ui.component.TranslatorGrid.getInstance = function(config)
{
    if (!ui.component._TranslatorGrid.instance) {
        if (!config) config = {};
        ui.component._TranslatorGrid.instance = new ui.component.TranslatorGrid(config);
    }
    return ui.component._TranslatorGrid.instance;
}
