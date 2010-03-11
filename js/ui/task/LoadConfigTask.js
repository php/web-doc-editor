Ext.namespace('ui','ui.task');

ui.task.LoadConfigTask = function(config)
{
    Ext.apply(this, config);

    XHR({
        params  : { task : 'getConf' },
        success : function(response)
        {
            var o = Ext.decode(response.responseText);

            PhDOE.userLogin = o.mess.userLogin;
            PhDOE.userLang  = o.mess.userLang;

            PhDOE.userConf  = o.mess.userConf;
            PhDOE.project   = o.mess.project;

            //For the theme, we apply this.
            Ext.get('appTheme').dom.href = PhDOE.userConf["theme"];

            // Draw the interface
            PhDOE.drawInterface();
        }
    });
};