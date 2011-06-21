Ext.namespace('ui','ui.task');

// config - { str }
ui.task.GetGGTranslation = function(config)
{
    Ext.apply(this, config);

    // CleanUp the current result area
    Ext.get('GGTranslate-result').dom.innerHTML = '';

    // Disable the button & add a wait message into it
    Ext.getCmp('GGTranslate-btn').disable();
    Ext.getCmp('GGTranslate-btn').setText(_('Please, wait...'));

    // We load the File
    XHR({
        scope  : this,
        params : {
            task : 'getGGTranslation',
            str  : this.str
        },
        success : function(response)
        {
            var o    = Ext.util.JSON.decode(response.responseText);

            Ext.get('GGTranslate-result').dom.innerHTML = Ext.util.Format.htmlEncode(o.translation);
            Ext.getCmp('GGTranslate-btn').setText(_('Translate !'));
            Ext.getCmp('GGTranslate-btn').enable();
        }
    });
};
