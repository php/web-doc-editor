Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.SaveTransFileTask = function(config)
{
    Ext.apply(this, config);

    if (phpDoc.userLogin === 'anonymous') {
        phpDoc.winForbidden();
        return;
    }

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('Saving data...'));

    XHR({
        scope  : this,
        params : {
            task        : 'saveFile',
            type        : 'trans',
            filePath    : this.fpath,
            fileName    : this.fname,
            fileLang    : this.lang,
            fileContent : Ext.getCmp(this.prefix + '-' + this.ftype +
                                        '-FILE-' + this.fid).getCode()
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

                this.storeRecord.set('needcommit', true);
                //this.storeRecord.set('maintainer', o.maintainer);
                this.storeRecord.commit();

            // Add this files into storePendingCommit
            ui.component.PendingCommitGrid.getInstance().addRecord(
                o.id, this.lang + this.fpath, this.fname, 'new'
            );

            // reset file
            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
            );
            // reset tab-panel
            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
                Ext.getCmp(this.prefix + '-' + this.fid).originTitle
            );

            // Remove wait msg
            msg.hide();

            // Notify
            phpDoc.notify('info', _('Document saved'), String.format(_('Document <br><br><b>{0}</b><br><br> was saved successfully !'), this.lang + this.fpath + this.fname));
        },
        failure : function(response)
        {
            // Remove wait msg
            msg.hide();
            phpDoc.winForbidden();
        }
    });
};
