Ext.define('phpdoe.store.AuthServices', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.AuthService',
    proxy    : {
        type   : 'ajax',
        url    : './do/getAvailableAuthServices',
        reader : {
            type          : 'json',
            totalProperty : 'nbItems',
            root          : 'Items'
        }
    }
})