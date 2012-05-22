Ext.define('phpdoe.view.main.tabs.bug', {
    extend  : 'Ext.panel.Panel',
    id: 'tab-report-bug',
    iconCls    : 'iconBugs',
    closable   : true,
    layout     : 'fit',
    items : [{
        xtype : "component",
        autoEl : {
            tag : "iframe",
            src : "http://bugs.php.net/"
        }
    }]
});