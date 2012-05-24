Ext.define('phpdoe.controller.main.load', {
    extend: 'Ext.app.Controller',

    init: function() {
        this.loadConfig();
    },

    loadConfig: function() {

        Ext.Ajax.request({
            task : 'getConf',
            success: function (json) {

                json = json.mess;

                config.user.login = json.userLogin;
                config.user.userID = json.userID;
                config.user.lang  = json.userLang;
                config.user.authService  = json.authService;
                config.user.authServiceID  = json.authServiceID;
                config.user.isAnonymous = json.userIsAnonymous;
                config.user.haveKarma = json.userHaveKarma;
                config.user.isGlobalAdmin = json.userIsGlobalAdmin;
                config.user.isLangAdmin = json.userIsLangAdmin;
                config.user.conf = json.userConf;
                config.user.anonymousIdent = json.userAnonymousIdent;
                config.user.project   = json.project;

                config.appConf   = json.appConf;


                if( json.topicInfo && json.topicInfo.lang ) {
                    config.topic.lang.author = json.topicInfo.lang.author;
                    config.topic.lang.content = json.topicInfo.lang.content;
                    config.topic.lang.topicDate = Date.parseDate(json.topicInfo.lang.topicDate, 'Y-m-d H:i:s');
                    config.topic.lang.topicDate = config.topic.lang.topicDate.format(_('Y-m-d, H:i'));
                }
                if( json.topicInfo && json.topicInfo.global ) {
                    config.topic.global.author = json.topicInfo.global.author;
                    config.topic.global.content = json.topicInfo.global.content;
                    config.topic.global.topicDate = Date.parseDate(json.topicInfo.global.topicDate, 'Y-m-d H:i:s');
                    config.topic.global.topicDate = config.topic.global.topicDate.format(_('Y-m-d, H:i'));
                }


                //Ext.get('appTheme').dom.href = PhDOE.user.conf.main.theme;

            }
        });

    }
});