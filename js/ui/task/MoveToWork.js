Ext.namespace('ui','ui.task');

// config - { patchID, patchName, nodesToAdd }
ui.task.MoveToWork = function(config)
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
                task    : 'moveToWork',
                filesID : filesID.join(',')
            },
            success : function()
            {
                Ext.getBody().unmask();

                // We add this files into work component
                ui.cmp.WorkTreeGrid.getInstance().addToWork(this.nodesToAdd);

                // We get all idDB from this nodes to delete record from Patch for review
                if( this.nodesToAdd ) {
                    Ext.each(this.nodesToAdd, function(node) {
                        ui.cmp.PatchesTreeGrid.getInstance().delRecord(node.attributes.idDB);
                    });
                }

            },
            failure : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);
                Ext.getBody().unmask();

                Ext.MessageBox.alert('Error', o.err);
            }
        });
};
