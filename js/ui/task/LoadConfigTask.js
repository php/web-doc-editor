Ext.namespace('ui','ui.task');

ui.task.LoadConfigTask = function(config)
{
    Ext.apply(this, config);

    XHR({
        params  : { task : 'getConf' },
        success : function(r)
        {
            var o = Ext.decode(r.responseText);

            PhDOE.user.login = o.mess.userLogin;
            PhDOE.user.lang  = o.mess.userLang;
            PhDOE.user.isAnonymous = o.mess.userIsAnonymous;
            PhDOE.user.isGlobalAdmin = o.mess.userIsGlobalAdmin;
            PhDOE.user.isLangAdmin = o.mess.userIsLangAdmin;
            PhDOE.user.conf = o.mess.userConf;

            PhDOE.project   = o.mess.project;
            PhDOE.app.conf   = o.mess.appConf;

            if( o.mess.topicInfo ) {
                PhDOE.topic.author = o.mess.topicInfo.author;
                PhDOE.topic.content = o.mess.topicInfo.content;
                PhDOE.topic.topicDate = Date.parseDate(o.mess.topicInfo.topicDate, 'Y-m-d H:i:s');
                PhDOE.topic.topicDate = PhDOE.topic.topicDate.format(_('Y-m-d, H:i'));
            }
            
            //For the theme, we apply it.
            Ext.get('appTheme').dom.href = PhDOE.user.conf.main.theme;

            // Draw the interface
            PhDOE.drawInterface();
        }
    });
};