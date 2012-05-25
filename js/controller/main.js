Ext.define('phpdoe.controller.main', {
    extend: 'Ext.app.Controller',

    onLaunch: function() {
        this.loadStores(['Languages']);
    },

    loadStoresCount: 0,
    onLoadStore: function() {
        this.loadStoresCount--;
        if (this.loadStoresCount <= 0) {
            this.initApplication();
        }
    },
    loadStores: function(storeNames) {

        this.loadStoresCount = storeNames.length;

        //async loading stores
        for (var i = 0; i < storeNames.length; i++) {
            Ext.getStore(storeNames[i]).load({scope: this, callback: this.onLoadStore});
        }
    },

    initApplication: function() {

        Ext.create('phpdoe.view.main').show();

        Ext.getStore('Languages').each(
            function(record) {
                Ext.getCmp('main-menu-switch-lang').menu.add({
                    text    : record.get('name') + ' (' + record.get('code') + ')',
                    code: record.get('code'),
                    iconCls : 'mainMenuLang ' + record.get('iconCls'),
                    disabled: (record.get('code') === config.user.lang)
                });
            }
        );

        // Remove the global loading message
        Ext.get('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove : true });
    }

});