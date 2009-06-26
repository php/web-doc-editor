Ext.namespace('ui','ui.task');

// config - { ftype, fpath, fname, storeRecord }
ui.task.ClearLocalChangeTask = function(config)
{
    Ext.apply(this, config);

    if (phpDoc.userLogin === 'cvsread') {
        phpDoc.winForbidden();
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
                    url     : './php/controller.php',
                    params  : {
                        task     : 'clearLocalChange',
                        FileType : this.ftype,
                        FilePath : this.fpath,
                        FileName : this.fname
                    },
                    success : function(response)
                    {
                        // clear local change success
                        if (phpDoc.userLang === 'en') {
                            // We reload all store
                            ui.component.StaleFileGrid.instance.store.reload();
                            ui.component.ErrorFileGrid.instance.store.reload();
                            ui.component.PendingReviewGrid.instance.store.reload();
                        }

                        // We delete from this store
                        ui.component.PendingCommitGrid.instance.store.remove(this.storeRecord);

                        // We fire event add to update the file count
                        ui.component.PendingCommitGrid.instance.store.fireEvent(
                            'add', ui.component.PendingCommitGrid.instance.store
                        );

                        // We try to search in others stores if this file is marked as needCommit

                        // trow storeNotInEn
                        ui.component.NotInENGrid.instance.store.each(
                            function(record)
                            {
                                if ((phpDoc.userLang+record.data.path) === this.fpath
                                    && record.data.name === this.fname
                                ) {
                                    record.set('needcommit', false);
                                }
                            },
                            this
                        );

                        // trow storeFilesNeedReviewed
                        ui.component.PendingReviewGrid.instance.store.each(
                            function(record)
                            {
                                if ((phpDoc.userLang+record.data.path) === this.fpath
                                    && record.data.name === this.fname
                                ) {
                                    record.set('needcommit', false);
                                }
                            },
                            this
                        );

                        // trow StaleFile store
                        ui.component.StaleFileGrid.instance.store.each(
                            function(record)
                            {
                                if ((phpDoc.userLang+record.data.path) === this.fpath
                                    && record.data.name === this.fname
                                ) {
                                    record.set('needcommit', false);
                                }
                            },
                            this
                        );

                        // trow FileError
                        ui.component.ErrorFileGrid.instance.store.each(
                            function(record)
                            {
                                if ((phpDoc.userLang+record.data.path) === this.fpath
                                    && record.data.name === this.fname
                                ) {
                                    record.set('needcommit', false);
                                }
                            },
                            this
                        );

                        // find open node in All Files modules
                        var node = ui.component.RepositoryTree.instance.getNodeById('//'+this.fpath+this.fname);
                        if (node) {
                          node.getUI().removeClass('modified');
                        }
                        Ext.getBody().unmask();
                    },
                    failure : function(response)
                    {
                        // clear local change failure
                        Ext.getBody().unmask();
                        phpDoc.winForbidden();
                    }
                });
            }
        }, this
    );
}
