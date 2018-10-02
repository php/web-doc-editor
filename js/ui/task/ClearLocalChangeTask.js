Ext.namespace('ui','ui.task');

// config - { ftype, fpath, fname, noConfirm }
ui.task.ClearLocalChangeTask = function(config)
{
    Ext.apply(this, config);

    var ftype = this.ftype,
        fpath = this.fpath,
        fname = this.fname;


    goClear = function() {
        Ext.getBody().mask(
            '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
            _('Please, wait...')
        );

        // Before clear local change, we close the file if there is open

        var panel = ["FNT", "FNU", "FE", "FNR", "FNIEN", "AF"];

        for( var i=0; i < panel.length; i++) {
            if (Ext.getCmp('main-panel').findById(panel[i] + '-' + Ext.util.md5(panel[i] + '-' + fpath + fname))) {
                Ext.getCmp('main-panel').remove(  panel[i] + '-' + Ext.util.md5(panel[i] + '-' + fpath + fname));
            }
        }

        XHR({
            params : {
                task     : 'clearLocalChange',
                FileType : ftype,
                FilePath : fpath,
                FileName : fname
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText),
                    node;

                // We delete this record from the work in progress module
                ui.cmp.WorkTreeGrid.getInstance().delRecord(o.oldIdDB);
                // .. and Patches module
                ui.cmp.PatchesTreeGrid.getInstance().delRecord(o.oldIdDB);

                /** Common action for EN and LANG file **/

                // find open node in All Files modules
                node = false;
                node = ui.cmp.RepositoryTree.getInstance().getNodeById('/'+fpath+fname);
                if (node) {
                    node.getUI().removeClass(['fileModifiedByMe','fileModifiedByAnother']);
                }

                /** Action for EN file **/
                if( o.lang === 'en' && ftype === 'update' ) {

                    // trow StaleFile store
                    ui.cmp.StaleFileGrid.getInstance().store.each(
                        function(record)
                        {
                            if ((record.data.path) === '/'+o.path && record.data.name === o.name ) {
                                record.set('fileModifiedEN', false);
                                record.set('en_revision', o.revision);
                                record.commit();
                            }
                        }, this);

                    // Browse FileError
                    ui.cmp.ErrorFileGrid.getInstance().store.each(
                        function(record)
                        {
                            if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                                record.set('fileModifiedEN', false);
                            }
                        }, this);


                    Ext.getBody().unmask();
                    return;
                }

                /** All after this is only available for LANG file  **/

                // We try to search in others stores if this file is marked as needCommit

                // Browse PendingTranslate store
                ui.cmp.PendingTranslateGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModified', false);
                            record.commit();
                        }
                    }, this);

                // Browse StaleFile store
                ui.cmp.StaleFileGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModifiedLang', false);
                            record.set('revision', o.revision);
                            record.set('maintainer', o.maintainer);
                            record.commit();
                        }
                    }, this);

                // Browse FileError
                ui.cmp.ErrorFileGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModifiedLang', false);
                            record.commit();
                        }
                    }, this);

                // Browse storeFilesNeedReviewed
                ui.cmp.PendingReviewGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModifiedLang', false);
                            record.commit();
                        }
                    }, this);

                // Browse storeNotInEn
                ui.cmp.NotInENGrid.getInstance().store.each(
                    function(record)
                    {
                        if ((PhDOE.user.lang+record.data.path) === fpath && record.data.name === fname ) {
                            record.set('fileModified', false);
                        }
                    }, this);

                Ext.getBody().unmask();
            },

            failure : function(r)
            {
                Ext.getBody().unmask();

                var o = Ext.util.JSON.decode(r.responseText);

                if( o.err ) {
                    PhDOE.winForbidden(o.err);
                }
            }
        });
    };

    if( Ext.isDefined(this.noConfirm) ) {
        goClear();
    } else {
        Ext.MessageBox.confirm(
            _('Confirm'),
            _('This action will clear your local modification and take back this file from his original stats.<br/>You need confirm.'),
            function(btn)
            {
                if (btn === 'yes') {
                    goClear();
                }
            }, this
        );
    }
};
