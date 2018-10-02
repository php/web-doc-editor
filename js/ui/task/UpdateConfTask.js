Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.UpdateConfTask = function(config)
{
    Ext.apply(this, config);

    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task      : 'confUpdate',
            module    : this.module,
            itemName  : this.itemName,
            value     : this.value
        },
        success : function()
        {
            // Update userConf object
            PhDOE.user.conf[this.module][this.itemName] = this.value;

            // If we touch this config option, we need to reload this store too
            if( this.module == "newFile" &&  this.itemName == "nbDisplay" ) {
                ui.cmp.PendingTranslateGrid.getInstance().store.reload();
            }
            if( this.module == "needUpdate" &&  this.itemName == "nbDisplay" ) {
                ui.cmp.StaleFileGrid.getInstance().store.reload();
            }
            if( this.module == "error" &&  (this.itemName == "skipNbLiteralTag" || this.itemName == "nbDisplay") ) {
                ui.cmp.ErrorFileGrid.getInstance().store.reload();
            }
            if( this.module == "reviewed" &&  this.itemName == "nbDisplay" ) {
                ui.cmp.PendingReviewGrid.getInstance().store.reload();
            }

            if( this.module == "main" &&  this.itemName == "displayENWork" ) {
                ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(function() {
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
                });
            }

            // Notify
            if( this.notify !== false ) {
                PhDOE.notify('info', _('Option saved'), _('Option has been saved successfully !'));
            }
        }
    });
};
