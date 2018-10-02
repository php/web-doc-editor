Ext.namespace('ui','ui.task','ui.task._VCSCommitTask');

ui.task._VCSCommitTask.getCommitResponse = function()
{
    XHR({
        params  : {
            task : 'getCommitResponse'
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
            lockFile : 'project_' + PhDOE.project + '_lock_'+ PhDOE.user.login +'_commit'
        },
        success : function()
        {
            ui.task._VCSCommitTask.poll.delay(5000);
        },
        failure : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText);

            if (o && o.success === false) {
                new ui.task._VCSCommitTask.getCommitResponse();

            } else {
                ui.task._VCSCommitTask.poll.delay(5000);
            }
        }
    });
});

ui.task._VCSCommitTask.afterCommit = function(mess)
{
    Ext.getBody().unmask();

    // Re-enable TaskPing
    ui.task.PingTask.getInstance().delay(30000);

    // Display commit output message
    new Ext.Window({
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
    PhDOE.reloadAllStore();

};

ui.task._VCSCommitTask.commit = function(files, patchID)
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until commit...')
    );

    var nodes = [], node, LogMessage, i;

    // Go for VCS commit
    for (i = 0; i < files.length; i = i + 1)
    {
        node = Ext.getCmp('commit-grid-panel').store.getById(files[i].id);
        nodes.push(parseInt(node.data.FileDBID, 10));
    }

    // We must choose at least one file
    if( nodes.length == 0 ) {
        Ext.getBody().unmask();

        Ext.MessageBox.show({
           title   : _('Error'),
           msg     : _('You must choose at least one file.'),
           buttons : Ext.MessageBox.OK,
           icon    : Ext.MessageBox.ERROR
        });

        return;
    }

    // Get log message
    LogMessage = Ext.getCmp('form-commit-message-log').getValue();

    // The LogMessage is required
    LogMessage = Ext.util.Format.trim(LogMessage);

    if( Ext.isEmpty(LogMessage) ) {

        Ext.getBody().unmask();

        Ext.getCmp('form-commit-message-log').markInvalid(_('The log message is required.'));

        Ext.MessageBox.show({
           title   : _('Error'),
           msg     : _('The log message is required.'),
           buttons : Ext.MessageBox.OK,
           icon    : Ext.MessageBox.ERROR
        });

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
            logMessage : LogMessage,
            patchID    : patchID
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);

            ui.task._VCSCommitTask.afterCommit(o.mess);
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
                // poll every XX secondes if the check build is finish
                ui.task._VCSCommitTask.poll.delay(5000);
            }
        }
    });
};

ui.task.VCSCommitTask = function(config)
{
    // If the user is anonymous, we don't commit anything
    if (!PhDOE.user.haveKarma) {
        Ext.getCmp('winVCSCommit').close();
        PhDOE.winForbidden();

        return;
    }

    var files         = Ext.getCmp('commit-grid-panel').selModel.getSelections(),
        NeedToBeClose = [],
        checkNode, paneID_AF, paneID_FE, paneID_FNU, paneID_FNIEN, paneID_FNR, paneID_FNT, paneID, labelNeedToBeClose = '', i, j;

    for (i = 0; i < files.length; ++i) {
        checkNode = files[i].data;

        paneID_AF    = 'AF-'    + Ext.util.md5('AF-'    + checkNode.path + checkNode.name);
        paneID_FE    = 'FE-'    + Ext.util.md5('FE-'    + checkNode.path + checkNode.name);
        paneID_FNU   = 'FNU-'   + Ext.util.md5('FNU-'   + checkNode.path + checkNode.name);
        paneID_FNIEN = 'FNIEN-' + Ext.util.md5('FNIEN-' + checkNode.path + checkNode.name);
        paneID_FNR   = 'FNR-'   + Ext.util.md5('FNR-'   + checkNode.path + checkNode.name);
        paneID_FNT   = 'FNT-'   + Ext.util.md5('FNT-'   + checkNode.path + checkNode.name);

        if ( Ext.getCmp('main-panel').findById(paneID_AF)    ||
             Ext.getCmp('main-panel').findById(paneID_FE)    ||
             Ext.getCmp('main-panel').findById(paneID_FNIEN) ||
             Ext.getCmp('main-panel').findById(paneID_FNU)   ||
             Ext.getCmp('main-panel').findById(paneID_FNR)   ||
             Ext.getCmp('main-panel').findById(paneID_FNT) )
        {

            if (Ext.getCmp('main-panel').findById(paneID_AF)) {
                paneID = paneID_AF;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FE)) {
                paneID = paneID_FE;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNU)) {
                paneID = paneID_FNU;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNIEN)) {
                paneID = paneID_FNIEN;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNR)) {
                paneID = paneID_FNR;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNT)) {
                paneID = paneID_FNT;
            }

            NeedToBeClose.push([paneID, checkNode.name]);
        }
    }

    if (NeedToBeClose.length > 0) {
        for ( j = 0; j < NeedToBeClose.length; ++j ) {
            labelNeedToBeClose += NeedToBeClose[j][1] + '<br/>';
        }

        Ext.MessageBox.show({
            title   :  _('Warning'),
            icon    : Ext.MessageBox.INFO,
            buttons : Ext.MessageBox.YESNOCANCEL,
            msg     : (NeedToBeClose.length > 1) ? String.format(
                        _('There are {0} files to close before commit.<br><br>{1}<br/><br/>Would you like me to close them for you ?'),
                        NeedToBeClose.length, labelNeedToBeClose)
                    : String.format(
                        _('There is {0} file to close before commit.<br><br>{1}<br/><br/>Would you like me to close it for you ?'),
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
        ui.task._VCSCommitTask.commit(files, config.patchID);
    }
};
