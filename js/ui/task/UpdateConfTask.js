Ext.namespace('ui','ui.task');

// config - { item, value }
ui.task.UpdateConfTask = function(config)
{
    Ext.apply(this, config);

    // Apply modification in DB
    XHR({
        scope   : this,
        url     : './php/controller.php',
        params  : {
            task  : 'confUpdate',
            item  : this.item,
            value : this.value
        },
        success : function(response)
        {
            // Update userConf object
            switch (this.item) {
                case 'conf_theme' :
                    phpDoc.userConf.conf_theme = this.value;
                    break;
                case 'conf_needupdate_diff' :
                    phpDoc.userConf.conf_needupdate_diff = this.value;
                    break;
                case 'conf_needupdate_scrollbars':
                    phpDoc.userConf.conf_needupdate_scrollbars = "" + this.value + "";
                    break;
                case 'conf_needupdate_displaylog':
                    phpDoc.userConf.conf_needupdate_displaylog = "" + this.value + "";
                    break;
                case 'conf_error_skipnbliteraltag':
                    phpDoc.userConf.conf_error_skipnbliteraltag = "" + this.value + "";
                    ui.component.ErrorFileGrid.instance.store.reload();
                    break;
                case 'conf_error_scrollbars':
                    phpDoc.userConf.conf_error_scrollbars = "" + this.value + "";
                    break;
                case 'conf_error_displaylog':
                    phpDoc.userConf.conf_error_displaylog = "" + this.value + "";
                    break;
                case 'conf_reviewed_scrollbars':
                    phpDoc.userConf.conf_reviewed_scrollbars = "" + this.value + "";
                    break;
                case 'conf_reviewed_displaylog':
                    phpDoc.userConf.conf_reviewed_displaylog = "" + this.value + "";
                    break;
                case 'conf_allfiles_displaylog':
                    phpDoc.userConf.conf_allfiles_displaylog = "" + this.value + "";
                    break;
                case 'conf_patch_scrollbars':
                    phpDoc.userConf.conf_patch_scrollbars = "" + this.value + "";
                    break;
                case 'conf_patch_displaylog':
                    phpDoc.userConf.conf_patch_displaylog = "" + this.value + "";
                    break;
            }
        }
    });
}
