Ext.namespace('ui','ui.component','ui.component._TranslationGraph');

ui.component.TranslationGraph = Ext.extend(Ext.Panel,
{
    title      : _('Graphics'),
    layout     : 'fit',
    iconCls    : 'home-graphic-title',
    autoHeight : true,
    html       : '<div align="center" id="graph_container" style="width: 530px; height: 302px">' +
                    '<img id="graph_picture" src="" height="300">' +
                 '</div>',
    listeners : {
        afterlayout : function()
        {
            var img      = Ext.get('graph_picture'),
                imgdiv   = Ext.get('graph_container'),
                loadMask = new Ext.LoadMask(imgdiv);

            img.setVisibilityMode(Ext.Element.VISIBILITY);
            img.on('load', function()
            {
                img.stopFx();
                loadMask.hide();
                img.fadeIn({ duration : 2 });
            });

            loadMask.show();
            img.hide();
            img.dom.src = "./do/translationGraph";
        }
    }
});

// singleton
ui.component._TranslationGraph.instance = null;
ui.component.TranslationGraph.getInstance = function(config)
{
    if (!ui.component._TranslationGraph.instance) {
        if (!config) config = {};
        ui.component._TranslationGraph.instance = new ui.component.TranslationGraph(config);
    }
    return ui.component._TranslationGraph.instance;
}
