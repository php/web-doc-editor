Ext.define('phpdoe.view.main.tabs.chat', {
    extend  : 'Ext.panel.Panel',
    id: 'tab-chat',
    iconCls    : 'iconChat',
    closable   : true,
    layout     : 'fit',
    items : [{
        xtype : "component",
        autoEl : {
            tag : "iframe",
            src : 'https://widget.mibbit.com/?settings=8eec4034df2eb666b0600bdfe151529a&server=irc.umich.edu&channel=%23php.doc&nick=poe_'
        }
    }],
    initComponent: function() {
        this.items[0].autoEl.src += this.chatLogin;
        this.callParent();
    }
});