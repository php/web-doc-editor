Ext.define('phpdoe.model.AuthService', {
    extend     : 'Ext.data.Model',
    idProperty : 'id',
    fields     : [
        {name : 'id', type : 'string'},
        {name : 'iconCls', type : 'string'},
        {name : 'name', type : 'string'},
        {name : 'login', type : 'string', defaultValue: ''},
        {name : 'email', type : 'string', defaultValue: ''},
        {name : 'userId', type : 'string', defaultValue: ''}
    ]
});