Ext.namespace('ui', 'ui.task', 'ui.task._PingTask');

ui.task.PingTask = function()
{
    this.task = new Ext.util.DelayedTask(function()
    {
        XHR({
            params  : { task : 'ping' },
            success : function(response)
            {
                var o = Ext.util.JSON.decode(response.responseText);
                if (o.ping !== 'pong') {
                    window.location.href = './';
                } else {

                    if( o.lastupdate === 'in_progress' ) {
                        Ext.getDom('lastUpdateTime').innerHTML = _('update in progress...');
                    } else {
                        var dt = Date.parseDate(o.lastupdate, "Y-m-d H:i:s");

                        // We update the lastupdate date/time
                        Ext.getDom('lastUpdateTime').innerHTML = dt.format(_('Y-m-d, H:i'));
                    }
                }
            },
            failure: function()
            {
                window.location.href = './';
            }
        });
        this.task.delay(30000);
    }, this);
}

// delegates
ui.task.PingTask.prototype.delay = function(delay, newFn, newScope, newArgs)
{
    this.task.delay(delay, newFn, newScope, newArgs);
};
ui.task.PingTask.prototype.cancel = function()
{
    this.task.cancel();
};

// singleton
ui.task._PingTask.instance = null;
ui.task.PingTask.getInstance = function()
{
    if (!ui.task._PingTask.instance) {
        ui.task._PingTask.instance = new ui.task.PingTask();
    }
    return ui.task._PingTask.instance;
}
