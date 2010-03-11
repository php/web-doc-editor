Ext.namespace('ui','ui.component','ui.component._PortletTranslationGraph');

function renderLibel(v) {
 return _(v);
}

ui.component._PortletTranslationGraph.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getGraphLang'
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
                convert : renderLibel
            }, {
                name    : 'total',
                mapping : 'total'
            }
        ])
    )
});

ui.component._PortletTranslationGraph.chart = Ext.extend(Ext.chart.PieChart,
{

    height: 400,
    url : 'http://extjs.cachefly.net/ext-3.1.1/resources/charts.swf',
    dataField: 'total',
    categoryField: 'libel',
    store: ui.component._PortletTranslationGraph.store,
    series:[{
        style: {
            colors: ["#68D888", "#FF6347", "#EEE8AA"]
        }
    }],
    extraStyle:
    {
        legend:
        {
            display: 'bottom',
            padding: 5,
            font:
            {
                family: 'Tahoma',
                size: 13
            }
         }
    },

    initComponent : function(config)
    {
        ui.component._PortletTranslationGraph.chart.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }

});

//------------------------------------------------------------------------------
// PortletTranslationGraph
ui.component.PortletTranslationGraph = Ext.extend(Ext.ux.Portlet,
{
    title: _('Graphics'),
    iconCls : 'iconGraphic',
    layout  : 'fit',
    store   : ui.component._PortletTranslationGraph.store,
    tools   : [{
        id : 'refresh',
        qtip: _('Refresh this graph'),
        handler: function() {
            ui.component._PortletTranslationGraph.store.reload();
        }
    }],
    initComponent : function(config)
    {
        ui.component.PortletTranslationGraph.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.add(new ui.component._PortletTranslationGraph.chart());
    }

});

// singleton
ui.component._PortletTranslationGraph.instance = null;
ui.component.PortletTranslationGraph.getInstance = function(config)
{
    if (!ui.component._PortletTranslationGraph.instance) {
        if (!config) {
            config = {};
        }
        ui.component._PortletTranslationGraph.instance = new ui.component.PortletTranslationGraph(config);
    }
    return ui.component._PortletTranslationGraph.instance;
};