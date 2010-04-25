Ext.namespace('ui','ui.task');

// config - { prefix, ftype, fpath, fname, fid, lang, email }
ui.task.SavePatchTask = function(config)
{
    Ext.apply(this, config);

    var id_prefix = this.prefix + '-' + this.ftype,
        msg       = Ext.MessageBox.wait(_('Saving data as a patch...'));

    Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-saveas').disable();
    Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;

    Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(
        Ext.getCmp(id_prefix + '-PANEL-' + this.fid).permlink +
        Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle
    );

    if ( ( this.prefix === 'AF')  ||
         ( this.prefix === 'FNT') ||
         ( this.lang === 'en' && !Ext.getCmp(this.prefix+'-LANG-FILE-'+this.fid).isModified ) ||
         ( this.lang !== 'en' && !Ext.getCmp(this.prefix+'-EN-FILE-'+this.fid).isModified )
       ) {
        Ext.getCmp(this.prefix + '-' + this.fid).setTitle(
            Ext.getCmp(this.prefix + '-' + this.fid).originTitle
        );
    }

    // We save this patch
    XHR({
        scope  : this,
        params : {
            task        : 'saveFile',
            filePath    : this.fpath,
            fileName    : this.fname,
            fileLang    : this.lang,
            fileContent : Ext.getCmp(id_prefix + '-FILE-' + this.fid).getCode(),
            type        : 'patch',
            emailAlert  : this.email
        },

        success : function(r)
        {
            var o    = Ext.util.JSON.decode(r.responseText),
                grid = ui.cmp.PendingPatchGrid.getInstance();

            // Add this files into storePendingPatch
            grid.store.insert(0,
                new grid.store.recordType({
                    id     : Ext.id('', ''),
                    path   : this.lang + this.fpath,
                    name   : this.fname,
                    by     : PhDOE.userLogin,
                    uniqID : o.uniqId,
                    date   : new Date()
                })
            );

            // Remove wait msg
            msg.hide();

            // Notify
            PhDOE.notify('info', _('Patch saved'), _('Patch saved successfully !'));
        },

        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            // Remove wait msg
            msg.hide();
            if( o.type ) {
                PhDOE.winForbidden(o.type);
            } else {
                PhDOE.winForbidden();
            }
        }
    });
};