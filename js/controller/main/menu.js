Ext.define('phpdoe.controller.main.menu', {
    extend: 'Ext.app.Controller',
    aboutWindow : null,

    init: function() {
        this.control({
            '#main-menu-erase-personal': {
                click: this.erasePersonalData
            },
            '#main-menu-build-check': {
                click: this.checkBuild
            },
            '#main-menu-build-failed': {
                click: this.showFailed
            },
            '#main-menu-report-bug': {
                click: this.reportBug
            },
            '#main-menu-doc': {
                click: this.showDoc
            },
            '#main-menu-chat': {
                click: this.openChat
            },
            '#main-menu-logout': {
                click: this.logout
            },
            '#main-menu-about': {
                click: this.showAbout
            }
        });

    },

    showFailed: function(menuitem) {

        var mainPanel = Ext.getCmp('main-panel');

        if (!Ext.getCmp('tab-report-build-status')) {
            mainPanel.add(Ext.create('phpdoe.view.main.tabs.buildStatus'));
        }

        mainPanel.setActiveTab('tab-report-build-status');


    },

    checkBuild: function(menuitem) {

        Msg.wait('CheckInProgress');

        Ext.Ajax.request({
            task : 'checkLockFile',
            params: {
                //lockFile : 'project_' + PhDOE.project + '_lock_check_build_' + PhDOE.user.lang
            },
            success: function () {
                Msg.hide();
                Msg.info('cantCheckNow');
            },
            failure: function() {
                Msg.hide();

                //new ui.cmp.CheckBuildPrompt().show(
                //Ext.get('acc-need-update')
                //);
            }
        });


    },

    reportBug: function() {

        var mainPanel = Ext.getCmp('main-panel');

        if (!Ext.getCmp('tab-report-bug')) {
            mainPanel.add(Ext.create('phpdoe.view.main.tabs.bug'));
        }

        mainPanel.setActiveTab('tab-report-bug');
    },

    showDoc: function() {

        var mainPanel = Ext.getCmp('main-panel');

        if (!Ext.getCmp('tab-doc')) {
            mainPanel.add(Ext.create('phpdoe.view.main.tabs.doc'));
        }

        mainPanel.setActiveTab('tab-doc');
    },

    openChat: function() {

        var mainPanel = Ext.getCmp('main-panel');

        if (!Ext.getCmp('tab-chat')) {
            var chatLogin = 'an%3F%3F%3F';
            mainPanel.add(Ext.create('phpdoe.view.main.tabs.chat', {chatLogin: chatLogin}));
        }

        mainPanel.setActiveTab('tab-chat');
    },

    erasePersonalData: function(menuitem) {
        Msg.confirm('eraseData', function() {

            Msg.wait('PleaseWait');

            Ext.Ajax.request({
                task : 'erasePersonalData',
                success: function () {
                    Msg.hide();
                    Msg.info('thanks', function(){
                        window.location.href = './do/logout?csrfToken=' + csrfToken;
                    });
                },
                failure: function() {
                    Msg.hide();
                    Msg.alert('forbidden');
                }
            });

        });
    },

    showAbout: function(menuItem) {

        if (!this.aboutWindow) {
            this.aboutWindow = Ext.create('phpdoe.view.main.about');
        }
        this.aboutWindow.show();
    },

    changeLanguage: function(menuItem) {

        Ext.Ajax.request({
            task : 'switchLang',
            params : {lang : menuItem.code},
            success : function () {
                window.location.reload();
            }
        });

    },

    logout: function(menuItem) {

        Msg.confirm('logout', function() {
            window.location.href = './do/logout?csrfToken=' + csrfToken;
        });

    }
});