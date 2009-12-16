Ext.namespace('ui','ui.component');

ui.component.CheckBuildPrompt = Ext.extend(Ext.Window,
{
    title      : _('Check Build'),
    iconCls    : 'checkBuild',
    layout     : 'form',
    width      : 350,
    height     : 200,
    resizable  : false,
    modal      : true,
    bodyStyle  : 'padding:5px 5px 0',
    labelAlign : 'top',
    buttons : [{
        id      : 'win-check-build-btn-submit',
        text    : _('Go !'),
        handler : function()
        {
            var tmp = new ui.task.CheckBuildTask();
            this.ownerCt.close();
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
                html      : _('You\'re about to check the build via this command:') +
                            '<br/><br/>/usr/bin/php configure.php --with-lang=' + phpDoc.userLang + '<br/><br/>'
            }, {
                xtype     : 'checkbox',
                id        : 'option-xml-details',
                name      : 'option-xml-details',
                checked   : false,
                hideLabel : true,
                boxLabel  : _('Enable detailed XML error messages')
            }]
        });
        ui.component.CheckBuildPrompt.superclass.initComponent.call(this);
    }
});
