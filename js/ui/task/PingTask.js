Ext.namespace('ui', 'ui.task');

ui.task.PingTask = function()
{
    ui.task.PingTask.instance = this;
    this.task = new Ext.util.DelayedTask(function()
    {
        XHR({
            url     : './php/controller.php',
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

    // delegate
    this.delay = function(delay, newFn, newScope, newArgs)
    {
        this.task.delay(delay, newFn, newScope, newArgs);
    };

    // delegate
    this.cancel = function()
    {
        this.task.cancel();
    };
}
ui.task.PingTask.prototype.instance = null;
