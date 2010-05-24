Ext.namespace('ui','ui.cmp');

//config - { name, email }
ui.cmp.ManagePatchPrompt = Ext.extend(Ext.Window,
{
    title       : '',
    width       : 250,
    height      : 100,
    minWidth    : 250,
    minHeight   : 100,
    layout      : 'fit',
    plain       : true,
    bodyStyle   : 'padding:5px;',
    buttonAlign : 'center',
    iconCls     : 'iconPatch',
    closeAction : 'hide',

    nodesToAdd  : false,
    defaultValue: '',
    patchID     : false,

    buttons     : [{
        text   : _('Create'),
        handler: function()
        {
            var win    = this.ownerCt.ownerCt,
                values = win.findByType('form').shift().getForm().getValues();

            XHR({
                params  : {
                    task    : 'managePatch',
                    name    : values.name,
                    patchID : win.patchID
                },
                success : function(r)
                {
                    var o = Ext.util.JSON.decode(r.responseText);

                    win.hide();

                    // If we want to modify the path name
                    if( win.patchID ) {
                        ui.cmp.PatchesTreeGrid.getInstance().modPatchName({
                            newPatchName : values.name,
                            patchID      : win.patchID
                        });
                    }
					
					// If there is some node to Add, we call this.
					if (win.nodesToAdd) {
						ui.task.MoveToPatch({
							patchID: o.patchID,
							patchName: values.name,
							nodesToAdd: win.nodesToAdd
						});
					}
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

    initComponent : function()
    {
        Ext.apply(this, {
            items : new Ext.form.FormPanel({
                baseCls     : 'x-plain',
                labelWidth  : 55,
                defaultType : 'textfield',
                items : [{
                    name       : 'name',
                    fieldLabel : _('Name'),
                    anchor     : '100%',
                    value      : this.defaultValue
                }]
            })
        });
        ui.cmp.ManagePatchPrompt.superclass.initComponent.call(this);
    }
});