Ext.namespace('ui','ui.task');

// config - { fid, fuid, storeRecord }
ui.task.RejectPatchTask = function(config)
{
    Ext.apply(this,config);

    this.run = function()
    {
        if (phpDoc.userLogin === 'cvsread') {
            phpDoc.winForbidden();
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
                        url    : './php/controller.php',
                        params : {
                            task        : 'afterPatchReject',
                            PatchUniqID : this.fuid
                        },
                        success : function(response)
                        {
                            // Remove this patch from the PendingPatchStore
                            phpDoc.pendingPatchGrid.store.remove(this.storeRecord);

                            // We fire event add to update the file count
                            phpDoc.pendingPatchGrid.store.fireEvent('add', phpDoc.pendingPatchGrid.store);

                            // Remove this tab
                            Ext.getCmp('main-panel').remove('PP-' + this.fid);
                            // Remove wait msg
                            msg.hide();
                        },
                        failure : function(response)
                        {
                            // Remove wait msg
                            msg.hide();
                            phpDoc.winForbidden();
                        }
                    });
                } // btn = yes
            }, this // scope
        );
    }
}
