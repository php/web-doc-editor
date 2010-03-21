Ext.BLANK_IMAGE_URL = 'http://extjs.cachefly.net/ext-3.1.1/resources/images/default/s.gif';

// Add ucFirst to string object
String.prototype.ucFirst = function () {
	return this.substr(0,1).toUpperCase() + this.substr(1,this.length);
};

// javascript debug-logging wrapper
function log()
{
    if(console) {
        console.log.apply(this, arguments);
    }
}

// i18n function
function _(key)
{
    try {
        var str = i18n[key];

        if (str === undefined) {
            str = key;
            log("FIX ME : i18n not found for the string: " + key);
        }

        return str;
    } catch(e) {
        return key;
    }
}

// XHR wrapper
// config - Ext.ajax.request config
function XHR(config)
{
    var success_cb  = config.success,
        failure_cb  = config.failure,
        original_cb = config.callback;

    config.url = './do/' + config.params.task;
    delete config.params.task;
    config.failure  = config.success = Ext.emptyFn;
    config.callback = function(options, success, response)
    {
        var o = null;
        try {
            o = Ext.decode(response.responseText);
        } catch(e) {
            log("Invalid XHR JSON Response:" + response.responseText);
        }

        if (success && o && o.success) {
            if (success_cb !== undefined) {
                Ext.callback(success_cb, config.scope, [response, options]);
            }
        } else {
            if (failure_cb !== undefined) {
                Ext.callback(failure_cb, config.scope, [response, options]);
            }
        }

        if (original_cb !== undefined) {
            Ext.callback(original_cb, config.scope, [options, success, response]);
        }
    };

    Ext.Ajax.request(config);
}