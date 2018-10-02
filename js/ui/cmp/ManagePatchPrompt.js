Ext.namespace('ui','ui.cmp');

//config - { name, email }
ui.cmp.ManagePatchPrompt = Ext.extend(Ext.Window,
{
    title       : '',
    width       : 450,
    height      : 260,
    minWidth    : 450,
    minHeight   : 300,
    layout      : 'fit',
    plain       : true,
    bodyStyle   : 'padding:5px;',
    buttonAlign : 'center',
    iconCls     : 'iconPatch',
    closeAction : 'hide',

    nodesToAdd  : false,
    patchName   : '',
    patchDescription   : '',
    patchEmail   : '',
    patchID     : false,

    initComponent : function()
    {
        Ext.apply(this, {

            buttons : [{
                text   : (this.patchID) ? _('Save') : _('Create'),
                handler: function()
                {
                    var win    = this.ownerCt.ownerCt,
                        values = win.findByType('form').shift().getForm().getValues();

                    XHR({
                        params  : {
                            task        : 'managePatch',
                            name        : values.name,
                            description : values.description,
                            email       : values.email,
                            patchID     : win.patchID
                        },
                        success : function(r)
                        {
                            var o = Ext.util.JSON.decode(r.responseText);

                            win.hide();

                            // If we want to modify the path name
                            if( win.patchID ) {
                                ui.cmp.PatchesTreeGrid.getInstance().modPatchName({
                                    newPatchName : values.name,
                                    newPatchDescription : values.description,
                                    newPatchEmail : values.email,
                                    patchID      : win.patchID
                                });
                            }

                            // If there is some node to Add, we call this.
                            if (win.nodesToAdd) {
                                    ui.task.MoveToPatch({
                                            patchID: o.patchID,
                                            patchName: values.name,
                                            patchDescription: values.description,
                                            patchEmail: values.email,
                                            nodesToAdd: win.nodesToAdd
                                    });
                            }

                            // We reload the patchList store
                            PhDOE.user.patchList.reload();
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
            items : [{
                xtype       : 'form',
                baseCls     : 'x-plain',
                labelWidth  : 110,
                defaultType : 'textfield',
                labelAlign  : 'top',
                items : [{
                    name       : 'name',
                    fieldLabel : _('Patch name'),
                    anchor     : '100%',
                    value      : this.patchName
                },{
                    name       : 'description',
                    xtype      : 'textarea',
                    fieldLabel : _('Patch description'),
                   tooltipText : _('This description will be the default during the validation of the patch by a valid user.'),
                    anchor     : '100%',
                    value      : this.patchDescription
                },{
                    name       : 'email',
                    fieldLabel : _('Email'),
                   tooltipText : _('If provided, an email will be send to you to inform that the patch is commited.'),
                    anchor     : '100%',
                    value      : this.patchEmail
                }]
            }]
        });
        ui.cmp.ManagePatchPrompt.superclass.initComponent.call(this);
    }
});
