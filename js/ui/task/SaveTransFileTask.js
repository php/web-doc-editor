Ext.namespace('ui', 'ui.task');

// config - {prefix, ftype, fid, fpath, fname, lang, storeRecord}
ui.task.SaveTransFileTask = function(config){
    Ext.apply(this, config);
    
    var id_prefix = this.prefix + '-' + this.ftype, msg = Ext.MessageBox.wait(_('Saving data...'));
    
    XHR({
        scope: this,
        params: {
            task: 'saveFile',
            type: 'trans',
            filePath: this.fpath,
            fileName: this.fname,
            fileLang: this.lang,
            fileContent: Ext.getCmp(this.prefix + '-' + this.ftype +
            '-FILE-' +
            this.fid).getCode()
        },
        
        success: function(r){
            var o = Ext.util.JSON.decode(r.responseText);
            
            if (this.ftype != 'NEW') {
                this.storeRecord.set('fileModified', '{"user":"' + PhDOE.user.login + '", "anonymousIdent":"' + PhDOE.user.anonymousIdent + '"}');
                this.storeRecord.commit();
            }
            else {
                this.storeRecord.data.node.reload();
            }
            
            // Add this files into WorkTreeGrid
            ui.cmp.WorkTreeGrid.getInstance().addRecord(o.id, this.lang + this.fpath, this.fname, 'new');
            
            // reset file
            Ext.getCmp(id_prefix + '-FILE-' + this.fid + '-btn-save').disable();
            Ext.getCmp(id_prefix + '-FILE-' + this.fid).isModified = false;
            
            Ext.getCmp(id_prefix + '-PANEL-' + this.fid).setTitle(Ext.getCmp(id_prefix + '-PANEL-' + this.fid).originTitle);
            // reset tab-panel
            Ext.getCmp(this.prefix + '-' + this.fid).setTitle(Ext.getCmp(this.prefix + '-' + this.fid).originTitle);
            
            // Remove wait msg
            msg.hide();
            
            // Notify
            PhDOE.notify('info', _('Document saved'), String.format(_('Document <br><br><b>{0}</b><br><br> was saved successfully !'), this.lang + this.fpath + this.fname));
        },
        
        failure: function(r){
            var o = Ext.util.JSON.decode(r.responseText);
            
            // Remove wait msg
            msg.hide();
            if (o.type) {
                PhDOE.winForbidden(o.type);
            }
            else {
                PhDOE.winForbidden();
            }
        }
    });
};
