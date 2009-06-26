var phpDoc = function()
{
    Ext.QuickTips.init();
    Ext.BLANK_IMAGE_URL = 'js/extjs/resources/images/default/s.gif';

    return {
        // Store
        storeCommitLogMessage: '', //

        // Variable
        userLogin  : null,
        userLang   : null,
        appName    : 'PhpDocumentation Online Editor',
        appVer     : '0.2',
        uiRevision : '$Revision: 1.64 $',

        userConf : {
            'conf_needupdate_diff'       : 'using-exec',
            'conf_needupdate_scrollbars' : true,
            'conf_needupdate_displaylog' : false,

            'conf_error_skipnbliteraltag' : true,
            'conf_error_scrollbars'       : true,
            'conf_error_displaylog'       : false,

            'conf_reviewed_scrollbars' : true,
            'conf_reviewed_displaylog' : false,

            'conf_allfiles_displaylog' : false,

            'conf_patch_scrollbars' : true,
            'conf_patch_displaylog' : false,

            'conf_theme' : 'themes/empty.css'
        },

        filePendingOpen : '',

        init : function()
        {
            // Stop default contextmenu on all this app
            Ext.getBody().on('contextmenu', function(e) {
                e.stopEvent();
            }, this);

            // We load the configuration for this user
            new ui.task.LoadConfigTask();
        },

        winForbidden : function()
        {
            Ext.MessageBox.alert(
                _('Forbidden'),
                _('You can\'t do this action as cvsread user.')
            );
        },

        loadDataStore: function()
        {
            // Store : Commit log
            this.storeCommitLogMessage = new Ext.data.Store({
                //autoLoad: true,
                proxy: new Ext.data.HttpProxy({
                    url: './php/controller.php'
                }),
                baseParams: {
                    task: 'getCommitLogMessage'
                },
                reader: new Ext.data.JsonReader({
                    root: 'Items',
                    totalProperty: 'nbItems',
                    id: 'id'
                }, [{
                    name: 'id',
                    mapping: 'id'
                }, {
                    name: 'text',
                    mapping: 'text'
                }])
            });

        },

        saveLangFile : function(prefix, ftype, fid, fpath, fname, lang, record)
        {
            if (this.userLogin === 'cvsread') {
                this.winForbidden();
                return;
            }

            if (prefix === 'AF') {
                new ui.task.SaveLangFileTask({
                    prefix      : prefix,
                    ftype       : ftype,
                    fid         : fid,
                    fpath       : fpath,
                    fname       : fname,
                    lang        : lang,
                    storeRecord : record
                });
                return;
            }

            Ext.MessageBox.show({
                title   : _('Confirm'),
                msg     : _('Do you want to check for error before saving?'),
                icon    : Ext.MessageBox.INFO,
                buttons : Ext.MessageBox.YESNOCANCEL,
                fn      : function (btn)
                {
                    if (btn === 'no') {

                        new ui.task.SaveLangFileTask({
                            prefix      : prefix,
                            ftype       : ftype,
                            fid         : fid,
                            fpath       : fpath,
                            fname       : fname,
                            lang        : lang,
                            storeRecord : record
                        });

                    } else if (btn === 'yes') {

                        new ui.task.CheckFileTask({
                            prefix      : prefix,
                            ftype       : ftype,
                            fid         : fid,
                            fpath       : fpath,
                            fname       : fname,
                            lang        : lang,
                            storeRecord : record
                        }); // include SaveLangFileTask when no err
                    }
                }
            });

        },

        // Need confirm if we want to close a tab and the content have been modified.
        removeTabEvent : function(tabpanel, tab)
        {
            var stateLang, stateEn, state, PanType = tab.id.split('-');

            if ((PanType[0] === 'FE' || PanType[0] === 'FNU' || PanType[0] === 'FNR' || PanType[0] === 'PP' || PanType[0] === 'AF') && PanType[1] !== 'help') {

                if (PanType[0] === 'FE') {
                    stateLang = Ext.getCmp('FE-LANG-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNU') {
                    stateLang = Ext.getCmp('FNU-LANG-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNR') {
                    stateLang = Ext.getCmp('FNR-LANG-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'FE') {
                    stateEn = Ext.getCmp('FE-EN-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNU') {
                    stateEn = Ext.getCmp('FNU-EN-FILE-' + PanType[1]).isModified;
                }
                if (PanType[0] === 'FNR') {
                    stateEn = Ext.getCmp('FNR-EN-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'PP') {
                    state = Ext.getCmp('PP-PATCH-FILE-' + PanType[1]).isModified;
                }

                if (PanType[0] === 'AF') {
                    state = Ext.getCmp('AF-ALL-FILE-' + PanType[1]).isModified;
                }

                if (stateEn || stateLang || state) {
                    Ext.Msg.show({
                        scope   : this,
                        title   : _('Confirm'),
                        msg     : _('This file has been modified without being saved.<br/>' +
                                    'Do you really want to close?'),
                        buttons : Ext.Msg.YESNO,
                        icon    : Ext.Msg.QUESTION,
                        fn : function(btn, text)
                        {
                            if (btn === 'yes') {
                                tabpanel.un('beforeremove', this.removeTabEvent, this);
                                tabpanel.remove(tab);
                                tabpanel.addListener('beforeremove', this.removeTabEvent, this);
                            }
                        }
                    });
                    return false;
                } else {
                    return true;
                }
            } else {
                return true;
            }
        },

        WinCommit : function(singleFile, rowIndex, choice)
        {
            var win, btn, FileDBID, FileID, FilePath, FileName, node, TreeSorter;

            btn = Ext.get('acc-need-update');

            if (!win) {
                win = new Ext.Window({
                    scope: this,
                    id: 'winCvsCommit',
                    title: _('CVS commit'),
                    closable: false,
                    layout: 'form',
                    width: 400,
                    height: 480,
                    resizable: false,
                    modal: true,
                    bodyStyle: 'padding:5px 5px 0',
                    labelAlign: 'top',
                    items: [{
                        xtype: 'checktreepanel',
                        id: 'tree-panel',
                        anchor: '100%',
                        height: 180,
                        autoScroll: true,
                        rootVisible: false,
                        root: {
                            text: 'root',
                            expanded: true,
                            children: []
                        }
                    }, {
                        scope: this,
                        xtype: 'combo',
                        fieldLabel: _('Older messages'),
                        editable: false,
                        name: 'first2',
                        anchor: '100%',
                        store: this.storeCommitLogMessage,
                        triggerAction: 'all',
                        tpl: '<tpl for="."><div class="x-combo-list-item">{[values.text.split("\n").join("<br/>")]}</div></tpl>',
                        valueField: 'id',
                        displayField: 'text',
                        listeners: {
                            scope: this,
                            render: function(){
                                this.storeCommitLogMessage.load();
                            },
                            select: function(combo, record, numIndex){
                                Ext.getCmp('form-commit-message-log').setValue(record.data.text);
                            }
                        }
                    }, {
                        xtype: 'textarea',
                        id: 'form-commit-message-log',
                        fieldLabel: _('Log message'),
                        name: 'first3',
                        anchor: '100%',
                        height: 150,
                        value: ""
                    }],
                    tools: [{
                        scope: this,
                        id: 'gear',
                        qtip: _('Configure this tools'),
                        handler: function(){

                            var textArea, cm, winManage;

                            function formatText(value){
                                return value.split("\n").join("<br/>");
                            }

                            textArea = new Ext.form.TextArea({
                                grow: true,
                                growMin: 120
                            });

                            cm = new Ext.grid.ColumnModel([new Ext.grid.RowNumberer(), {
                                id: 'GridManageLog',
                                header: _('Log message'),
                                dataIndex: 'text',
                                renderer: formatText,
                                editor: new Ext.Editor(textArea, {
                                    shadow: false,
                                    autoSize: true,
                                    listeners: {
                                        scope: this,
                                        complete: function(editor, newValue, OldValue){

                                            var messID = editor.record.data.id;

                                            XHR({
                                                scope  : this,
                                                url    : './php/controller.php',
                                                params : {
                                                    task   : 'saveLogMessage',
                                                    messID : messID,
                                                    mess   : newValue
                                                },
                                                success : function(response)
                                                {
                                                    this.storeCommitLogMessage.getById(messID).commit();
                                                },
                                                failure : function(response)
                                                {
                                                    this.winForbidden();
                                                }
                                            });
                                        }
                                    }
                                })

                            }]);

                            //
                            winManage = new Ext.Window({
                                title: _('Manage Log Message'),
                                iconCls: 'winManageLog',
                                width: 650,
                                height: 350,
                                layout: 'fit',
                                resizable: false,
                                modal: true,
                                autoScroll: true,
                                html: '<div class="diff-content"></div>',
                                items: [{
                                    xtype: 'editorgrid',
                                    store: this.storeCommitLogMessage,
                                    loadMask: true,
                                    cm: cm,
                                    sm: new Ext.grid.RowSelectionModel({
                                        singleSelect: true
                                    }),
                                    autoExpandColumn: 'GridManageLog',
                                    listeners: {
                                        scope: this,
                                        rowcontextmenu: function(grid, rowIndex, e){

                                            grid.getSelectionModel().selectRow(rowIndex);

                                            var menu = new Ext.menu.Menu({
                                                items: [{
                                                    text: _('Delete this Log Message'),
                                                    iconCls: 'iconDelete',
                                                    scope: this,
                                                    handler: function() {

                                                        XHR({
                                                            scope  : this,
                                                            url    : './php/controller.php',
                                                            params : {
                                                                task   : 'deleteLogMessage',
                                                                messID : this.storeCommitLogMessage.getAt(rowIndex).data.id
                                                            },
                                                            success : function(response)
                                                            {
                                                                this.storeCommitLogMessage.remove(this.storeCommitLogMessage.getAt(rowIndex));
                                                            },
                                                            failure : function(response)
                                                            {
                                                                this.winForbidden();
                                                            }
                                                        });
                                                    }
                                                }]
                                            });
                                            menu.showAt(e.getXY());
                                        }
                                    }
                                }],
                                buttons: [{
                                    text: _('Close'),
                                    handler: function(){
                                        winManage.close();
                                    }
                                }],
                                listeners: {
                                    scope: this,
                                    close: function(){
                                        this.storeCommitLogMessage.reload();
                                    }
                                }
                            });
                            winManage.show();

                        }
                    }],
                    buttons: [{
                        scope: this,
                        text: _('Submit'),
                        id: 'win-commit-btn-submit',
                        handler: function(){

                            var files, NeedToBeClose, checkNode, paneID_FE, paneID_FNU, paneID_FNR, tmp = [], paneID, libelNeedToBeClose = '', i;

                            // If the user is cvsread, we don't commit anything
                            if (this.userLogin === 'cvsread') {

                                // Close this window
                                win.close();

                                this.winForbidden();

                                return;
                            }

                            // Check if there is some tab open with a file who need to be committed
                            files = Ext.getCmp('tree-panel').getValue();
                            NeedToBeClose = [];

                            for (i = 0; i < files.length; i = i + 1) {

                                checkNode = Ext.getCmp('tree-panel').getNodeById(files[i]).attributes;

                                paneID_FE = 'FE-' + Ext.util.md5('FE-' + checkNode.FilePath + checkNode.FileName);
                                paneID_FNU = 'FNU-' + Ext.util.md5('FNU-' + checkNode.FilePath + checkNode.FileName);
                                paneID_FNR = 'FNR-' + Ext.util.md5('FNR-' + checkNode.FilePath + checkNode.FileName);

                                if (Ext.getCmp('main-panel').findById(paneID_FE) ||
                                Ext.getCmp('main-panel').findById(paneID_FNU) ||
                                Ext.getCmp('main-panel').findById(paneID_FNR)) {

                                    if (Ext.getCmp('main-panel').findById(paneID_FE)) {
                                        paneID = paneID_FE;
                                    }
                                    if (Ext.getCmp('main-panel').findById(paneID_FNU)) {
                                        paneID = paneID_FNU;
                                    }
                                    if (Ext.getCmp('main-panel').findById(paneID_FNR)) {
                                        paneID = paneID_FNR;
                                    }

                                    tmp[0] = paneID;
                                    tmp[1] = checkNode.FileName;

                                    NeedToBeClose.push(tmp);
                                }

                            }

                            if (NeedToBeClose.length > 0) {

                                for (i = 0; i < NeedToBeClose.length; i = i + 1) {
                                    libelNeedToBeClose += NeedToBeClose[i][1] + '<br/>';
                                }

                                Ext.MessageBox.show({
                                    scope: this,
                                    title: 'Warning',
                                    msg: (NeedToBeClose.length > 1) ? String.format(_('There is {0} files to close before commit.<br><br>{1}<br/><br/>Would you like I close it for you ?'), NeedToBeClose.length, libelNeedToBeClose) : String.format(_('There is {0} file to close before commit.<br><br>{1}<br/><br/>Would you like I close it for you ?'), NeedToBeClose.length, libelNeedToBeClose),
                                    icon: Ext.MessageBox.INFO,
                                    buttons: Ext.MessageBox.YESNOCANCEL,
                                    fn: function(btn){
                                        if (btn === 'yes') {

                                            for (i = 0; i < NeedToBeClose.length; i = i + 1) {
                                                Ext.getCmp('main-panel').remove(NeedToBeClose[i][0]);
                                            }

                                            this.WinCommitLastStep(files, this);
                                        }
                                        else {
                                            return;
                                        }
                                    }
                                });

                            }
                            else {
                                this.WinCommitLastStep(files, this);
                            }
                            return;

                        }
                    }, {
                        text: _('Close'),
                        id: 'win-commit-btn-close',
                        handler: function(){
                            win.close();
                        }
                    }]
                });
            }

            win.show(btn);

            var grid = ui.component.PendingCommitGrid.instance;
            // Load files to commit
            if (singleFile) {
                // Just the current file
                FileDBID = grid.store.getAt(rowIndex).data.id;
                FilePath = grid.store.getAt(rowIndex).data.path;
                FileName = grid.store.getAt(rowIndex).data.name;
                FileID = Ext.util.md5(FilePath + FileName);

                node = new Ext.tree.TreeNode({
                    id: 'need-commit-' + FileID,
                    text: FilePath + FileName,
                    FileDBID: FileDBID,
                    FilePath: FilePath,
                    FileName: FileName,
                    leaf: true,
                    checked: true,
                    uiProvider: Ext.ux.tree.CheckTreeNodeUI
                });

                Ext.getCmp('tree-panel').getRootNode().appendChild(node);

            } else {

                // in files Need Update
                grid.store.each(function(record){

                    if (choice && choice === 'by me' && record.data.by !== this.userLogin) {
                    }
                    else {

                        FileDBID = record.data.id;
                        FilePath = record.data.path;
                        FileName = record.data.name;
                        FileID = Ext.util.md5(FilePath + FileName);

                        node = new Ext.tree.TreeNode({
                            id: 'need-commit-' + FileID,
                            text: FilePath + FileName,
                            FileDBID: FileDBID,
                            FilePath: FilePath,
                            FileName: FileName,
                            leaf: true,
                            checked: true,
                            uiProvider: Ext.ux.tree.CheckTreeNodeUI
                        });

                        Ext.getCmp('tree-panel').getRootNode().appendChild(node);
                    }

                }, this);

                // We sort the node alphabetically
                TreeSorter = new Ext.tree.TreeSorter(Ext.getCmp('tree-panel'), {});
                TreeSorter.doSort(Ext.getCmp('tree-panel').getRootNode());
            }


        }, // WinCommit

        WinCommitLastStep : function(files, scope)
        {
            Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Please, wait until commit...'));

            var nodes = [], node, LogMessage, i;

            // Go for Cvs commit
            for (i = 0; i < files.length; i = i + 1) {

                node = Ext.getCmp('tree-panel').getNodeById(files[i]);
                nodes.push(node.attributes.FileDBID);
            }

            // Get log message
            LogMessage = Ext.getCmp('form-commit-message-log').getValue();

            // Close this window
            Ext.getCmp('winCvsCommit').close();

            XHR({
                url     : './php/controller.php',
                params  : {
                    task       : 'cvsCommit',
                    nodes      : Ext.util.JSON.encode(nodes),
                    logMessage : LogMessage
                },
                success : function(response)
                {
                    var o = Ext.util.JSON.decode(response.responseText);

                    Ext.getBody().unmask();

                    // Display commit output message
                    var winStatus = new Ext.Window({
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
                                winStatus.close();
                            }
                        }]
                    });
                    winStatus.show();

                    Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Please, wait...'));

                    // Apply modification
                    XHR({
                        url     : './php/controller.php',
                        params  : {
                            task       : 'onSuccesCommit',
                            nodes      : Ext.util.JSON.encode(nodes),
                            logMessage : LogMessage
                        },
                        success : function(response)
                        {
                            if (scope.userLang != 'en') {
                                // Reload Files error data
                                ui.component.ErrorFileGrid.instance.store.reload();

                                // Reload Files Need reviewed
                                ui.component.PendingReviewGrid.instance.store.reload();

                                // Reload Files Need Update
                                ui.component.StaleFileGrid.instance.store.reload();
                            }

                            ui.component.PendingCommitGrid.instance.store.reload();

                            // Reload translators data
                            ui.component.TranslatorGrid.reload();

                            // Reload summary data
                            ui.component.SummaryGrid.reload();

                            Ext.getBody().unmask();
                        }
                    });
                }
            });

        }, // WinCommitLastStep

        WinUpdate : function()
        {
            // Update of Cvs and apply all tools.
            var win, btn;

            function RefreshStep1(scope){

                // We need to stop pin test during this update
                ui.task.PingTask.instance.cancel();

                Ext.get('wizard-step-1').replaceClass('wizard-step-before', 'wizard-step-working');
                Ext.get('wizard-step-1.1').replaceClass('wizard-wait', 'wizard-show');
                XHR({
                    scope   : scope,
                    url     : './php/controller.php',
                    params  : {
                        task: 'updateRepository'
                    },
                    success : function(response)
                    {
                        // Normally, this never succes ! ;)
                        Ext.get('wizard-step-1').replaceClass('wizard-step-working', 'wizard-step-done');
                        Ext.get('wizard-step-1.1').replaceClass('wizard-show', 'wizard-wait');
                        RefreshStep2(scope);
                    },
                    failure: function(response)
                    {

                        var o = Ext.util.JSON.decode(response.responseText);

                        if (o && o.success === false) {
                            win.close();
                            this.winForbidden();
                        } else {
                            // If update take over 30sec (max Keep-Alive time), we are on failure !
                            function checkLockFile(){
                                XHR({
                                    scope   : scope,
                                    url     : './php/controller.php',
                                    params  : {
                                        task     : 'checkLockFile',
                                        lockFile : 'lock_update_repository'
                                    },
                                    success : function(response)
                                    {
                                        wizardDelayUpdate.delay(5000);
                                    },
                                    failure : function(response)
                                    {
                                        var o = Ext.util.JSON.decode(response.responseText);

                                        if (o && o.success === false) {
                                            Ext.get('wizard-step-1').replaceClass('wizard-step-working', 'wizard-step-done');
                                            Ext.get('wizard-step-1.1').replaceClass('wizard-show', 'wizard-wait');

                                            // Goto step2
                                            RefreshStep2(this);
                                        } else {
                                            wizardDelayUpdate.delay(5000);
                                        }
                                    }
                                });

                            }

                            // We check ever XX secondes if checkout is finish, or not.
                            var wizardDelayUpdate = new Ext.util.DelayedTask(function(){
                                checkLockFile();
                            });
                            wizardDelayUpdate.delay(5000);

                        }



                    }
                });

            } // RefreshStep1()
            function RefreshStep2(scope){
                Ext.get('wizard-step-2').replaceClass('wizard-step-before', 'wizard-step-working');
                XHR({
                    scope   : scope,
                    url     : './php/controller.php',
                    params  : {
                        task: 'applyTools'
                    },
                    success : function(response)
                    {
                        Ext.get('wizard-step-2').replaceClass('wizard-step-working', 'wizard-step-done');
                        RefreshStep3(this);
                    },
                    failure : function(response)
                    {
                        // If the first pass take over 30 sec., we check the lock file
                        function checkLockFile2(){
                            XHR({
                                scope   : scope,
                                url     : './php/controller.php',
                                params  : {
                                    task     : 'checkLockFile',
                                    lockFile : 'lock_apply_tools'
                                },
                                success : function(response)
                                {
                                    wizardDelayApplyTools.delay(5000);
                                },
                                failure : function(response)
                                {
                                    var o = Ext.util.JSON.decode(response.responseText);
                                    if (o && o.success === false) {
                                        Ext.get('wizard-step-2').replaceClass('wizard-step-working', 'wizard-step-done');
                                        RefreshStep3(this);
                                    } else {
                                        wizardDelayApplyTools.delay(5000);
                                    }
                                }
                            });
                        }

                        // We check ever XX secondes if applaying tools is finish, or not.
                        var wizardDelayApplyTools = new Ext.util.DelayedTask(function(){
                            checkLockFile2();
                        });
                        wizardDelayApplyTools.delay(5000);

                    }
                });

            } // RefreshStep2()
            function RefreshStep3(scope){

                Ext.get('wizard-step-3').replaceClass('wizard-step-before', 'wizard-step-working');

                if (phpDoc.userLang != 'en') {
                    // Reload all data on this page
                    ui.component.StaleFileGrid.instance.store.reload();
                    ui.component.TranslatorGrid.reload();
                    ui.component.ErrorFileGrid.instance.store.reload();
                }

                Ext.get('wizard-step-3').replaceClass('wizard-step-working', 'wizard-step-done');

                // Re-enable Finish button
                Ext.getCmp('btn-start-refresh').setIconClass('finishRefresh');
                Ext.getCmp('btn-start-refresh').setText(_('Finish !'));
                Ext.getCmp('btn-start-refresh').setHandler(function(){
                    win.close();
                });
                Ext.getCmp('btn-start-refresh').enable();

                // Re-enable TaskPing
                ui.task.PingTask.instance.delay(30000);

                // Re-enable win's close button
                win.tools.close.setVisible(true);

            } // RefreshStep3()
            btn = Ext.get('acc-need-update');

            if (!win) {
                win = new Ext.Window({
                    title: _('Refresh all data'),
                    layout: 'form',
                    width: 300,
                    height: 200,
                    resizable: false,
                    modal: true,
                    bodyStyle: 'padding:15px 15px 0',
                    iconCls: 'refresh',
                    html: '<div id="wizard-step-1" class="wizard-step-before">'+_('Update all files from Cvs')+'</div>' +
                    '<div id="wizard-step-1.1" class="wizard-wait">'+_('This may take time. Thank you for your patience...')+'</div>' +
                    '<div id="wizard-step-2" class="wizard-step-before">'+_('Apply all tools')+'</div>' +
                    '<div id="wizard-step-3" class="wizard-step-before">'+_('Reload data')+'</div>',
                    buttons: [{
                        scope: this,
                        text: _('Start'),
                        id: 'btn-start-refresh',
                        iconCls: 'startRefresh',
                        handler: function(){

                            // Desable start button
                            Ext.getCmp('btn-start-refresh').disable();

                            // Desable the close button for this win
                            win.tools.close.setVisible(false);

                            // Set 'in progress'
                            Ext.getDom('lastUpdateTime').innerHTML = _('update in progress...');

                            // Start Step 1
                            RefreshStep1(this);

                        }
                    }]
                });
            }


            // We test if there is an update in progress or not
            Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Verify if there is an update in progress. Please, wait...'));

            XHR({
                url     : './php/controller.php',
                params  : {
                    task : 'getLastUpdate'
                },
                success : function(response)
                {
                    // Remove wait msg
                    Ext.getBody().unmask();

                    var o = Ext.util.JSON.decode(response.responseText);

                    if( o.lastupdate === 'in_progress' ) {
                        Ext.MessageBox.show({
                            title   : _('Status'),
                            msg     : _('There is currently an update in progress.<br/>You can\'t perform an update now.'),
                            buttons : Ext.MessageBox.OK,
                            icon    : Ext.MessageBox.INFO
                        });
                    } else {
                        win.show(btn);
                    }
                }
            });

        }, // Winupdate

        WinCheckBuild : function()
        {
            var win, btn;

            btn = Ext.get('acc-need-update');

            function displayMess(scope){

                XHR({
                    scope   : scope,
                    url     : './php/controller.php',
                    params  : {
                        task : 'getLogFile',
                        file : 'log_check_build'
                    },
                    success : function(response)
                    {
                        var o = Ext.util.JSON.decode(response.responseText);

                        // Re-enable TaskPing
                        ui.task.PingTask.instance.delay(30000);

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
                            html       : '<div class="check-build-content">'+o.mess+'</div>'
                        });
                        Ext.getCmp('main-panel').setActiveTab('check_build_panel');
                    }
                });
            }

            if (!win) {
                win = new Ext.Window({
                    title: _('Check Build'),
                    iconCls: 'checkBuild',
                    layout: 'form',
                    width: 350,
                    height: 200,
                    resizable: false,
                    modal: true,
                    bodyStyle: 'padding:5px 5px 0',
                    labelAlign: 'top',
                    buttons: [{
                        scope: this,
                        text: _('Go !'),
                        id: 'win-check-build-btn-submit',
                        handler: function(){

                            var choice = Ext.getCmp('option-xml-details').checked;

                            win.close();
                            Ext.getBody().mask('<img src="themes/img/loading.gif" style="vertical-align: middle;" /> '+_('Please, wait until the build is checked...'));

                            // We need to stop pin test during this process
                            ui.task.PingTask.instance.cancel();

                            XHR({
                                scope   : this,
                                url     : './php/controller.php',
                                params  : {
                                    task       : 'checkBuild',
                                    xmlDetails : choice
                                },
                                success : function(response)
                                {
                                    Ext.getBody().unmask();
                                    displayMess(this);
                                },
                                failure : function(response)
                                {
                                    var o = Ext.util.JSON.decode(response.responseText);

                                    if (o && o.success === false) {
                                        // Re-enable TaskPing
                                        ui.task.PingTask.instance.delay(30000);
                                        Ext.getBody().unmask();
                                        this.winForbidden();
                                    } else {
                                        // If this take over 30sec (max Keep-Alive time), we are on failure !

                                        function checkLockFile(scope){
                                            XHR({
                                                scope   : scope,
                                                url     : './php/controller.php',
                                                params  : {
                                                    task     : 'checkLockFile',
                                                    lockFile : 'lock_check_build'
                                                },
                                                success : function(response)
                                                {
                                                    builcheckDelay.delay(5000);
                                                },
                                                failure : function(response)
                                                {
                                                    var o = Ext.util.JSON.decode(response.responseText);
                                                    if (o && o.success === false) {
                                                        Ext.getBody().unmask();
                                                        displayMess(this);
                                                    } else {
                                                        builcheckDelay.delay(5000);
                                                    }
                                                }
                                            });

                                        }

                                        // We check ever XX secondes if the check build is finish, or not.
                                        var builcheckDelay = new Ext.util.DelayedTask(function(){
                                            checkLockFile(this);
                                        }, this);
                                        builcheckDelay.delay(5000);
                                    }
                                }
                            });

                        }
                    }],
                    items: [{
                        xtype: 'panel',
                        baseCls: 'x-plain',
                        bodyStyle: 'padding:5px 5px 0',
                        html: _('You\'re about to check the build via this command:')+'<br/><br/>/usr/bin/php configure.php --with-lang=' + this.userLang + '<br><br>',
                        modal: false
                    }, {
                        xtype: 'checkbox',
                        hideLabel: true,
                        checked: false,
                        boxLabel: _('Enable detailed XML error messages'),
                        name: 'option-xml-details',
                        id: 'option-xml-details'
                    }]

                });
            }
            win.show(btn);


        }, //WinCheckBuild

        sendEmail : function(TranslatorName, TranslatorEmail)
        {
            var form, win;

            form = new Ext.form.FormPanel({
                baseCls: 'x-plain',
                labelWidth: 55,
                url: 'save-form.php',
                defaultType: 'textfield',

                items: [{
                    fieldLabel: _('Send To'),
                    name: 'to',
                    readOnly: true,
                    anchor: '100%',
                    value: '"' + TranslatorName + '" <' + TranslatorEmail + '>'
                }, {
                    fieldLabel: _('Subject'),
                    name: 'subject',
                    anchor: '100%'
                }, {
                    xtype: 'textarea',
                    hideLabel: true,
                    name: 'msg',
                    anchor: '100% -53'
                }]
            });

            win = new Ext.Window({
                title: _('Send an email'),
                width: 500,
                height: 300,
                minWidth: 300,
                minHeight: 200,
                layout: 'fit',
                plain: true,
                bodyStyle: 'padding:5px;',
                buttonAlign: 'center',
                items: form,
                iconCls: 'iconSendEmail',

                buttons: [{
                    text: _('Send'),
                    handler: function(){

                        var v = form.getForm().getValues();

                        XHR({
                            url     : './php/controller.php',
                            params  : {
                                task    : 'sendEmail',
                                to      : v.to,
                                subject : v.subject,
                                msg     : v.msg
                            },
                            success : function(response)
                            {
                                win.close();
                                Ext.MessageBox.alert(_('Status'), String.format(_('Email sent to {0} with success!'), TranslatorName));
                            }
                        });

                    }
                }, {
                    text: _('Cancel'),
                    handler: function(){
                        win.close();
                    }
                }]
            });

            win.show();

        }, //sendEmail

        repositoryContextMenu : function(node)
        {
            // repository tree context menu handler
            var t, FileName, FilePath, FileLang;

            if (node.attributes.type === 'folder' || node.isRoot) {

                return new Ext.menu.Menu({
                    items: [{
                        text    : (node.isExpanded())
                                ? '<b>' + _('Collapse') + '</b>'
                                : '<b>' + _('Expand') + '</b>',
                        iconCls : 'iconFolderClose',
                        handler : function()
                        {
                            if (node.isExpanded()) node.collapse();
                            else                   node.expand();
                        }
                    }]
                });

            } else if (node.attributes.type === 'file') {

                FileName = node.attributes.text;
                FilePath = node.attributes.id;

                // CleanUp the path
                t = FilePath.split('/');
                t.shift();
                t.shift();
                t.pop();

                FileLang = t.shift();
                FilePath = t.join('/') + '/';

                return new Ext.menu.Menu({
                    items: [{
                        scope   : this,
                        text    : '<b>'+_('Edit in a new Tab')+'</b>',
                        iconCls : 'iconTabNeedReviewed',
                        handler : function()
                        {
                            ui.component.RepositoryTree.instance.fireEvent('dblclick', node);
                        }
                    }, {
                        hidden  : (node.attributes.from === 'search'),
                        scope   : this,
                        text    : (FileLang === 'en')
                                ? String.format(
                                    _('Open the same file in <b>{0}</b>'),
                                    Ext.util.Format.uppercase(this.userLang))
                                : String.format(
                                    _('Open the same file in <b>{0}</b>'), 'EN'),
                        iconCls : 'iconTabNeedReviewed',
                        handler : function()
                        {
                            if (FileLang === 'en') {
                                this.openFile(this.userLang + '/' + FilePath, FileName);
                            } else {
                                this.openFile('en/' + FilePath, FileName);
                            }
                        }
                    }]
                });
            }
        },

        drawInterface: function()
        {
            // We keel alive our session by sending a ping every minute
            new ui.task.PingTask().delay(30000); // start after 1 minute.

            var mainMenu    = new ui.component.MainMenu(),
                mainContent = (this.userLang === 'en') ? [
                    new ui.component.LocalMailGrid()
                ] : [
                    new ui.component.SummaryGrid(),
                    new ui.component.TranslatorGrid(),
                    new ui.component.LocalMailGrid(),
                    new ui.component.BugsGrid(),
                    new ui.component.TranslationGraph()
                ];
            new Ext.Viewport({
                layout : 'border',
                items : [{
                    // logo
                    region     : 'north',
                    html       : '<h1 class="x-panel-header">' +
                                    '<img src="themes/img/mini_php.png" ' +
                                        'style="vertical-align: middle;" />&nbsp;&nbsp;' +
                                    this.appName +
                                 '</h1>',
                    autoHeight : true,
                    border     : false,
                    margins    : '0 0 5 0'
                }, {
                    // accordion
                    region       : 'west',
                    collapsible  : true,
                    collapseMode : 'mini',
                    animate      : true,
                    split        : true,
                    layout       : 'fit',
                    width        : 300,
                    autoScroll   : true,
                    items : [{
                        layout     : 'accordion',
                        animate    : true,
                        bodyBorder : false,
                        border     : false,
                        tbar : [{
                            text    : _('Main Menu'),
                            iconCls : 'MainMenu',
                            menu    : mainMenu
                        }],
                        items : [{
                            id        : 'acc-need-update',
                            title     : _('Files Need Update') + ' - <em id="acc-need-update-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesNeedUpdate',
                            hidden    : (this.userLang === 'en'),
                            items     : [ new ui.component.StaleFileGrid() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FNU-filter').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-error',
                            title     : _('Error in current translation') + ' - <em id="acc-error-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesError',
                            hidden    : (this.userLang === 'en'),
                            items     : [ new ui.component.ErrorFileGrid() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FE-filter').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-need-reviewed',
                            title     : _('Files Need Reviewed') + ' - <em id="acc-need-reviewed-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'FilesNeedReviewed',
                            hidden    : (this.userLang === 'en'),
                            items     : [ new ui.component.PendingReviewGrid() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('FNR-filter').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-notInEn',
                            title     : _('Not in EN tree') + ' - <em id="acc-notInEn-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'NotInEn',
                            hidden    : (this.userLang === 'en'),
                            items     : [ new ui.component.NotInENGrid() ],
                            collapsed : true
                        }, {
                            id        : 'acc-all-files',
                            title     : _('All files'),
                            layout    : 'fit',
                            iconCls   : 'AllFiles',
                            items     : [ new ui.component.RepositoryTree() ],
                            collapsed : true,
                            listeners : {
                                expand : function(panel)
                                {
                                    //TODO: try to find a better way to handle this. If we don't do this, twinTrigger's field is not render because this panel is hidden at the load time
                                    Ext.getCmp('AF-search').wrap.setWidth(200);
                                }
                            }
                        }, {
                            id        : 'acc-need-pendingCommit',
                            title     : _('Pending for commit') + ' - <em id="acc-pendingCommit-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'PendingCommit',
                            items     : [ new ui.component.PendingCommitGrid() ],
                            collapsed : true
                        }, {
                            id        : 'acc-need-pendingPatch',
                            title     : _('Pending Patch') + ' - <em id="acc-pendingPatch-nb">0</em>',
                            layout    : 'fit',
                            iconCls   : 'PendingPatch',
                            items     : [ new ui.component.PendingPatchGrid() ],
                            collapsed : true
                        }]
                    }]
                }, {
                    // main panel
                    xtype             : 'tabpanel',
                    id                : 'main-panel',
                    region            : 'center',
                    activeTab         : 0,
                    enableTabScroll   : true,
                    layoutOnTabChange : true,
                    plugins           : new Ext.ux.TabCloseMenu(),
                    listeners : {
                        scope : this,
                        beforeremove : this.removeTabEvent
                    },
                    items : [{
                        xtype      : 'panel',
                        id         : 'MainInfoTabPanel',
                        title      : _('Home'),
                        baseCls    : 'MainInfoTabPanel',
                        autoScroll : true,
                        plain      : true,
                        items : [{
                            xtype  : 'panel',
                            border : false,
                            html   : '<div class="res-block">' +
                                        '<div class="res-block-inner">' +
                                            '<h3>' +
                                                String.format(_('Connected as <em>{0}</em>'), this.userLogin) +
                                                '<br/><br/>' +
                                                String.format(_('Last data update: <em id="lastUpdateTime">{0}</em>'), '-') +
                                            '</h3>' +
                                        '</div>' +
                                     '</div>'
                        }, {
                            xtype      : 'tabpanel',
                            activeTab  : 0,
                            plain      : true,
                            autoScroll : true,
                            height     : 400,
                            border     : false,
                            items      : mainContent,
                            defaults   : { border: true },
                            layoutOnTabChange : true
                        }]
                    }]
                }]
            });

            // Remove the global loading message
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({ remove : true });

            // Direct access to a file as cvsread
            if (directAccess) {
                this.openFile(
                    directAccess.lang + directAccess.path,
                    directAccess.name
                );
            }
        } // drawInterface
    }; // Return
}();
Ext.EventManager.onDocumentReady(phpDoc.init, phpDoc, true);
