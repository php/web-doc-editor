Ext.namespace('ui','ui.component','ui.component._GoogleTranslationPanel');

//------------------------------------------------------------------------------
// GoogleTranslationPanel internals



//------------------------------------------------------------------------------
// GoogleTranslationPanel
ui.component.GoogleTranslationPanel = Ext.extend(Ext.FormPanel,
{
    border : false,
    labelAlign: 'top',
    bodyStyle:'padding:5px',
    autoScroll : true,
    getTranslation: function(str) {

        var tmp = new ui.task.GetGGTranslation({
            str : str
        });

    },
    initComponent : function()
    {
        Ext.apply(this, {
            items:[
                {
                    xtype: 'textarea',
                    anchor: '90%',
                    fieldLabel: String.format(_('String to translate (en => {0})'), PhDOE.userLang),
                    name: 'GGTranslate-string',
                    id: 'GGTranslate-string',
                    allowBlank:false
                },{
                    scope: this,
                    xtype: 'button',
                    text: _('Translate !'),
                    id: 'GGTranslate-btn',
                    handler: function() {
                        this.getTranslation(Ext.getCmp('GGTranslate-string').getValue());
                    }
                },{
                    xtype: 'panel',
                    anchor: '100%',
                    border : false,
                    bodyStyle:'padding:5px',
                    html: '<div id="GGTranslate-result" style="width: 90%; font: 12px tahoma,arial,sans-serif"></div>'
                }
            ]
        });
        ui.component.GoogleTranslationPanel.superclass.initComponent.call(this);
    }
});

// singleton
ui.component._GoogleTranslationPanel.instance = null;
ui.component.GoogleTranslationPanel.getInstance = function(config)
{
    if (!ui.component._GoogleTranslationPanel.instance) {
        if (!config) {
            config = {};
        }
        ui.component._GoogleTranslationPanel.instance = new ui.component.GoogleTranslationPanel(config);
    }
    return ui.component._GoogleTranslationPanel.instance;
};
