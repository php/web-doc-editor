Ext.namespace('ui','ui.task');

// config - { item, value }
ui.task.UpdateConfTask = function(config)
{
    Ext.apply(this, config);

    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task  : 'confUpdate',
            item  : this.item,
            value : this.value
        },
        success : function(response)
        {
            // Update userConf object
            phpDoc.userConf[this.item] = this.value;

            // If we touch this config option, we need to reload this store too
            if( this.item == "errorSkipNbLiteralTag" ) {
                ui.component.ErrorFileGrid.getInstance().store.reload();
            }
            if( this.item == "needUpdateNbDisplay" ) {
                ui.component.StaleFileGrid.getInstance().store.reload();
            }
            if( this.item == "reviewedNbDisplay" ) {
                ui.component.PendingReviewGrid.getInstance().store.reload();
            }
            if( this.item == "newFileNbDisplay" ) {
                ui.component.PendingTranslateGrid.getInstance().store.reload();
            }

            // Notify
            phpDoc.notify('info', _('Option saved'), _('Option has been saved successfully !'));


        }
    });
};
