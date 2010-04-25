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

                var panel = ["FNT", "FNU", "FE", "FNR", "FNIEN", "AF"];

                for( var i=0; i < panel.length; i++) {
                    if (Ext.getCmp('main-panel').findById(panel[i] + '-' + Ext.util.md5(panel[i] + '-' + this.fpath + this.fname))) {
                        Ext.getCmp('main-panel').remove(  panel[i] + '-' + Ext.util.md5(panel[i] + '-' + this.fpath + this.fname));
                    }
                }

                XHR({
                    scope  : this,
                    params : {
                        task     : 'clearLocalChange',
                        FileType : this.ftype,
                        FilePath : this.fpath,
                        FileName : this.fname
                    },
                    success : function(r)
                    {
                        var pending_commit_grid = ui.cmp.PendingCommitGrid.getInstance(),
                            o                   = Ext.util.JSON.decode(r.responseText),
                            node;

                        // We delete this record from the pending commit store
                        pending_commit_grid.store.remove(this.storeRecord);

                        // We fire event datachanged to update the file count
                        pending_commit_grid.store.fireEvent('datachanged', pending_commit_grid.store);

                        // Action for EN file
                        if( o.lang === 'en' && this.ftype === 'update' ) {

                            // trow StaleFile store
                            ui.cmp.StaleFileGrid.getInstance().store.each(
                                function(record)
                                {
                                    if ((record.data.path) === '/'+o.path && record.data.name === o.name ) {
                                        record.set('needCommitEN', false);
                                        record.set('en_revision', o.revision);
                                        record.commit();
                                    }
                                }, this);

                            // Browse FileError
                            ui.cmp.ErrorFileGrid.getInstance().store.each(
                                function(record)
                                {
                                    if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                        record.set('needcommit', false);
                                    }
                                }, this);

                            // find open node in All Files modules
                            node = false;
                            node = ui.cmp.RepositoryTree.getInstance().getNodeById('/'+this.fpath+this.fname);
                            if (node) {
                              node.getUI().removeClass('modified');
                            }

                            Ext.getBody().unmask();
                            return;
                        }

                        // All after this is only available for LANG file

                        // We try to search in others stores if this file is marked as needCommit

                        // Browse PendingTranslate store
                        ui.cmp.PendingTranslateGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needcommit', false);
                                }
                            }, this);

                        // Browse StaleFile store
                        ui.cmp.StaleFileGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needCommitLang', false);
                                    record.set('revision', o.revision);
                                    record.set('maintainer', o.maintainer);
                                    record.commit();
                                }
                            }, this);

                        // Browse storeFilesNeedReviewed
                        ui.cmp.PendingReviewGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needcommit', false);
                                }
                            }, this);

                        // Browse storeNotInEn
                        ui.cmp.NotInENGrid.getInstance().store.each(
                            function(record)
                            {
                                if ((PhDOE.userLang+record.data.path) === this.fpath && record.data.name === this.fname ) {
                                    record.set('needcommit', false);
                                }
                            }, this);

                        // find open node in All Files modules
                        node = false;
                        node = ui.cmp.RepositoryTree.getInstance().getNodeById('/'+this.fpath+this.fname);
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