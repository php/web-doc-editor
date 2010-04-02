Ext.namespace('ui','ui.component','ui.component._PortletTranslationsGraph');

ui.component._PortletTranslationsGraph.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getGraphLangs'
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
                name    : 'libel',
                mapping : 'libel',
                type    : 'string'
            }, {
                name    : 'fullLibel',
                mapping : 'fullLibel',
                type    : 'string'
            }, {
                name    : 'total',
                mapping : 'total',
                type    : 'int'
            }, {
                name    : 'percent',
                mapping : 'percent',
                type    : 'float'
            }
        ])
    )
});

ui.component._PortletTranslationsGraph.chart = Ext.extend(Ext.chart.ColumnChart,
{
    height : 400,
    url    : 'http://extjs.cachefly.net/ext-3.2.0/resources/charts.swf',
    xField : 'libel',
    tipRenderer : function(chart, record, index, series){
        return _('Lang:') + ' ' + record.data.fullLibel + "\r" + _('Total:') + ' ' + record.data.total + ' ' + _('files')+ ' (' + record.data.percent + '%)';
    },

    series : [{
        type        : 'column',
        displayName : 'Total',
        yField      : 'total',
        style : {
            image :'themes/img/bar.gif',
            mode  : 'stretch',
            color : 0x99BBE8
        }
    }],
    store : ui.component._PortletTranslationsGraph.store,

    initComponent : function(config)
    {
        ui.component._PortletTranslationsGraph.chart.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }

});

//------------------------------------------------------------------------------
// PortletTranslationGraph
ui.component.PortletTranslationsGraph = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Graphics for all language'),
    id      : 'portletTranslationsGraph',
    iconCls : 'iconGraphic',
    layout  : 'fit',
    store   : ui.component._PortletTranslationsGraph.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this graph'),
        handler: function() {
            ui.component._PortletTranslationsGraph.store.reload();
        }
    }],
    initComponent : function(config)
    {
        ui.component.PortletTranslationsGraph.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.add(new ui.component._PortletTranslationsGraph.chart());
    }

});

// singleton
ui.component._PortletTranslationsGraph.instance = null;
ui.component.PortletTranslationsGraph.getInstance = function(config)
{
    if (!ui.component._PortletTranslationsGraph.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletTranslationsGraph.instance = new ui.component.PortletTranslationsGraph(config);
    }
    return ui.component._PortletTranslationsGraph.instance;
};