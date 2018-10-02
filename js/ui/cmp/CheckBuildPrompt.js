Ext.namespace('ui','ui.cmp');

ui.cmp.CheckBuildPrompt = Ext.extend(Ext.Window,
{
    title      : _('Check build'),
    iconCls    : 'iconCheckBuild',
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
            new ui.task.CheckBuildTask();
            this.ownerCt.ownerCt.close();
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
                            '<br/><br/>/usr/bin/php configure.php --with-lang=' + PhDOE.user.lang + '<span id="option-xml-details-span" style="color: red; visibility: hidden;"> --enable-xml-details</span><br/><div id="option-xml-details-div" style="text-align: center; color: red; visibility: hidden;">'+_('<b>WARNING !</b><br/> This option use a lot of server ressource. If you don\'t know what are the consequence, please, don\'t use it.')+'</div>'
            }, {
                xtype     : 'checkbox',
                id        : 'option-xml-details',
                name      : 'option-xml-details',
                checked   : false,
                hideLabel : true,
                boxLabel  : _('Enable detailed XML error messages'),
                listeners : {
                    check: function(c, state) {
                        Ext.get('option-xml-details-span').dom.style.visibility = (state) ? 'visible' : 'hidden';
                        Ext.get('option-xml-details-div').dom.style.visibility  = (state) ? 'visible' : 'hidden';
                    }
                }
            }]
        });
        ui.cmp.CheckBuildPrompt.superclass.initComponent.call(this);
    }
});
