Ext.namespace('ui', 'ui.task', 'ui.task._PingTask');

ui.task.PingTask = function()
{
    this.task = new Ext.util.DelayedTask(function()
    {
        XHR({
            params  : { task : 'ping' },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText),
                    dt;
                if (o.ping !== 'pong') {
                    window.location.href = './';
                } else {

                    // We look if there is an update_data in progress or not
                    if( o.lastupdatedata === 'in_progress' ) {
                        Ext.getDom('Info-LastUpdateData').innerHTML = _('update in progress...');
                    } else if( o.lastupdatedata !== '-' ) {
                        dt = Date.parseDate(o.lastupdatedata, "Y-m-d H:i:s");

                        // We update the lastupdate date/time
                        Ext.getDom('Info-LastUpdateData').innerHTML = dt.format(_('Y-m-d, H:i'));
                    } else {
                        Ext.getDom('Info-LastUpdateData').innerHTML = '-';
                    }

                    // We look if there is an check_entities in progress or not
                    if( o.lastcheckentities === 'in_progress' ) {
                        Ext.getDom('Info-LastCheckEntities').innerHTML = _('check in progress...');
                    } else if( o.lastcheckentities !== '-' ) {
                        dt = Date.parseDate(o.lastcheckentities, "Y-m-d H:i:s");

                        // We update the lastupdate date/time
                        Ext.getDom('Info-LastCheckEntities').innerHTML = dt.format(_('Y-m-d, H:i'));
                    } else {
                        Ext.getDom('Info-LastCheckEntities').innerHTML = '-';
                    }

                    // We look if there is a modification of the count for all modules. If so, we reload the corresponding module
                    if( PhDOE.userLang !== 'en' ) {

                        var needReloadSummary = false;

                        // We look for modules specifics for translation
                        if( ui.component.PendingTranslateGrid.getInstance().store.getTotalCount() != o.totalData.NbPendingTranslate ) {
                            ui.component.PendingTranslateGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.component.StaleFileGrid.getInstance().store.getTotalCount() != o.totalData.NbPendingUpdate ) {
                            ui.component.StaleFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.component.ErrorFileGrid.getInstance().store.getTotalCount() != o.totalData.NbFilesError ) {
                            ui.component.ErrorFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.component.PendingReviewGrid.getInstance().store.getTotalCount() != o.totalData.NbPendingReview ) {
                            ui.component.PendingReviewGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.component.NotInENGrid.getInstance().store.getTotalCount() != o.totalData.NbNotInEn ) {
                            ui.component.NotInENGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( needReloadSummary ) {
                            ui.component.PortletSummary.getInstance().store.reload();
                        }

                    }

                    // This 2 modules is commun with EN and LANG
                    if( ui.component.PendingCommitGrid.getInstance().store.getCount() != o.totalData.NbPendingCommit ) {
                        ui.component.PendingCommitGrid.getInstance().store.reload();
                    }

                    if( ui.component.PendingPatchGrid.getInstance().store.getCount() != o.totalData.NbPendingPatch ) {
                        ui.component.PendingPatchGrid.getInstance().store.reload();
                    }
                }
            },
            failure: function()
            {
                // TODO: Handle when we loose the connection. Actually, there is a lot of error who are return from the controller
                //window.location.href = './';
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
