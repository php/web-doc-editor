Ext.define('phpdoe.store.EditorThemes', {
    extend     : 'Ext.data.Store',
    model    : 'phpdoe.model.Theme',
    data: [
        {
            id: false,
            name: 'No theme'
        },
        {
            id: 'default',
            name: 'Default'
        },
        {
            id: 'cobalt',
            name: 'Cobalt'
        },
        {
            id: 'eclipse',
            name: 'Eclipse'
        },
        {
            id: 'elegant',
            name: 'Elegant'
        },
        {
            id: 'monokai',
            name: 'Monokai'
        },
        {
            id: 'neat',
            name: 'Neat'
        },
        {
            id: 'night',
            name: 'Night'
        },
        {
            id: 'rubyblue',
            name: 'RubyBlue'
        }
    ]
});