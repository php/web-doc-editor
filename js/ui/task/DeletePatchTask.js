Ext.namespace('ui','ui.task');

// config - { patchID }
ui.task.DeletePatchTask = function(config)
{
        Ext.apply(this, config);

        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
            );

        XHR({
            scope   : this,
            params  : {
                task    : 'deletePatch',
                patchID : this.patchID
            },
            success : function()
            {
                Ext.getBody().unmask();

                // We remove the patch from Patches for review module
                ui.cmp.PatchesTreeGrid.getInstance().deletePatch(this.patchID);

                // Notify
                PhDOE.notify('info', _('Patch deleted'), _('The patch have been deleted !'));

            },
            failure : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);

                // Remove wait msg
                Ext.getBody().unmask();
                if( o.err ) {
                    PhDOE.winForbidden(o.err);
                } else {
                    PhDOE.winForbidden();
                }
            }
        });
};
