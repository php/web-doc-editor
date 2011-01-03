Ext.namespace('ui','ui.task','ui.task._CheckBuildTask');

ui.task._CheckBuildTask.display = function()
{
    XHR({
        params  : {
            task : 'getLogFile',
            file : 'project_' + PhDOE.project + '_log_check_build_' + PhDOE.user.lang
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            Ext.getBody().unmask();

            // Re-enable TaskPing
            ui.task.PingTask.getInstance().delay(30000);

            // Display
            if ( Ext.getCmp('main-panel').findById('check_build_panel_' + PhDOE.user.lang) ) {
                Ext.getCmp('main-panel').remove('check_build_panel_' + PhDOE.user.lang);
            }

            Ext.getCmp('main-panel').add({
                xtype      : 'panel',
                id         : 'check_build_panel_' + PhDOE.user.lang,
                title      : String.format(_('Check build result for {0}'),Ext.util.Format.uppercase(PhDOE.user.lang)),
                tabTip     : String.format(_('Check build result for the documentation {0}'), Ext.util.Format.uppercase(PhDOE.user.lang)),
                closable   : true,
                autoScroll : true,
                iconCls    : 'iconCheckBuild',
                html       : '<div class="check-build-content">' + o.mess + '</div>'
            });
            Ext.getCmp('main-panel').setActiveTab('check_build_panel_' + PhDOE.user.lang);
        }
    });
};

ui.task._CheckBuildTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_lock_check_build_' + PhDOE.user.lang
        },
        success : function()
        {
            ui.task._CheckBuildTask.poll.delay(5000);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            if (o && o.success === false) {
                new ui.task._CheckBuildTask.display();
            } else {
                ui.task._CheckBuildTask.poll.delay(5000);
            }
        }
    });
});

ui.task.CheckBuildTask = function()
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until the build is checked...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task       : 'checkBuild',
            xmlDetails : Ext.getCmp('option-xml-details').checked
        },
        success : function()
        {
            new ui.task._CheckBuildTask.display();
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                PhDOE.winForbidden(o.type);
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the check build is finish
                ui.task._CheckBuildTask.poll.delay(5000);
            }
        }
    });
};
