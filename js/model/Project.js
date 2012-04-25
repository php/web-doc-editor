Ext.define('phpdoe.model.Project', {
    extend     : 'Ext.data.Model',
    idProperty : 'code',
    fields     : [
        {name : 'code', type : 'string'},
        {name : 'iconCls', type : 'string'},
        {name : 'name', type : 'string'},
        {name : 'request_account_uri', type : 'string'}
    ]
});