Ext.define('phpdoe.controller.main.menu', {
    extend: 'Ext.app.Controller',
    aboutWindow : null,

    init: function() {
        this.control({
            '#main-menu-erase-personal': {
                click: this.erasePersonalData
            },
            '#main-menu-logout': {
                click: this.logout
            },
            '#main-menu-about': {
                click: this.showAbout
            }
        });

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