Ext.namespace('ui','ui.cmp');

// config - {defaultEmail, prefix, ftype, fid, fpath, fname, lang}
ui.cmp.PatchPrompt = Ext.extend(Ext.Window,
{
    title      : _('Do you want to be alerted ?'),
    iconCls    : 'iconPatchAlert',
    layout     : 'form',
    bodyStyle  : 'padding: 5px;',
    labelWidth : 50,
    width      : 350,
    height     : 150,
    resizable  : false,
    modal      : true,
    autoScroll : true,

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype     : 'panel',
                baseCls   : 'x-plain',
                bodyStyle : 'padding-bottom: 10px;',
                html      : _('If you want to be notified when your patch will be dealt with, thank you to leave an email address below.')
            }, {
                id         : 'patch-email-alert',
                xtype      : 'textfield',
                name       : 'patch-email-alert',
                fieldLabel : _('Email'),
                anchor     : '100%',
                value      : this.defaultEmail
            }],
            buttons : [{
                scope   : this,
                text    : _('Save'),
                handler : function()
                {
                    new ui.task.SavePatchTask({
                        prefix : this.prefix,
                        fid    : this.fid,
                        ftype  : this.ftype,
                        lang   : this.lang,
                        fpath  : this.fpath,
                        fname  : this.fname,
                        email  : Ext.getCmp('patch-email-alert').getValue()
                    });

                    this.close();
                }
            }, {
                scope   : this,
                text    : _('Cancel'),
                handler : function()
                {
                    this.close();
                }
            }]
        });
        ui.cmp.PatchPrompt.superclass.initComponent.call(this);
    }
});