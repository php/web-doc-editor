Ext.namespace('ui','ui.task');

// config - { fpath, fname, storeRecord }
ui.task.MarkDeleteTask = function(config)
{
    Ext.apply(this, config);

    Ext.MessageBox.confirm(
        _('Confirm'),
        _('This action will mark this file as need deleted.<br/><br/>You need commit this change to take it effect.<br/><br/>Please, confirm this action.'),
        function(btn)
        {
            if (btn === 'yes') {
                Ext.getBody().mask(
                    '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                    _('Please, wait...')
                );

                XHR({
                    scope   : this,
                    params  : {
                        task     : 'markAsNeedDelete',
                        FilePath : PhDOE.user.lang + this.fpath,
                        FileName : this.fname
                    },
                    success : function(r)
                    {
                        var o = Ext.util.JSON.decode(r.responseText);

                        Ext.getBody().unmask();
                        ui.cmp.WorkTreeGrid.getInstance().addRecord(
                            o.id, PhDOE.user.lang + this.fpath, this.fname, 'delete'
                        );
                        this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                    }
                });
            }
        }, this
    );
};
