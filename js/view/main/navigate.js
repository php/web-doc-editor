Ext.define('phpdoe.view.main.navigate', {
    extend  : 'Ext.tree.Panel',
    store: 'Files',
    singleExpand: true,
    columns: [{
        xtype: 'treecolumn', //this is so we know which column will show the tree
        text: 'Path',
        sortable: true,
        flex: 1,
        dataIndex: 'text'
    },
        Ext.create('Ext.grid.column.Column', {
            text: 'type',
            dataIndex: 'type',
            flex: 1,
            sortable: false
        })],
    rootVisible: false

});
