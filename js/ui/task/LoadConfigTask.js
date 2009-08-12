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

            phpDoc.userConf.conf_needupdate_diff       = o.mess.userConf.conf_needupdate_diff;
            phpDoc.userConf.conf_needupdate_scrollbars = o.mess.userConf.conf_needupdate_scrollbars;
            phpDoc.userConf.conf_needupdate_displaylog = o.mess.userConf.conf_needupdate_displaylog;

            phpDoc.userConf.conf_error_skipnbliteraltag = o.mess.userConf.conf_error_skipnbliteraltag;
            phpDoc.userConf.conf_error_scrollbars       = o.mess.userConf.conf_error_scrollbars;
            phpDoc.userConf.conf_error_displaylog       = o.mess.userConf.conf_error_displaylog;

            phpDoc.userConf.conf_reviewed_scrollbars = o.mess.userConf.conf_reviewed_scrollbars;
            phpDoc.userConf.conf_reviewed_displaylog = o.mess.userConf.conf_reviewed_displaylog;

            phpDoc.userConf.conf_allfiles_displaylog = o.mess.userConf.conf_allfiles_displaylog;

            phpDoc.userConf.conf_patch_scrollbars = o.mess.userConf.conf_patch_scrollbars;
            phpDoc.userConf.conf_patch_displaylog = o.mess.userConf.conf_patch_displaylog;

            //For the theme, we apply this.
            phpDoc.userConf.conf_theme   = o.mess.userConf.conf_theme;
            Ext.get('appTheme').dom.href = phpDoc.userConf.conf_theme;

            // Draw the interface
            phpDoc.drawInterface();
        }
    });
}
