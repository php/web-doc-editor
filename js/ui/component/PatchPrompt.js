Ext.namespace('ui','ui.component');

// config - {defaultEmail, prefix, ftype, fid, fpath, fname, lang}
ui.component.PatchPrompt = Ext.extend(Ext.Window,
{
    title      : _('Do you want to be alerted ?'),
    iconCls    : 'patchAlert',
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
                html      : _('If you want to be notified when your patch ' +
                              'will be dealt with, thank you to leave an email address below.')
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
                    var email     = Ext.getCmp('patch-email-alert').getValue(),
                        msg       = Ext.MessageBox.wait(_('Saving data as a patch...'))
                        id_prefix = this.prefix + '-' + this.ftype;

                    Ext.getCmp(id_prefix + '-PANEL-btn-saveas-' + this.fid).disable();
                    Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
                    Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                        Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
                    );

                    if (   (this.prefix === 'AF')
                        || (this.lang === 'en' && Ext.getCmp(this.prefix+'-LANG-FILE-'+this.fid).isModified === false)
                        || (this.lang !== 'en' && Ext.getCmp(this.prefix+'-EN-FILE-'+this.fid).isModified === false)
                    ) {
                        Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                            Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                        );
                    }

                    // We save this patch
                    XHR({
                        scope  : this,
                        url    : './php/controller.php',
                        params : {
                            task        : 'saveFile',
                            filePath    : this.fpath,
                            fileName    : this.fname,
                            fileLang    : this.lang,
                            fileContent : Ext.getCmp(id_prefix + '-FILE-' + this.fid).getCode(),
                            type        : 'patch',
                            emailAlert  : email
                        },
                        success : function(response)
                        {
                            var o = Ext.util.JSON.decode(response.responseText);

                            // Add this files into storePendingPatch
                            phpDoc.addToPendingPatch(this.lang + this.fpath, this.fname, o.uniqId);

                            // Remove wait msg
                            msg.hide();
                        }
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
        ui.component.PatchPrompt.superclass.initComponent.call(this);
    }
});
