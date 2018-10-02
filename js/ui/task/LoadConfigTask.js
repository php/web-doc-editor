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
            PhDOE.user.userID = o.mess.userID;
            PhDOE.user.lang  = o.mess.userLang;
            PhDOE.user.authService  = o.mess.authService;
            PhDOE.user.authServiceID  = o.mess.authServiceID;
            PhDOE.user.isAnonymous = o.mess.userIsAnonymous;
            PhDOE.user.haveKarma = o.mess.userHaveKarma;
            PhDOE.user.isGlobalAdmin = o.mess.userIsGlobalAdmin;
            PhDOE.user.isLangAdmin = o.mess.userIsLangAdmin;
            PhDOE.user.conf = o.mess.userConf;
            PhDOE.user.anonymousIdent = o.mess.userAnonymousIdent;

            PhDOE.project   = o.mess.project;
            PhDOE.app.conf   = o.mess.appConf;

            if( o.mess.topicInfo && o.mess.topicInfo.lang ) {
                PhDOE.topic.lang.author = o.mess.topicInfo.lang.author;
                PhDOE.topic.lang.content = o.mess.topicInfo.lang.content;
                PhDOE.topic.lang.topicDate = Date.parseDate(o.mess.topicInfo.lang.topicDate, 'Y-m-d H:i:s');
                PhDOE.topic.lang.topicDate = PhDOE.topic.lang.topicDate.format(_('Y-m-d, H:i'));
            }
            if( o.mess.topicInfo && o.mess.topicInfo.global ) {
                PhDOE.topic.global.author = o.mess.topicInfo.global.author;
                PhDOE.topic.global.content = o.mess.topicInfo.global.content;
                PhDOE.topic.global.topicDate = Date.parseDate(o.mess.topicInfo.global.topicDate, 'Y-m-d H:i:s');
                PhDOE.topic.global.topicDate = PhDOE.topic.global.topicDate.format(_('Y-m-d, H:i'));
            }

            //For the theme, we apply it.
            Ext.get('appTheme').dom.href = PhDOE.user.conf.main.theme;

            if( ! PhDOE.user.conf.diff )
            {
                PhDOE.user.conf.diff = {};
                PhDOE.user.conf.diff.displayPreviewPanel = true;
            }

            // Draw the interface
            PhDOE.drawInterface();

        }
    });
};
