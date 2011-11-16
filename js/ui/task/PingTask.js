Ext.namespace('ui', 'ui.task', 'ui.task._PingTask');

ui.task.PingTask = function()
{
    this.task = new Ext.util.DelayedTask(function()
    {
        XHR({
            scope: this,
            params  : {
                task : 'ping'
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText), needReloadSummary;

                if (o.ping !== 'pong') {
                    this.onPingFailed();
                } else {

                    // We look if there is a modification of the count for all modules. If so, we reload the corresponding module
                    if( PhDOE.user.lang !== 'en' ) {

                        needReloadSummary = false;

                        // We look for modules specifics for translation
                        if( ui.cmp.PendingTranslateGrid.getInstance().store.getTotalCount() !== o.totalData.NbPendingTranslate ) {
                            ui.cmp.PendingTranslateGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.StaleFileGrid.getInstance().store.getTotalCount() !== o.totalData.NbPendingUpdate ) {
                            ui.cmp.StaleFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.ErrorFileGrid.getInstance().store.getTotalCount() !== o.totalData.NbFilesError ) {
                            ui.cmp.ErrorFileGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.PendingReviewGrid.getInstance().store.getTotalCount() !== o.totalData.NbPendingReview ) {
                            ui.cmp.PendingReviewGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( ui.cmp.NotInENGrid.getInstance().store.getTotalCount() !== o.totalData.NbNotInEn ) {
                            ui.cmp.NotInENGrid.getInstance().store.reload();
                            needReloadSummary = true;
                        }

                        if( needReloadSummary ) {
                            ui.cmp.PortletSummary.getInstance().store.reload();
                        }

                    }

                    // This 3 modules is commun with EN and LANG
					
					// TODO : find a way to detect modification into WorkTreeGrid & Patches for review
					/*
                    if( ui.cmp.PendingCommitGrid.getInstance().store.getCount() != o.totalData.NbPendingCommit ) {
                        ui.cmp.PendingCommitGrid.getInstance().store.reload();
                    }

                    if( ui.cmp.PendingPatchGrid.getInstance().store.getCount() != o.totalData.NbPendingPatch ) {
                        ui.cmp.PendingPatchGrid.getInstance().store.reload();
                    }
                    */

                    if( o.totalData.lastInfoDate !== PhDOE.lastInfoDate ) {
                        ui.cmp.PortletInfo.getInstance().store.reload();
                    }
                    
                    // Update the topic if necessary
                    if( o.totalData.topicInfo ) {
                        
                        o.totalData.topicInfo.topicDate = Date.parseDate(o.totalData.topicInfo.topicDate, 'Y-m-d H:i:s');
                        o.totalData.topicInfo.topicDate = o.totalData.topicInfo.topicDate.format(_('Y-m-d, H:i'));
                        
                        if( o.totalData.topicInfo.topicDate != PhDOE.topic.topicDate ) {
                            PhDOE.topic.author = o.totalData.topicInfo.author;
                            PhDOE.topic.content = o.totalData.topicInfo.content;
                            PhDOE.topic.topicDate = o.totalData.topicInfo.topicDate;
                            
                            PhDOE.setTopic();
                            
                        }
                    }

                }
            },
            failure: function()
            {
                this.onPingFailed();
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

ui.task.PingTask.prototype.onPingFailed = function()
{
    this.cancel();
    
    var winNotify = new Ext.ux.Notification({
        iconCls     : 'iconError',
        title       : _('Connection lost'),
        html        : String.format(_('Retrying in {0} second(s).'), '30'),
        autoDestroy : false
    });

    winNotify.show(document);
    
    this.delay(30000);
    
    // Timer for the notification
    var timer = 29;
    
    var task = new Ext.util.DelayedTask(function(){
        if( timer > 0 ) {
            winNotify.setMessage(String.format(_('Retrying in {0} second(s).'), timer));
            timer -= 1;
            task.delay(1000);
        } else if( timer == 0 ) {
            winNotify.animHide();
        }
    });
    task.delay(1000);
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