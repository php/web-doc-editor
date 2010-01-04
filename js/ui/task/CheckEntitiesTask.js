Ext.namespace('ui','ui.task','ui.task._CheckEntitiesTask');

ui.task._CheckEntitiesTask.display = function()
{
    BtnViewResult = Ext.getCmp('btn-check-entities-view-last-result');

    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // If the tab "view result of check entities" is open, we close it
    if ( Ext.getCmp('main-panel').findById('tab-check-entities' ) ) {
        Ext.getCmp('main-panel').remove('tab-check-entities');
    }
    // We simulate a click onto the Btn to display the result of the check
    BtnViewResult.handler.call(BtnViewResult.scope || BtnViewResult, BtnViewResult);

};

ui.task._CheckEntitiesTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + phpDoc.project + '_lock_check_entities'
        },
        success : function(response)
        {
            ui.task._CheckEntitiesTask.poll.delay(5000);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText), tmp;
            if (o && o.success === false) {
                tmp = new ui.task._CheckEntitiesTask.display();
            } else {
                ui.task._CheckEntitiesTask.poll.delay(5000);
            }
        }
    });
});

ui.task.CheckEntitiesTask = function(config)
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until entities are checked...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task       : 'checkEntities'
        },
        success : function(response)
        {
            var tmp = new ui.task._CheckEntitiesTask.display();
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                phpDoc.winForbidden();
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the check build is finish
                ui.task._CheckEntitiesTask.poll.delay(5000);
            }
        }
    });
};
