Ext.BLANK_IMAGE_URL = 'js/ExtJs/resources/images/default/s.gif';

// Add ucFirst to string object
String.prototype.ucFirst = function () {
	return this.substr(0,1).toUpperCase() + this.substr(1,this.length);
};

// Allow to deselect just one row when we use CheckBoxSelectionModel, for example, in CommitPrompt
// Found here : http://www.extjs.com/forum/showthread.php?69172-Rows-are-deselected-in-grid-CheckboxSelectionModel&p=348647#post348647
Ext.override( Ext.grid.CheckboxSelectionModel, {
    handleMouseDown : function(g, rowIndex, e){
        if(e.button !== 0 || this.isLocked()){
            return;
        };
        var view = this.grid.getView();
        if(e.shiftKey && this.last !== false){
            var last = this.last;
            this.selectRange(last, rowIndex, e.ctrlKey);
            this.last = last;
            view.focusRow(rowIndex);
        }else{
            var isSelected = this.isSelected(rowIndex);
            if(isSelected){
                this.deselectRow(rowIndex);
            }else if(!isSelected){
                this.selectRow(rowIndex, ! this.singleSelect);
                view.focusRow(rowIndex);
            }
        }
    }
});

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
    config.params = Ext.applyIf({csrfToken: csrfToken}, config.params);
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

Ext.override(Ext.form.Field, {

    afterRender: function() {

        var findLabel = function(field) {
            var wrapDiv = null;
            var label = null

            //find form-item and label
            wrapDiv = field.getEl().up("div.x-form-item");

            if (wrapDiv) label = wrapDiv.child("label");
            if (label) return label;
        };

        if (this.tooltipText) {
            var label = findLabel(this);

            if (label) {

                label.addClass(this.tooltipClass || "x-textfield-tooltip");

                new Ext.ToolTip({
                    target:  label,
                    html: this.tooltipText,
                    //enabled: true,
                    trackMouse:true
                    //dismissDelay: 60000 * 30
                });
            }
        }

        Ext.form.Field.superclass.afterRender.call(this);
        this.initEvents();
        this.initValue();
    }

});
