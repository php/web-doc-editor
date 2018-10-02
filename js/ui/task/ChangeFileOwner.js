Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.ChangeFileOwner = function(config)
{
    Ext.apply(this, config);

    var msg = Ext.MessageBox.wait(_('Saving data...'));

    XHR({
        scope  : this,
        params : {
            task        : 'setFileOwner',
            fileIdDB    : this.fileIdDB,
            newOwnerID  : this.newOwnerID
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // We reload 2 stores to reflect this change
            ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(function() {
                ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
            });

            // We reload the information Portlet to reflect this change
            ui.cmp.PortletInfo.getInstance().store.reload();

            // Remove wait msg
            msg.hide();

            if( Ext.isDefined(this.fromType) && this.fromType === 'tab') {
                Ext.getCmp('main-panel').remove(this.from.curTab);
            }

            this.from.close();

            // Notify
            PhDOE.notify('info', _('Owner changed'), _('The owner for this file have been changed successfully !'));
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            // Remove wait msg
            msg.hide();
            PhDOE.winForbidden(o.type);

            if( Ext.isDefined(this.fromType) && this.fromType === 'tab') {
                Ext.getCmp('main-panel').remove(this.from.curTab);
            }

            this.from.close();
        }
    });
};
