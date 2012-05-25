Ext.define('phpdoe.store.UILanguages', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.UILanguage',
    data: [
        {
            id: 'default',
            name: 'Default language, if available'
        },
        {
            id: 'en',
            name: 'English'
        },
        {
            id: 'fr',
            name: 'French'
        },
        {
            id: 'ru',
            name: 'Russian'
        },
        {
            id: 'es',
            name: 'Spanish'
        },
        {
            id: 'ar',
            name: 'Arabic'
        }
    ]
});