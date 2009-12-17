Ext.namespace('ui','ui.task');

ui.task.LoadConfigTask = function(config)
{
    Ext.apply(this, config);

    XHR({
        params  : { task : 'getConf' },
        success : function(response)
        {
            var o = Ext.decode(response.responseText);

            phpDoc.userLogin = o.mess.userLogin;
            phpDoc.userLang  = o.mess.userLang;

            phpDoc.userConf = o.mess.userConf;

            //For the theme, we apply this.
            Ext.get('appTheme').dom.href = phpDoc.userConf["theme"];


            // Draw the interface
            phpDoc.drawInterface();
        }
    });
};
