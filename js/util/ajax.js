Ext.define('phpdoe.util.ajax', {
    override: 'Ext.Ajax',

    request: function(options) {

        if (options.task) {
            options.url = './do/' + options.task;
            options.params.csrfToken = csrfToken;
        }

        this.callParent(arguments);
    }
});