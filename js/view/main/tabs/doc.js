Ext.define('phpdoe.view.main.tabs.doc', {
    extend  : 'Ext.panel.Panel',
    id: 'tab-doc',
    iconCls    : 'iconBook',
    closable   : true,
    layout     : 'fit',
    items : [{
        xtype : "component",
        autoEl : {
            tag : "iframe",
            src : "https://wiki.php.net/doc/editor/"
        }
    }]
});