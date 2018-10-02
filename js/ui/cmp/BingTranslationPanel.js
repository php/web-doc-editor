Ext.namespace('ui','ui.cmp');

//------------------------------------------------------------------------------
// BingTranslationPanel
ui.cmp.BingTranslationPanel = Ext.extend(Ext.FormPanel,
{
    border     : false,
    labelAlign : 'top',
    bodyStyle  : 'padding:5px',
    autoScroll : true,

    getTranslation : function(str)
    {
        new ui.task.GetBingTranslation({
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
                name       : 'BingTranslate-string',
                id         : 'BingTranslate-string',
                allowBlank : false
            },{
                scope   : this,
                xtype   : 'button',
                text    : _('Translate !'),
                id      : 'BingTranslate-btn',
                handler : function() {
                    this.getTranslation(Ext.getCmp('BingTranslate-string').getValue());
                }
            },{
                xtype     : 'panel',
                anchor    : '100%',
                border    : false,
                bodyStyle :'padding:5px',
                html      : '<div id="BingTranslate-result" style="width: 90%; font: 12px tahoma,arial,sans-serif"></div>'
            }]
        });
        ui.cmp.BingTranslationPanel.superclass.initComponent.call(this);
    }
});
