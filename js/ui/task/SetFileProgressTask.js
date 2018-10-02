Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.SetFileProgressTask = function(config)
{
    Ext.apply(this, config);

    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task     : 'SetFileProgress',
            idDB     : this.idDB,
            progress : this.progress
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText),
                mess;

            if( o.err ) {
                if( o.err == 'file_dont_exist_in_workInProgress' ) {
                    mess = _('The file you want to change the estimated progress don\'t exist into the database.');
                }
                if( o.err == 'file_isnt_owned_by_current_user' ) {
                    mess = _('The file you want to change the estimated progress isn\'t own by you.<br>You only can modify this information for yours files.');
                }
            }

            if( mess ) {
                PhDOE.notify('error', _('Error'), mess);
            }
        }
    });
};
