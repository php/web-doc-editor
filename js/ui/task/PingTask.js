Ext.namespace('ui', 'ui.task', 'ui.task._PingTask');

ui.task.PingTask = function()
{
    this.task = new Ext.util.DelayedTask(function()
    {
        XHR({
            params  : {
                task : 'ping'
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText);

                if (o.ping !== 'pong') {
                    window.location.href = './';
                } else {

                    // We look if there is a modification of the count for all modules. If so, we reload the corresponding module
                    if( PhDOE.userLang !== 'en' ) {

                        var needReloadSummary = false;

                        // We look for modules specifics for translation
                        if( ui.cmp.PendingTranslateGrid.getInstance().store.getTotalCount() != o.totalData.NbPendingTranslate ) {
                            ui.cmp.PendingTranslateGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.StaleFileGrid.getInstance().store.getTotalCount() != o.totalData.NbPendingUpdate ) {
                            ui.cmp.StaleFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.ErrorFileGrid.getInstance().store.getTotalCount() != o.totalData.NbFilesError ) {
                            ui.cmp.ErrorFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.PendingReviewGrid.getInstance().store.getTotalCount() != o.totalData.NbPendingReview ) {
                            ui.cmp.PendingReviewGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.NotInENGrid.getInstance().store.getTotalCount() != o.totalData.NbNotInEn ) {
                            ui.cmp.NotInENGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( needReloadSummary ) {
                            ui.cmp.PortletSummary.getInstance().store.reload();
                        }

                    }

                    // This 3 modules is commun with EN and LANG
                    if( ui.cmp.PendingCommitGrid.getInstance().store.getCount() != o.totalData.NbPendingCommit ) {
                        ui.cmp.PendingCommitGrid.getInstance().store.reload();
                    }

                    if( ui.cmp.PendingPatchGrid.getInstance().store.getCount() != o.totalData.NbPendingPatch ) {
                        ui.cmp.PendingPatchGrid.getInstance().store.reload();
                    }

                    if( o.totalData.lastInfoDate != PhDOE.lastInfoDate ) {
                        ui.cmp.PortletInfo.getInstance().store.reload();
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
};

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
};