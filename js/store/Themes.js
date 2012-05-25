Ext.define('phpdoe.store.Themes', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.Theme',
    data: [
        {
            id: 'default',
            name: 'Default'
        },
        {
            id: 'access',
            name: 'Access'
        },
        {
            id: 'gray',
            name: 'Gray'
        },
        {
            id: 'scoped',
            name: 'Scoped'
        }
    ]
});