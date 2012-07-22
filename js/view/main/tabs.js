Ext.define('phpdoe.view.main.tabs', {
    extend  : 'Ext.tab.Panel',
    activeTab: 0,      // First tab active by default
    items: [
        Ext.create('phpdoe.view.main.tabs.home')
    ]
});