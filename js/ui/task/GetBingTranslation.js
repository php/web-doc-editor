Ext.namespace('ui','ui.task');

// config - { str }
ui.task.GetBingTranslation = function(config)
{
    Ext.apply(this, config);

    // CleanUp the current result area
    Ext.get('BingTranslate-result').dom.innerHTML = '';

    // Disable the button & add a wait message into it
    Ext.getCmp('BingTranslate-btn').disable();
    Ext.getCmp('BingTranslate-btn').setText(_('Please, wait...'));

    // We load the File
    XHR({
        scope  : this,
        params : {
            task : 'getBingTranslation',
            str  : this.str
        },
        success : function(response)
        {
            var o    = Ext.util.JSON.decode(response.responseText);

            Ext.get('BingTranslate-result').dom.innerHTML = Ext.util.Format.htmlEncode(o.translation);
            Ext.getCmp('BingTranslate-btn').setText(_('Translate !'));
            Ext.getCmp('BingTranslate-btn').enable();
        }
    });
};
