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

                    // Is there an update in progress ?
                    this.onUpdateData(o.updateData);

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

ui.task.PingTask.prototype.onUpdateData = function(statut)
{
    var libelStatut;

    if( statut )
    {
        switch(statut) {
            case 'vcs_update':
                libelStatut = _('1/8 - VCS update');
                break;
            case 'cleanUp_DB':
                libelStatut = _('2/8 - Cleaning the database');
                break;
            case 'revcheck':
                libelStatut = _('3/8 - Apply the revcheck');
                break;
            case 'checkErrors':
                libelStatut = _('4/8 - Check for errors');
                break;
            case 'notInEN':
                libelStatut = _('5/8 - Searching for files that are not in EN');
                break;
            case 'updateTranslatorInfo':
                libelStatut = _('6/8 - Update translators info');
                break;
            case 'ComputeAllStatistics':
                libelStatut = _('7/8 - Compute all statistics');
                break;
            case 'StaticRevcheck':
                libelStatut = _('8/8 - Generate statics revcheck\'s pages');
                break;
        };


        if( ! PhDOE.updateDataProgress )
        {
            PhDOE.updateDataProgress = new Ext.Window({
                title: _('Update in progress'),
                iconCls: 'iconLoading',
                layout:'border',
                width: 400,
                height: 130,
                closable: false,
                plain: true,
                border: false,
                modal: true,
                resizable: false,
                draggable: false,
                items: [{
                    region:'center',
                    xtype:'container',
                    height: 90,
                    id:'win-global-update-info',
                    html: _('There is a global update in progress.<br/>Please, wait...<br/><br/><em>This window will close automatically at the end of the process</em>'),
                    margins: '10 10 10 10'
                },{
                    region:'south',
                    xtype: 'panel',
                    plain: true,
                    height: 22,
                    items: [{
                        xtype:'progress',
                        width:386,
                        text: libelStatut
                    }]

                }]
            });
            PhDOE.updateDataProgress.items.items[1].items.items[0].wait({
                interval:200,
                increment:15,
                animate: true
            });

            PhDOE.updateDataProgress.show();
            PhDOE.updateDataProgress.items.items[1].items.items[0].updateText(libelStatut);
        } else {
            PhDOE.updateDataProgress.show();
            PhDOE.updateDataProgress.items.items[1].items.items[0].updateText(libelStatut);
        }
        //PhDOE.updateDataProgress.doLayout();

    } else {
        if( PhDOE.updateDataProgress )
        {
            PhDOE.updateDataProgress.hide();
        }
    }
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
