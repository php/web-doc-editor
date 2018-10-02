Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeIdx}
ui.task.CheckFileTask = function(config)
{
    Ext.apply(this,config);

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Checking for error. Please, wait...')
    );

    XHR({
        scope  : this,
        params : {
            task        : 'checkFileError',
            FilePath    : this.fpath,
            FileName    : this.fname,
            FileLang    : this.lang,
            FileContent : Ext.getCmp(this.prefix + '-' + this.ftype +
                                        '-FILE-' + this.fid).getValue()
        },
        failure: function()
        {
            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Un-mask the body
            Ext.getBody().unmask();

            // Display a warning
            Ext.MessageBox.alert(_('Error'), _('An error occured while checking this file for errors. Please, try again.'));
        },
        success : function(r)
        {
            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Un-mask the body
            Ext.getBody().unmask();

            var o = Ext.util.JSON.decode(r.responseText);

            // If there is some errors, we display this
            if (o.error && o.error_first !== '-No error-') {

                Ext.getCmp('main-panel').add({
                    id         : 'FE-help-' + this.fid,
                    title      : 'Error in ' + this.fname,
                    iconCls    : 'iconFilesError',
                    closable   : true,
                    autoScroll : true,
                    autoLoad   : './error?dir='  + this.fpath +
                                        '&file=' + this.fname
                });

                Ext.getCmp('main-panel').setActiveTab('FE-help-' + this.fid);

            } else {
                // If there is no error, we display an information message
                Ext.MessageBox.show({
                    title   : _('Check for errors'),
                    msg     : _('There is no error.'),
                    buttons : Ext.MessageBox.OK,
                    icon    : Ext.MessageBox.INFO
                });
            }

            // Now, We save  File
            new ui.task.SaveFileTask({
                prefix      : this.prefix,
                ftype       : this.ftype,
                fid         : this.fid,
                fpath       : this.fpath,
                fname       : this.fname,
                lang        : this.lang,
                storeRecord : this.storeRecord
            });

            if (this.prefix === 'FE') {
                // We must reload the iframe of error description
                Ext.getCmp('FE-error-desc-' + this.fid).body.updateManager.refresh();
            }

            ui.cmp.ErrorFileGrid.getInstance().store.reload();
        }
    });
};
