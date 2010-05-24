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
            PhDOE.user.isAdmin = o.mess.userIsAdmin;
            PhDOE.user.conf = o.mess.userConf;
			
            PhDOE.project   = o.mess.project;
            PhDOE.app.conf   = o.mess.appConf;

            //For the theme, we apply this.
            Ext.get('appTheme').dom.href = PhDOE.user.conf.theme;

            // Draw the interface
            PhDOE.drawInterface();
        }
    });
};