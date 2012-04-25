Ext.define('phpdoe.model.Language', {
    extend     : 'Ext.data.Model',
    idProperty : 'code',
    fields     : [
        {name : 'code', type : 'string'},
        {name : 'iconCls', type : 'string'},
        {name : 'name', type : 'string'}
    ]
});
