Ext.namespace('ui','ui.task');

// config - { patchID, patchName, nodesToAdd }
ui.task.MoveToPatch = function(config)
{
        Ext.apply(this, config);

        var filesID=[];

        Ext.each(this.nodesToAdd, function(node) {
            filesID.push(node.attributes.idDB);
        });

        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
            );

        XHR({
            scope   : this,
            params  : {
                task    : 'moveToPatch',
                patchID : this.patchID,
                filesID : filesID.join(',')
            },
            success : function()
            {
                Ext.getBody().unmask();

                // We add this new patch, and nodesToAdd into Patches for review component
                ui.cmp.PatchesTreeGrid.getInstance().addToPatch(this.patchID, this.patchName, this.nodesToAdd, this.patchDescription, this.patchEmail);

                // We get all idDB from this nodes to delete record from Work in progress
                if( this.nodesToAdd ) {
                    Ext.each(this.nodesToAdd, function(node) {
                        ui.cmp.WorkTreeGrid.getInstance().delRecord(node.attributes.idDB);
                    });
                }

            },
            failure : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);
                Ext.getBody().unmask();

                Ext.MessageBox.alert(_('Error'), _(o.err));
            }
        });
};
