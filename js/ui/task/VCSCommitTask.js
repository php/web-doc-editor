Ext.namespace('ui','ui.task','ui.task._VCSCommitTask');

ui.task._VCSCommitTask.getCommitResponse = function()
{
    XHR({
        params  : {
            task: 'getCommitResponse'
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);
            
            ui.task._VCSCommitTask.afterCommit(o.mess);
        }
    });
}

ui.task._VCSCommitTask.poll = new Ext.util.DelayedTask(function()
{
    XHR({
        params  : {
            task     : 'checkLockFile',
            lockFile : 'lock_'+ phpDoc.userLogin +'_commit'
        },
        success : function(response)
        {
            ui.task._VCSCommitTask.poll.delay(5000);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText), tmp;
            
            if (o && o.success === false) {
                tmp = new ui.task._VCSCommitTask.getCommitResponse();

            } else {
                ui.task._VCSCommitTask.poll.delay(5000);
            }
        }
    });
});

ui.task._VCSCommitTask.afterCommit = function(mess)
{
    var mess, tmp;

    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // Display commit output message
    tmp = new Ext.Window({
        title      : _('Status'),
        width      : 450,
        height     : 350,
        resizable  : false,
        modal      : true,
        autoScroll : true,
        bodyStyle  : 'background-color: white; padding: 5px;',
        html       : mess.join("<br/>"),
        buttons    : [{
            text    : _('Close'),
            handler : function()
            {
                this.ownerCt.ownerCt.close();
            }
        }]
    }).show();

    // Reload all store
    phpDoc.reloadAllStore();

}

ui.task._VCSCommitTask.commit = function(files)
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until commit...')
    );

    var nodes = [], node, LogMessage, tmp, i;

    // Go for VCS commit
    for (i = 0; i < files.length; i = i + 1) {

        node = Ext.getCmp('commit-tree-panel').getNodeById(files[i].id);
        nodes.push(node.attributes.FileDBID);
    }

    // Get log message
    LogMessage = Ext.getCmp('form-commit-message-log').getValue();

    // The LogMessage is required
    LogMessage = Ext.util.Format.trim(LogMessage);

    if( Ext.isEmpty(LogMessage) ) {

        Ext.getBody().unmask();

        Ext.getCmp('form-commit-message-log').markInvalid(_('The log message is required.'));

        Ext.MessageBox.alert(
            _('Error'),
            _('The log message is required.')
        );
        return;
    }

    // Close this window
    Ext.getCmp('winVCSCommit').close();

    // We need to stop ping test during this process
    ui.task.PingTask.getInstance().cancel();

    XHR({
        params  : {
            task       : 'vcsCommit',
            nodes      : Ext.util.JSON.encode(nodes),
            logMessage : LogMessage
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);
            
            ui.task._VCSCommitTask.afterCommit(o.mess);
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
                ui.task._VCSCommitTask.poll.delay(5000);
            }
        }
    });
};

ui.task.VCSCommitTask = function()
{
    // If the user is anonymous, we don't commit anything
    if (phpDoc.userLogin === 'anonymous') {
        Ext.getCmp('winVCSCommit').close();
        phpDoc.winForbidden();

        return;
    }

    var files         = Ext.getCmp('commit-tree-panel').getChecked(),
        NeedToBeClose = [],
        checkNode, paneID_FE, paneID_FNU, paneID_FNR, paneID_FNT, paneID, labelNeedToBeClose = '', i;

    for (i = 0; i < files.length; ++i) {
        checkNode = files[i].attributes;

        paneID_FE  = 'FE-'  + Ext.util.md5('FE-'  + checkNode.FilePath + checkNode.FileName);
        paneID_FNU = 'FNU-' + Ext.util.md5('FNU-' + checkNode.FilePath + checkNode.FileName);
        paneID_FNR = 'FNR-' + Ext.util.md5('FNR-' + checkNode.FilePath + checkNode.FileName);
        paneID_FNT = 'FNT-' + Ext.util.md5('FNT-' + checkNode.FilePath + checkNode.FileName);

        if ( Ext.getCmp('main-panel').findById(paneID_FE) || Ext.getCmp('main-panel').findById(paneID_FNU) || Ext.getCmp('main-panel').findById(paneID_FNR) || Ext.getCmp('main-panel').findById(paneID_FNT) ) {

            if (Ext.getCmp('main-panel').findById(paneID_FE)) {
                paneID = paneID_FE;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNU)) {
                paneID = paneID_FNU;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNR)) {
                paneID = paneID_FNR;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNT)) {
                paneID = paneID_FNT;
            }

            NeedToBeClose.push([paneID, checkNode.FileName]);
        }
    }

    if (NeedToBeClose.length > 0) {
        for (var j = 0; j < NeedToBeClose.length; ++j) {
            labelNeedToBeClose += NeedToBeClose[j][1] + '<br/>';
        }

        Ext.MessageBox.show({
            title   : 'Warning',
            icon    : Ext.MessageBox.INFO,
            buttons : Ext.MessageBox.YESNOCANCEL,
            msg     : (NeedToBeClose.length > 1) ? String.format(
                        _('There is {0} files to close before commit.<br><br>' +
                          '{1}<br/><br/>Would you like I close it for you ?'),
                        NeedToBeClose.length, labelNeedToBeClose)
                    : String.format(
                        _('There is {0} file to close before commit.<br><br>' +
                          '{1}<br/><br/>Would you like I close it for you ?'),
                          NeedToBeClose.length, labelNeedToBeClose),
            fn : function(btn)
            {
                if (btn === 'yes') {
                    for (var j = 0; j < NeedToBeClose.length; ++j) {
                        Ext.getCmp('main-panel').remove(NeedToBeClose[j][0]);
                    }

                    ui.task._VCSCommitTask.commit(files);
                }
            }
        });
    } else {
        ui.task._VCSCommitTask.commit(files);
    }
};
