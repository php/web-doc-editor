Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.CheckXml = function(config)
{
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('XML check. Please, wait...'));

    XHR({
        scope  : this,
        params : {
            task        : 'checkXml',
            fileContent : Ext.getCmp(this.idPrefix + '-FILE-' + this.fid).getValue()
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // Remove wait msg
            msg.hide();

            // Is there some errors ?
            if( o.errors !== 'no_error' ) {

                new ui.cmp.CheckXmlWin({
                    errors : o.errors
                });

            } else {
                PhDOE.notify('info', _('XML check'), _('There is no error.'));
            }
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // Remove wait msg
            msg.hide();
        }
    });
};
