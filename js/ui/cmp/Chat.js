Ext.namespace('ui','ui.cmp');

ui.cmp.Chat = Ext.extend(Ext.Window,
{
    id        : 'win-chat',
    iconCls   : 'iconChat',
    layout    : 'fit',
    width     : 800,
    height    : 600,
    modal     : true,
    plain     : true,
    bodyStyle : 'color:#000',
    closeAction:'hide',

    initComponent : function()
    {
        var chatLogin = PhDOE.user.login;

        if( PhDOE.user.isAnonymous ) {
            chatLogin = 'an%3F%3F%3F';
        }

        Ext.apply(this,
        {
            title : _('Chat with us on IRC !'),
            items : [new Ext.ux.IFrameComponent({
                id: 'frame-win-chat',
                url: 'https://widget.mibbit.com/?settings=8eec4034df2eb666b0600bdfe151529a&server=irc.umich.edu&channel=%23php.doc&nick=poe_'+ chatLogin
            })]
        });
        ui.cmp.Chat.superclass.initComponent.call(this);
    }
});
