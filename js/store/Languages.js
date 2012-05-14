Ext.define('phpdoe.store.Languages', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.Language',
    proxy    : {
        type   : 'ajax',
        url    : './do/getAvailableLanguage',
        reader : {
            type          : 'json',
            totalProperty : 'nbItems',
            root          : 'Items'
        }
    }
});