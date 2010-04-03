Ext.namespace('ui','ui.task');

// config - { fid, fuid, storeRecord }
ui.task.RejectPatchTask = function(config)
{
    Ext.apply(this,config);

    if (PhDOE.userLogin === 'anonymous') {
        PhDOE.winForbidden();
        return;
    }

    Ext.MessageBox.confirm(
        _('Confirm'),
        _('This action will <b>reject</b> this patch, send an email to his author and close this tab.'),
        function (btn)
        {
            if (btn === 'yes') {
                var msg = Ext.MessageBox.wait(_('Please, wait...'));

                XHR({
                    scope  : this,
                    params : {
                        task        : 'afterPatchReject',
                        PatchUniqID : this.fuid
                    },

                    success : function()
                    {
                        var grid = ui.component.PendingPatchGrid.getInstance();
                        // Remove this patch from the PendingPatchStore
                        grid.store.remove(this.storeRecord);

                        // We fire event datachanged to update the file count
                        grid.store.fireEvent('datachanged', grid.store);

                        // Remove this tab
                        Ext.getCmp('main-panel').remove('PP-' + this.fid);

                        // Remove wait msg
                        msg.hide();

                        // Notify
                        PhDOE.notify('info', _('Patch rejected successfully'), _('The Patch was rejected successfully !'));
                    },

                    failure : function()
                    {
                        // Remove wait msg
                        msg.hide();
                        PhDOE.winForbidden();
                    }
                });
            } // btn = yes
        }, this // scope
    );
};
