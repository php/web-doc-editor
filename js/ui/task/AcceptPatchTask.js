Ext.namespace('ui','ui.task');

// config - { fid, fuid, fpath, fname, storeRecord }
ui.task.AcceptPatchTask = function(config)
{
    Ext.apply(this, config);

    this.run = function()
    {
        if (phpDoc.userLogin === 'cvsread') {
            phpDoc.winForbidden();
            return;
        }

        Ext.MessageBox.confirm(
            _('Confirm'),
            _('This action will accept this patch, send an email to his author, save the file and close this tab.'),
            function(btn)
            {
                if (btn === 'yes') {
                    Ext.getCmp('PP-PATCH-PANEL-btn-save-' + this.fid).disable();
                    Ext.getCmp('PP-PATCH-FILE-' + this.fid).isModified = false;
                    Ext.getCmp('PP-PATCH-PANEL-' + this.fid).setTitle(
                        Ext.getCmp('PP-PATCH-PANEL-' + this.fid).originTitle
                    );
                    Ext.getCmp('PP-' + this.fid).setTitle(
                        Ext.getCmp('PP-' + this.fid).originTitle
                    );

                    var msg = Ext.MessageBox.wait(_('Saving data...'));

                    // We save LANG File
                    XHR({
                        scope  : this,
                        url    : './php/controller.php',
                        params : {
                            task        : 'saveFile',
                            filePath    : this.fpath,
                            fileName    : this.fname,
                            fileLang    : 'all',
                            fileContent : Ext.getCmp('PP-PATCH-FILE-' + this.fid).getCode()
                        },
                        success : function(response)
                        {
                            var o = Ext.util.JSON.decode(response.responseText);

                            // Add this files into storePendingCommit
                            phpDoc.addToPendingCommit(o.id, this.fpath, this.fname, 'update');

                            // Remove this patch from the PendingPatchStore
                            phpDoc.pendingPatchGrid.store.remove(this.storeRecord);

                            // We fire event add to update the file count
                            phpDoc.pendingPatchGrid.store.fireEvent('add', phpDoc.pendingPatchGrid.store);

                            // We need to send an accept patch email, delete .patch file, and remove this patch from dataBase
                            XHR({
                                scope  : this,
                                url    : './php/controller.php',
                                params : {
                                    task        : 'afterPatchAccept',
                                    PatchUniqID : this.fuid
                                }
                            });

                            // Remove wait msg
                            msg.hide();

                            // Remove this tab
                            Ext.getCmp('main-panel').remove('PP-' + this.fid);
                        },
                        failure : function(response) {
                            // Remove wait msg
                            msg.hide();
                            //~ phpDoc.winForbidden(); // use failure prompt?
                        }
                    });
                } // btn = yes
            }, this // scope
        );
    }
}



