Ext.namespace('ui','ui.task','ui.task._CheckBuildTask');

ui.task._CheckBuildTask.display = function()
{
    XHR({
        url     : './php/controller.php',
        params  : {
            task : 'getLogFile',
            file : 'log_check_build'
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            Ext.getBody().unmask();

            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Display
            if ( Ext.getCmp('main-panel').findById('check_build_panel') ) {
                Ext.getCmp('main-panel').remove('check_build_panel');
            }

            Ext.getCmp('main-panel').add({
                xtype      : 'panel',
                id         : 'check_build_panel',
                title      : _('Check Build Result'),
                closable   : true,
                autoScroll : true,
                iconCls    : 'checkBuild',
                html       : '<div class="check-build-content">' + o.mess + '</div>'
            });
            Ext.getCmp('main-panel').setActiveTab('check_build_panel');
        }
    });
}

ui.task._CheckBuildTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        url     : './php/controller.php',
        params  : {
            task     : 'checkLockFile',
            lockFile : 'lock_check_build'
        },
        success : function(response)
        {
            ui.task._CheckBuildTask.poll.delay(5000);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);
            if (o && o.success === false) {
                new ui.task._CheckBuildTask.display();
            } else {
                ui.task._CheckBuildTask.poll.delay(5000);
            }
        }
    });
});

ui.task.CheckBuildTask = function(config)
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until the build is checked...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        url     : './php/controller.php',
        params  : {
            task       : 'checkBuild',
            xmlDetails : Ext.getCmp('option-xml-details').checked
        },
        success : function(response)
        {
            new ui.task._CheckBuildTask.display();
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
                ui.task._CheckBuildTask.poll.delay(5000);
            }
        }
    });
}
