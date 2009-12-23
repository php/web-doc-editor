Ext.namespace('ui','ui.task');

// config - { prefix, ftype, fid, fpath, fname }
ui.task.GetFileTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix    = this.prefix + '-' + this.ftype,
        readOriginal = (this.ftype == 'NotInEN') ? true : false;

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
            FileName : this.fname,
            readOriginal: readOriginal
        },
        success : function(response)
        {
            var o    = Ext.util.JSON.decode(response.responseText),
                path = 'http://' + window.location.host + ':' + window.location.port + window.location.pathname
                       + '?perm=/' + this.fpath.split('/')[0] + '/' + o.xmlid.split('|')[0] + '.php',
                perm = '&nbsp;<a href="' + path + '" target="_blank">permlink</a>',
                p    = Ext.getCmp(id_prefix + '-PANEL-' + this.fid);

            // We set the permLink (exclude for file patch)
            if( this.prefix === 'PP' && this.ftype === 'ORIGIN' ) {
                p.permlink = (o.xmlid != 'NULL')? perm : '';
                p.setTitle(p.originTitle + p.permlink);
            }

            // We define the content into the editor
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).setCode(o.content);

            // Remove the mask from the editor
            Ext.get(id_prefix + '-PANEL-' + this.fid).unmask();

            if( o.warn_tab ) {

                // Display a warn message if this file containes some tab caracter.
                Ext.MessageBox.show({
                    title: 'Warning',
                    msg: String.format(_('The file <b> {0}</b> contains some tab caracters.<br>The editor have replace it with space caracters.'), this.fpath+this.fname),
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });

            }


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
};
