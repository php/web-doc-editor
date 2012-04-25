Ext.define('phpdoe.view.main' ,{
    extend: 'Ext.container.Viewport',
    id     : 'main-app',
    layout: 'border',
    items: [
        Ext.create('Ext.toolbar.Toolbar', {
            region  : 'north',
            height  : 30,
            items: [
                Ext.create('phpdoe.view.main.menu'),
                '->', // same as { xtype: 'tbfill' }
                Ext.create('Ext.toolbar.TextItem', {
                    width: 200,
                    text: '<h1>' +
                        '<img src="themes/img/mini_php.png" ' +
                        'style="vertical-align: middle;" />&nbsp;&nbsp;' +
                        config.NAME +
                        '</h1>'
                })
            ]
        }),
        Ext.create('phpdoe.view.main.navigate', {
            region: 'west',
            //animCollapse      : true,
            header: false,
            split: true,
            collapsible: true,
            collapseMode: 'mini',
            width: 150
        }),
        Ext.create('phpdoe.view.main.tabs', {
            region: 'center'
        })
    ]
});
