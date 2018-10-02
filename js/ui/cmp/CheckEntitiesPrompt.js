Ext.namespace('ui','ui.cmp');

ui.cmp.CheckEntitiesPrompt = Ext.extend(Ext.Window,
{
    title      : _('Check entities'),
    iconCls    : 'iconRun',
    id         : 'win-check-entities',
    layout     : 'fit',
    width      : 250,
    height     : 140,
    resizable  : false,
    modal      : true,
    bodyStyle  : 'padding:5px 5px 0; text-align: center;',
    labelAlign : 'top',
    closeAction: 'hide',
    buttons    : [{
        id      : 'win-check-entities-btn',
        text    : _('Go !'),
        handler : function()
        {
            new ui.task.CheckEntitiesTask();
            Ext.getCmp('win-check-entities').hide();
        }
    }],
    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype     : 'panel',
                modal     : false,
                baseCls   : 'x-plain',
                bodyStyle : 'padding:5px 5px 0',
                html      : _('You\'re about to check all entities.<br><br>This action takes time.')
            }]
        });
        ui.cmp.CheckEntitiesPrompt.superclass.initComponent.call(this);
    }
});
