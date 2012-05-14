Ext.define('phpdoe.view.form.IconCombo', {
    extend:'Ext.form.ComboBox',
    alias:'widget.iconcombo',

    initComponent:function () {
        Ext.apply(this, {
            listConfig:{
                iconClsField:this.iconClsField,
                tpl:'<ul><tpl for=".">' +
                    '<li role="option" class="x-boundlist-item" style="position:relative;padding-left: 25px;">' +
                    '<div class="{' + this.iconClsField + '}" style="position:absolute;top: 4px;left: 5px;"></div>' +
                    '{name}' +
                    '</li>' +
                    '</tpl></ul>'
            }

        });

        // call parent initComponent
        this.callParent(arguments);

    }, // end of function initComponent

    onRender:function (ct, position) {
        this.callParent(arguments);
        this.inputEl.applyStyles({'padding-left':'25px'});
        this.icon = Ext.DomHelper.insertBefore(this.inputEl, '<div style="position:absolute;top: 5px;left: 5px;"></div>');
    },

    setIconCls:function () {
        if (this.rendered) {
            var rec = this.store.findRecord(this.valueField, this.getValue());
            if (rec) this.icon.className = rec.get(this.iconClsField);
        } else {
            this.on('render', this.setIconCls, this, { single:true });
        }
    },

    setValue:function (value) {
        this.callParent(arguments);
        this.setIconCls();
    }
});