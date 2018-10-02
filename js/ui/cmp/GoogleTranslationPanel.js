Ext.namespace('ui','ui.cmp');

//------------------------------------------------------------------------------
// GoogleTranslationPanel
ui.cmp.GoogleTranslationPanel = Ext.extend(Ext.FormPanel,
{
    border     : false,
    labelAlign : 'top',
    bodyStyle  : 'padding:5px',
    autoScroll : true,

    getTranslation : function(str)
    {
        new ui.task.GetGGTranslation({
            str : str
        });

    },

    initComponent : function()
    {
        Ext.apply(this, {
            items:[{
                xtype      : 'textarea',
                anchor     : '90%',
                fieldLabel : String.format(_('String to translate (en => {0})'), PhDOE.user.lang),
                name       : 'GGTranslate-string',
                id         : 'GGTranslate-string',
                allowBlank : false
            },{
                scope   : this,
                xtype   : 'button',
                text    : _('Translate !'),
                id      : 'GGTranslate-btn',
                handler : function() {
                    this.getTranslation(Ext.getCmp('GGTranslate-string').getValue());
                }
            },{
                xtype     : 'panel',
                anchor    : '100%',
                border    : false,
                bodyStyle :'padding:5px',
                html      : '<div id="GGTranslate-result" style="width: 90%; font: 12px tahoma,arial,sans-serif"></div>'
            }]
        });
        ui.cmp.GoogleTranslationPanel.superclass.initComponent.call(this);
    }
});
