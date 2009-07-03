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
            var values = this.ownerCt.findByType('form').shift()
                        .getForm().getValues();

            XHR({
                scope   : this,
                url     : './php/controller.php',
                params  : {
                    task    : 'sendEmail',
                    to      : values.to,
                    subject : values.subject,
                    msg     : values.msg
                },
                success : function(response)
                {
                    this.ownerCt.close();
                    Ext.MessageBox.alert(
                        _('Status'),
                        String.format(_('Email sent to {0} with success!'),
                        this.ownerCt.name)
                    );
                }
            });

        }
    }, {
        text    : _('Cancel'),
        handler : function()
        {
            this.ownerCt.close();
        }
    }],

    initComponent : function()
    {
        Ext.apply(this, {
            items : new Ext.form.FormPanel({
                url         : 'save-form.php',
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
