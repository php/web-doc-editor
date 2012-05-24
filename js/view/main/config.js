Ext.define('phpdoe.view.main.config', {
    extend : 'Ext.window.Window',
    id : 'window-config',
    layout : 'border',
    autoShow : false,
    width : 700,
    height : 470,
    closable : true,
    closeAction : 'hide',
    draggable : false,
    resizable : false,
    plain : true,
    iconCls : 'iconConf',
    modal : true,
    initComponent : function () {



        this.buttons = [
            {
                text : this.itemText.Close,
                iconCls : 'iconClose',
                handler : function () {
                    Ext.getCmp('window-config').hide();
                }
            }
        ];


        this.items = [{
            id         : 'confMenu',
            region     : 'west',
            border     : false,
            width      : 180,
            autoScroll : true,
            layout: 'fit',
            items      : [
                Ext.create('phpdoe.view.main.config.menu')
            ]
        }, {
            id         : 'confCard',
            region     : 'center',
            border     : false,
            layout     : 'card',
            width      : 375,
            frame      : true,
            activeItem : 0,

            bbar : [
                {
                    xtype: 'tbtext',
                    text: 'All changes take effect immediately' ,
                    cls: 'iconConfStatusBar'}
            ],

            items : [
            ]
        }];


        this.callParent();
    }

});
