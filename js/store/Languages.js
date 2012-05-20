Ext.define('phpdoe.store.Languages', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.Language',
    proxy    : {
        type   : 'ajax',
        url    : './do/getAvailableLanguage',
        extraParams: {
            csrfToken: csrfToken
        },
        reader : {
            type          : 'json',
            totalProperty : 'nbItems',
            root          : 'Items'
        }
    }
});