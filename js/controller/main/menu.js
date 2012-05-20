Ext.define('phpdoe.controller.main.menu', {
    extend: 'Ext.app.Controller',
    requires  : ['Ext.window.MessageBox'],

    aboutWindow : null,

    init: function() {
        this.control({
            '#main-menu-logout': {
                click: this.logout
            },
            '#main-menu-about': {
                click: this.showAbout
            }
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

        // TODO: create class extend Ext.Msg with locale confirm/forbidden messages special for our project
        Ext.Msg.confirm(
            menuItem.parentMenu.ownerButton.itemText.confirm,
            menuItem.parentMenu.ownerButton.itemText.confirmLogout,
            function(btn)
            {
                if (btn === 'yes') {
                    window.location.href = './do/logout?csrfToken=' + csrfToken;
                }
            }
        );

    }
});