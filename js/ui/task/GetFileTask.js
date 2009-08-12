Ext.namespace('ui','ui.task');

// config - { prefix, ftype, fid, fpath, fname }
ui.task.GetFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype;
    // Mask the panel
    Ext.get(id_prefix + '-PANEL-' + this.fid).mask(
        '<img src="themes/img/loading.gif" ' +
            'style="vertical-align: middle;" /> '+
        _('Loading...')
    );

    // We load the File
    XHR({
        scope  : this,
        params : {
            task     : 'getFile',
            FilePath : this.fpath,
            FileName : this.fname
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setCode(o.content);
            Ext.get(id_prefix + '-PANEL-' + this.fid).unmask();
        },
        callback : function()
        {
            // Reviewed function to open all files of an extension
            if (phpDoc.filePendingOpen[0]) {
                phpDoc.filePendingOpen.shift();
                if (phpDoc.filePendingOpen[0]) {
                    if (phpDoc.filePendingOpen[0].fpath) {
                        ui.component.RepositoryTree.getInstance().openFile(
                            phpDoc.filePendingOpen[0].fpath,
                            phpDoc.filePendingOpen[0].fname
                        );
                    }
                }
            }
        }
    });
}
