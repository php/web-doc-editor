Ext.define('phpdoe.view.main.tabs', {
    extend  : 'Ext.tab.Panel',
    activeTab: 0,      // First tab active by default
    items: {
        title: 'Home',
        html: 'The first tab\'s content. Others may be added dynamically'
    }
});