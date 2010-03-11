Ext.namespace('ui','ui.task');

// config - { fid, fuid, fpath, fname, storeRecord }
ui.task.AcceptPatchTask = function(config)
{
    Ext.apply(this, config);

    if (PhDOE.userLogin === 'anonymous') {
        PhDOE.winForbidden();
        return;
    }

    Ext.MessageBox.confirm(
        _('Confirm'),
        _('This action will accept this patch, send an email to his author, save the file and close this tab.'),
        function(btn)
        {
            if (btn === 'yes') {
                Ext.getCmp('PP-PATCH-FILE-'      + this.fid).isModified = false;
                Ext.getCmp('PP-PATCH-PANEL-'     + this.fid).setTitle(
                    Ext.getCmp('PP-PATCH-PANEL-' + this.fid).originTitle
                );
                Ext.getCmp('PP-' + this.fid).setTitle(
                    Ext.getCmp('PP-' + this.fid).originTitle
                );

                var msg = Ext.MessageBox.wait(_('Saving data...'));

                // We save LANG File
                XHR({
                    scope  : this,
                    params : {
                        task        : 'saveFile',
                        filePath    : this.fpath,
                        fileName    : this.fname,
                        fileLang    : 'all',
                        fileContent : Ext.getCmp('PP-PATCH-FILE-' + this.fid).getCode()
                    },
                    success : function(r)
                    {
                        var o    = Ext.util.JSON.decode(r.responseText),
                            grid = ui.component.PendingPatchGrid.getInstance();

                        // Add this files into storePendingCommit
                        ui.component.PendingCommitGrid.getInstance().addRecord(
                            o.id, this.fpath, this.fname, 'update'
                        );

                        // Remove this patch from the PendingPatchStore
                        grid.store.remove(this.storeRecord);

                        // We fire event add to update the file count
                        grid.store.fireEvent('add', grid.store);

                        // We need to send an accept patch email, delete .patch file, and remove this patch from dataBase
                        XHR({
                            scope  : this,
                            params : {
                                task        : 'afterPatchAccept',
                                PatchUniqID : this.fuid
                            }
                        });

                        // Remove this tab
                        Ext.getCmp('main-panel').remove('PP-' + this.fid);

                        // Remove wait msg
                        msg.hide();

                        // Notify
                        PhDOE.notify('info', _('Patch accepted successfully'), _('The Patch was accepted successfully !'));
                    },
                    failure : function() {
                        // Remove wait msg
                        msg.hide();
                    }
                });
            } // btn = yes
        }, this // scope
    );
};