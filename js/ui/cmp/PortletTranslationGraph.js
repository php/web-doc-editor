Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslationGraph');

function renderLibel(v) {
 return _(v);
}

ui.cmp._PortletTranslationGraph.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getGraphLang'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'libel', convert : renderLibel},
            {name : 'total'}
        ]

    })
});

ui.cmp._PortletTranslationGraph.chart = Ext.extend(Ext.chart.PieChart,
{
    height        : 400,
    url           : 'http://extjs.cachefly.net/ext-3.2.0/resources/charts.swf',
    dataField     : 'total',
    categoryField : 'libel',
    store         : ui.cmp._PortletTranslationGraph.store,
    series        :[{
        style : {
            colors : ["#68D888", "#FF6347", "#EEE8AA"]
        }
    }],
    extraStyle :
    {
        legend :
        {
            display : 'bottom',
            padding : 5,
            font    :
            {
                family : 'Tahoma',
                size   : 13
            }
         }
    },

    initComponent : function(config)
    {
        ui.cmp._PortletTranslationGraph.chart.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }

});

//------------------------------------------------------------------------------
// PortletTranslationGraph
ui.cmp.PortletTranslationGraph = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Graphics'),
    id      : 'portletTranslationGraph',
    iconCls : 'iconGraphic',
    layout  : 'fit',
    store   : ui.cmp._PortletTranslationGraph.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this graph'),
        handler : function() {
            ui.cmp._PortletTranslationGraph.store.reload();
        }
    }],
    initComponent : function(config)
    {
        ui.cmp.PortletTranslationGraph.superclass.initComponent.call(this);
        Ext.apply(this, config);
        this.add(new ui.cmp._PortletTranslationGraph.chart());
    }

});

// singleton
ui.cmp._PortletTranslationGraph.instance = null;
ui.cmp.PortletTranslationGraph.getInstance = function(config)
{
    if (!ui.cmp._PortletTranslationGraph.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletTranslationGraph.instance = new ui.cmp.PortletTranslationGraph(config);
    }
    return ui.cmp._PortletTranslationGraph.instance;
};