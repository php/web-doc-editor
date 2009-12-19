Ext.namespace('ui','ui.component','ui.component._EmailPrompt');

// config - { name, email }
ui.component.EmailPrompt = Ext.extend(Ext.Window,
{
    title       : _('Send an email'),
    width       : 500,
    height      : 300,
    minWidth    : 300,
    minHeight   : 200,
    layout      : 'fit',
    plain       : true,
    bodyStyle   : 'padding:5px;',
    buttonAlign : 'center',
    iconCls     : 'iconSendEmail',

    buttons : [{
        text    : _('Send'),
        handler : function()
        {
            var win    = this.ownerCt.ownerCt,
                values = win.findByType('form').shift().getForm().getValues();

            XHR({
                params  : {
                    task    : 'sendEmail',
                    to      : values.to,
                    subject : values.subject,
                    msg     : values.msg
                },
                success : function(response)
                {
                    win.close();

                    Ext.Msg.alert(
                        _('Status'),
                        String.format(_('Email sent to {0} with success!'), win.name),
                        Ext.emptyFn
                    );
                }
            });

        }
    }, {
        text    : _('Cancel'),
        handler : function()
        {
            this.ownerCt.ownerCt.close();
        }
    }],

    initComponent : function()
    {
        Ext.apply(this, {
            items : new Ext.form.FormPanel({
                baseCls     : 'x-plain',
                labelWidth  : 55,
                defaultType : 'textfield',
                items : [{
                    name       : 'to',
                    fieldLabel : _('Send To'),
                    readOnly   : true,
                    anchor     : '100%',
                    value      : '"' + this.name + '" <' + this.email + '>'
                }, {
                    name       : 'subject',
                    fieldLabel : _('Subject'),
                    anchor     : '100%'
                }, {
                    name      : 'msg',
                    xtype     : 'textarea',
                    hideLabel : true,
                    anchor    : '100% -53'
                }]
            })
        });
        ui.component.EmailPrompt.superclass.initComponent.call(this);
    }
});
