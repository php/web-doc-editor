Ext.define('phpdoe.store.Files', {
    extend     : 'Ext.data.TreeStore',
    model    : 'phpdoe.model.File',
    proxy    : {
        type   : 'ajax',
        url    : './do/getAllFiles',
        extraParams: {
            'csrfToken' : csrfToken
        },
        reader : {
            type          : 'json'
        }
    },
    folderSort: true,
    root: {
        id: '/'
    }
});