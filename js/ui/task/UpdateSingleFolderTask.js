Ext.namespace('ui','ui.task','ui.task._UpdateSingleFolderTask');

ui.task._UpdateSingleFolderTask.getUpdateFolderResponse = function(node)
{
    XHR({
        params  : {
            task: 'getUpdateFolderResponse'
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            ui.task._UpdateSingleFolderTask.afterUpdate(o, node);
        }
    });
}

ui.task._UpdateSingleFolderTask.poll = new Ext.util.DelayedTask(function()
{
    var node = arguments[0],
        u    = node.attributes.id.split('/'),
        FirstFolder, t = new Array();

        u.shift();
        FirstFolder = u[0];

        t.push(node);

    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'project_' + PhDOE.project + '_' + FirstFolder + '_lock_update_folder'
        },
        success : function()
        {
            ui.task._UpdateSingleFolderTask.poll.delay(5000, null, this, t);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            if (o && o.success === false) {
                new ui.task._UpdateSingleFolderTask.getUpdateFolderResponse(node);

            } else {
                ui.task._UpdateSingleFolderTask.poll.delay(5000, null, this, t);
            }
        }
    });
});

ui.task._UpdateSingleFolderTask.afterUpdate = function(o, node)
{
    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // TODO: we must handle the response here
    var r = Ext.util.JSON.decode(o.result);

    // We reload and highlight the modified node
    node.reload(function() {

        Ext.iterate(r.newFiles, function(prop, val){
            node.findChild('text', prop).getUI().addClass('treeFileUpdated');
        });

    }, this);

    // Reload all store
    PhDOE.reloadAllStore();

};

ui.task._UpdateSingleFolderTask.update = function(node)
{
    var t = new Array();
    t.push(node);

    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until update this folder...')
    );

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task : 'updateFolder',
            path : node.id
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            ui.task._UpdateSingleFolderTask.afterUpdate(o, node);
        },
        failure : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            if (o && o.success === false) {
                // Re-enable TaskPing
                ui.task.PingTask.getInstance().delay(30000);
                Ext.getBody().unmask();
                PhDOE.winForbidden();
            } else {
                // take over 30sec (max Keep-Alive time)
                // poll every XX secondes if the update is finish
                ui.task._UpdateSingleFolderTask.poll.delay(5000, null, this, t);
            }
        }
    });
};

ui.task.UpdateSingleFolderTask = function(node)
{
    // If the user don't have karma, we don't update anything
    if (!PhDOE.user.haveKarma) {
        Ext.getCmp('winVCSCommit').close();
        PhDOE.winForbidden();
        return;
    }
    ui.task._UpdateSingleFolderTask.update(node);
};
