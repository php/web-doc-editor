Ext.define('phpdoe.model.File', {
    extend     : 'Ext.data.Model',
    idProperty : 'id',
    fields     : [
        {name : 'id', type : 'string'},
        {name : 'text', type : 'string'},
        {name : 'type', type : 'string'}
    ]
});