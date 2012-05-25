Ext.define('phpdoe.view.main.config.notify', {
    extend: 'Ext.ux.window.Notification',
    title: 'Option saved',
    position: 'br',
    iconCls: 'iconInfo',
    autoHideDelay: 2000,
    slideInDuration: 500,
    slideBackDuration: 500,
    autoHide: true,
    spacing: 20,
    html: 'Option has been saved successfully!'
})
