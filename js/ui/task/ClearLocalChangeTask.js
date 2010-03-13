Ext.namespace('ui','ui.task');

// config - { ftype, fpath, fname, storeRecord }
ui.task.ClearLocalChangeTask = function(config)
{
    Ext.apply(this, config);

    if (PhDOE.userLogin === 'anonymous') {
        PhDOE.winForbidden();
        return;
    }

    Ext.MessageBox.confirm(
        _('Confirm'),
        _('This action will clear your local modification and take back this file from his original stats.<br/>You need confirm.'),
        function(btn)
        {
            if (btn === 'yes') {
                Ext.getBody().mask(
                    '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                    _('Please, wait...')
                );

                // Before clear local change, we close the file if there is open
                if (Ext.getCmp('main-panel').findById('FNU-' + Ext.util.md5('FNU-' + this.fpath + this.fname))) {
                    Ext.getCmp('main-panel').remove('FNU-' + Ext.util.md5('FNU-' + this.fpath + this.fname));
                }

                XHR({
                    scope   : this,
                    params  : {
                        task     : 'clearLocalChange',
                        FileType : this.ftype,
                        FilePath : this.fpath,
                        FileName : this.fname
                    },
                    success : function(r)
                    {
                        var pending_commit_grid = ui.component.PendingCommitGrid.getInstance(),
                            o                   = Ext.util.JSON.decode(r.responseText),
                            node;

                        // We delete this record from the pending commit store
                        pending_commit_grid.store.remove(this.storeRecord);

                        // We fire event add to update the file count
                        pending_commit_grid.store.fireEvent(
                            'add', pending_commit_grid.store
                        );

                        // Action for EN file
                        if( o.lang === 'en' && this.ftype === 'update' ) {

                            // trow StaleFile store
                            ui.component.StaleFileGrid.getInstance().store.each(
                                function(record)
                                {
                                    if ((record.data.path) === '/'+o.path && record.data.name === o.name ) {
                                        record.set('needCommitEN', false);
                                        record.set('en_revision', o.revision);
                                        record.commit();
                                    }
                                }, this);

                            // find open node in All Files modules
                            node = false;
                            node = ui.component.RepositoryTree.getInstance().getNodeById('/'+this.fpath+this.fname);
                            if (node) {
                              node.getUI().removeClass('modified');
                            }

                            Ext.getBody().unmask();
                            return;
                        }

                        // All after this is only available for LANG file

                        // We try to search in others stores if this file is marked as needCommit

                        // trow storeNotInEn
                        ui.component.NotInENGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needcommit', false);
                                }
                            }, this);

                        // trow storeFilesNeedReviewed
                        ui.component.PendingReviewGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needcommit', false);
                                }
                            }, this);

                        // trow StaleFile store
                        ui.component.StaleFileGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needCommitLang', false);
                                    record.set('revision', o.revision);
                                    record.set('maintainer', o.maintainer);
                                    record.commit();
                                }
                            }, this);

                        // trow FileError
                        ui.component.ErrorFileGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needcommit', false);
                                }
                            }, this);

                        // find open node in All Files modules
                        node = false;
                        node = ui.component.RepositoryTree.getInstance().getNodeById('/'+this.fpath+this.fname);
                        if (node) {
                          node.getUI().removeClass('modified');
                        }

                        Ext.getBody().unmask();
                    },
                    failure : function()
                    {
                        // clear local change failure
                        Ext.getBody().unmask();
                        PhDOE.winForbidden();
                    }
                });
            }
        }, this
    );
};