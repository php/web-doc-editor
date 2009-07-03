Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.SaveLangFileTask = function(config)
{
    Ext.apply(this, config);

    if (phpDoc.userLogin === 'cvsread') {
        phpDoc.winForbidden();
        return;
    }

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('Saving data...'));

    XHR({
        scope  : this,
        url    : './php/controller.php',
        params : {
            task        : 'saveFile',
            filePath    : this.fpath,
            fileName    : this.fname,
            fileLang    : this.lang,
            fileContent : Ext.getCmp(this.prefix + '-' + this.ftype +
                                        '-FILE-' + this.fid).getCode()
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            if (this.prefix === 'FE') {
                // Update our store
                this.storeRecord.set('needcommit', true);
                this.storeRecord.set('maintainer', o.maintainer);
                this.storeRecord.commit();
            }

            if (this.prefix === 'FNU') {
                // Update our store
                this.storeRecord.set('revision', '1.' + o.new_revision);
                this.storeRecord.set('needcommit', true);
                this.storeRecord.set('maintainer', o.maintainer);
                this.storeRecord.commit();
            }

            if (this.prefix === 'FNR') {
                // Update our store
                this.storeRecord.set('needcommit', true);
                this.storeRecord.set('maintainer', o.maintainer);
                this.storeRecord.set('reviewed', o.reviewed);
                this.storeRecord.commit();
            }

            if (this.prefix === 'AF') {
                this.storeRecord.getUI().addClass('modified'); // tree node
            }

            // Add this files into storePendingCommit
            ui.component.PendingCommitGrid.getInstance().addRecord(
                o.id, this.lang + this.fpath, this.fname, 'update'
            );

            // reset file
            Ext.getCmp(id_prefix + '-PANEL-btn-save-' + this.fid).disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
                Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
            );
            if (this.ftype === 'ALL' || !Ext.getCmp(this.prefix + '-EN-FILE-' + this.fid).isModified) {
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
}
