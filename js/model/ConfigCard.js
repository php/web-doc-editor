Ext.define('phpdoe.model.ConfigCard', {
    extend     : 'Ext.data.Model',
    idProperty : 'id',
    fields     : [
        { name:'id', type:'int' },
        { name:'card', type:'string' },
        { name:'label', type:'string' }
    ]
});
