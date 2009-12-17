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

            if( this.item == "errorSkipNbLiteralTag" ) {
                ui.component.ErrorFileGrid.getInstance().store.reload();
            }

        }
    });
};
