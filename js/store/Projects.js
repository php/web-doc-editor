Ext.define('phpdoe.store.Projects', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.Project',
    proxy    : {
        type   : 'ajax',
        url    : './do/getAvailableProject',
        reader : {
            type          : 'json',
            totalProperty : 'nbItems',
            root          : 'Items'
        }
    }
});