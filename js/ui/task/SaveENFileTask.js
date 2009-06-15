Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, storeRecord}
ui.task.SaveENFileTask = function(config)
{
    Ext.apply(this, config);

    this.run = function()
    {
        var msg = Ext.MessageBox.wait(_('Saving data...'));

        XHR({
            scope  : this,
            url    : './php/controller.php',
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
                    this.storeRecord.set('en_revision', '1.' + o.en_revision);
                    this.storeRecord.set('needcommit', true);
                }

                if (this.prefix === 'FE') {
                    // Update our store
                    phpDoc.storeFilesError.getAt(this.storeIdx).set('needcommit', true);
                }

                if (this.prefix === 'FNR') {
                    // Update our store
                    phpDoc.storeFilesNeedReviewed.getAt(this.storeIdx).set('needcommit', true);
                }

                if (this.prefix === 'AF') {
                    this.storeRecord.getUI().addClass('modified'); // tree node
                }

                // Add this files into storePendingCommit
                phpDoc.addToPendingCommit(o.id, 'en' + this.fpath, this.fname, 'update');

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
}
