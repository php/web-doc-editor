Ext.namespace('ui','ui.task','ui.task._VCSCommitTask');

ui.task._VCSCommitTask.commit = function(files)
{
    Ext.getBody().mask(
        '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
        _('Please, wait until commit...')
    );

    var nodes = [], node, LogMessage;

    // Go for VCS commit
    for (var i = 0; i < files.length; i = i + 1) {

        node = Ext.getCmp('commit-tree-panel').getNodeById(files[i]);
        nodes.push(node.attributes.FileDBID);
    }

    // Get log message
    LogMessage = Ext.getCmp('form-commit-message-log').getValue();

    // Close this window
    Ext.getCmp('winVCSCommit').close();

    XHR({
        params  : {
            task       : 'vcsCommit',
            nodes      : Ext.util.JSON.encode(nodes),
            logMessage : LogMessage
        },
        success : function(response)
        {
            var o = Ext.util.JSON.decode(response.responseText), tmp;

            Ext.getBody().unmask();

            // Display commit output message
            tmp = new Ext.Window({
                title      : _('Status'),
                width      : 450,
                height     : 350,
                resizable  : false,
                modal      : true,
                autoScroll : true,
                bodyStyle  : 'background-color: white; padding: 5px;',
                html       : o.mess.join("<br/>"),
                buttons    : [{
                    text    : _('Close'),
                    handler : function()
                    {
                        this.ownerCt.close();
                    }
                }]
            }).show();

            Ext.getBody().mask(
                '<img src="themes/img/loading.gif" style="vertical-align: middle;" /> ' +
                _('Please, wait...')
            );

            // Apply modification
            XHR({
                params  : {
                    task       : 'onSuccesCommit',
                    nodes      : Ext.util.JSON.encode(nodes),
                    logMessage : LogMessage
                },
                success : function(response)
                {
                    if (phpDoc.userLang != 'en') {
                        ui.component.ErrorFileGrid.getInstance().store.reload();
                        ui.component.PendingReviewGrid.getInstance().store.reload();
                        ui.component.StaleFileGrid.getInstance().store.reload();
                    }

                    ui.component.PendingCommitGrid.getInstance().store.reload();
                    ui.component.TranslatorGrid.getInstance().store.reload();
                    ui.component.SummaryGrid.getInstance().store.reload();

                    Ext.getBody().unmask();
                }
            });
        }
    });
};

ui.task.VCSCommitTask = function()
{
    // If the user is cvsread, we don't commit anything
    if (phpDoc.userLogin === 'cvsread') {
        Ext.getCmp('winVCSCommit').close();
        phpDoc.winForbidden();

        return;
    }

    var files         = Ext.getCmp('commit-tree-panel').getValue(),
        NeedToBeClose = [],
        checkNode, paneID_FE, paneID_FNU, paneID_FNR, paneID, labelNeedToBeClose = '';

    for (var i = 0; i < files.length; ++i) {
        checkNode = Ext.getCmp('commit-tree-panel').getNodeById(files[i]).attributes;

        paneID_FE  = 'FE-' + Ext.util.md5('FE-' + checkNode.FilePath + checkNode.FileName);
        paneID_FNU = 'FNU-' + Ext.util.md5('FNU-' + checkNode.FilePath + checkNode.FileName);
        paneID_FNR = 'FNR-' + Ext.util.md5('FNR-' + checkNode.FilePath + checkNode.FileName);

        if (   Ext.getCmp('main-panel').findById(paneID_FE) || Ext.getCmp('main-panel').findById(paneID_FNU) || Ext.getCmp('main-panel').findById(paneID_FNR) ) {
            if (Ext.getCmp('main-panel').findById(paneID_FE)) {
                paneID = paneID_FE;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNU)) {
                paneID = paneID_FNU;
            }
            if (Ext.getCmp('main-panel').findById(paneID_FNR)) {
                paneID = paneID_FNR;
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
