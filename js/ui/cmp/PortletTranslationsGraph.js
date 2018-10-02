Ext.namespace('ui','ui.cmp','ui.cmp._PortletTranslationsGraph');

ui.cmp._PortletTranslationsGraph.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getGraphLangs'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'libel',     type : 'string'},
            {name : 'fullLibel', type : 'string'},
            {name : 'total',     type : 'int'},
            {name : 'percent',   type : 'float'}
        ]
    })
});

ui.cmp._PortletTranslationsGraph.chart = Ext.extend(Ext.chart.ColumnChart,
{
    height      : 400,
    url         : 'js/ExtJs/resources/charts.swf',
    xField      : 'libel',
    chartStyle: {
        padding: 5,
        animationEnabled: true,
        font: {
            name: 'verdana',
            color: 0x444444,
            size: 11
        },
        dataTip: {
            border: {
                color: 0x99bbe8,
                size:1
            },
            background: {
                color: 0xDAE7F6,
                alpha: .9
            },
            font: {
                name: 'verdana',
                size: 11,
                color: 0x15428B
            }
        }
    },
    tipRenderer : function(chart, record){
        return _('Lang:') + ' ' + _(record.data.fullLibel) + "\r" + _('Total:') + ' ' + record.data.total + ' ' + _('files')+ ' (' + record.data.percent + '%)';
    },

    series : [{
        type        : 'column',
        displayName : 'Total',
        yField      : 'total',
        style       : {
            image :'themes/img/bar.gif',
            mode  : 'stretch',
            color : 0x99BBE8
        }
    }],
    store : ui.cmp._PortletTranslationsGraph.store,

    initComponent : function(config)
    {
        ui.cmp._PortletTranslationsGraph.chart.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }

});

//------------------------------------------------------------------------------
// PortletTranslationGraph
ui.cmp.PortletTranslationsGraph = Ext.extend(Ext.ux.Portlet,
{
    title   : _('Graphics for all languages'),
    iconCls : 'iconGraphic',
    layout  : 'fit',
    store   : ui.cmp._PortletTranslationsGraph.store,
    tools   : [{
        id      : 'refresh',
        qtip    : _('Refresh this graph'),
        handler : function() {
            ui.cmp._PortletTranslationsGraph.store.reload();
        }
    }],
    initComponent : function(config)
    {
        this.id = 'portletTranslationsGraph';
        Ext.apply(this, config);
        ui.cmp.PortletTranslationsGraph.superclass.initComponent.apply(this);
        this.add(new ui.cmp._PortletTranslationsGraph.chart());
    }

});

// singleton
ui.cmp._PortletTranslationsGraph.instance = null;
ui.cmp.PortletTranslationsGraph.getInstance = function(config)
{
    if (!ui.cmp._PortletTranslationsGraph.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PortletTranslationsGraph.instance = new ui.cmp.PortletTranslationsGraph(config);
    }
    return ui.cmp._PortletTranslationsGraph.instance;
};
