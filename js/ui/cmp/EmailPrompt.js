Ext.namespace('ui','ui.cmp','ui.cmp._EmailPrompt');

// config - { name, email }
ui.cmp.EmailPrompt = Ext.extend(Ext.Window,
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
    closeAction : 'hide',
    buttons     : [{
        text   : _('Send'),
        handler: function()
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
                success : function()
                {
                    win.hide();

                    Ext.Msg.alert(
                        _('Status'),
                        String.format(_('Email sent to {0} with success!'), win.name.ucFirst()),
                        Ext.emptyFn
                    );
                },
                failure : function()
                {
                    PhDOE.winForbidden();
                }
            });

        }
    }, {
        text    : _('Cancel'),
        handler : function()
        {
            this.ownerCt.ownerCt.hide();
        }
    }],

    setData : function (name, email)
    {
        this.name  = name;
        this.email = email;

        this.items.items[0].items.items[0].setValue('"' + this.name.ucFirst() + '" <' + this.email + '>');
        this.items.items[0].items.items[1].setValue('');
        this.items.items[0].items.items[2].setValue('');
    },

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
                    value      : ''
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
        ui.cmp.EmailPrompt.superclass.initComponent.call(this);
    }
});
