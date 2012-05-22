Ext.define('phpdoe.util.ajax', {
    override: 'Ext.Ajax',

    request: function(options) {
        if (options.task) {

            var success_cb = options.success,
                failure_cb = options.failure,
                original_cb = options.callback;

            options = Ext.Object.merge(options, {
                url: './do/' + options.task,
                params: {
                    csrfToken: csrfToken
                },
                success: Ext.emptyFn,
                failure: Ext.emptyFn,
                callback: function(options, success, response)
                {
                    var o = null;
                    try {
                        o = Ext.decode(response.responseText);
                    } catch(e) {
                        Ext.log({level: 'error'}, "Invalid XHR JSON Response: " + response.responseText);
                    }
                    if (success && o && o.success) {
                        if (success_cb !== undefined) {
                            // !!! In this callback we use decoded response!!!
                            Ext.callback(success_cb, options.scope, [o, options]);
                        }
                    } else {
                        if (failure_cb !== undefined) {
                            Ext.callback(failure_cb, options.scope, [response, options]);
                        }
                    }

                    if (original_cb !== undefined) {
                        Ext.callback(original_cb, options.scope, [options, success, response]);
                    }
                }
            });
        }

        this.callParent([options]);
    }
});