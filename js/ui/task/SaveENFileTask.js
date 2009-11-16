Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, storeRecord}
ui.task.SaveENFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('Saving data...'));

    if (phpDoc.userLogin === 'anonymous') {
        msg.hide();
        phpDoc.winForbidden();
        return;
    }

    XHR({
        scope  : this,
        params : {
            task        : 'saveFile',
            filePath    : this.fpath,
            fileName    : this.fname,
            fileLang    : 'en',
            fileContent : Ext.getCmp(this.prefix + '-' + this.ftype +
                                        '-FILE-' + this.fid).getCode()
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            if (this.prefix === 'FNU') {
                // Update our store
                this.storeRecord.set('en_revision', o.en_revision);
                this.storeRecord.set('needcommit', true);
            }

            if (this.prefix === 'FE') {
                // Update our store
                this.storeRecord.set('needcommit', true);
            }

            if (this.prefix === 'FNR') {
                // Update our store
                this.storeRecord.set('needcommit', true);
            }

            if (this.prefix === 'AF') {
                this.storeRecord.getUI().addClass('modified'); // tree node
            }

            // Add this files into storePendingCommit
            ui.component.PendingCommitGrid.getInstance().addRecord(
                o.id, 'en' + this.fpath, this.fname, 'update'
            );

            // reset file
            Ext.getCmp(id_prefix + '-PANEL-btn-save-' + this.fid).disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
            );
            if (this.ftype === 'ALL' || !Ext.getCmp(this.prefix + '-LANG-FILE-' + this.fid).isModified) {
                // reset tab-panel
                Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                    Ext.getCmp(this.prefix + '-' + this.fid).originTitle
                );
            }

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
};
