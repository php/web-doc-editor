Ext.define(
    'phpdoe.view.window.msg',
    {
        extend: 'Ext.window.MessageBox',
        confirm: function(id, handler) {
            if (this.itemText[id]) {
                this.callParent([
                    this.itemText[id].title,
                    this.itemText[id].text,
                    function(btn) {
                        if (btn === 'yes') {
                            handler();
                        }
                    }
                ]);
            }
        },
        wait: function(id) {
            if (this.itemText[id]) {
                this.callParent([this.itemText[id]]);
            }
        },
        info: function(id, handler) {
            if (this.itemText[id]) {
                this.show({
                    title: this.itemText[id].title,
                    msg: this.itemText[id].text,
                    icon    : Ext.Msg.INFO,
                    buttons : Ext.Msg.OK,
                    fn: handler
                });
            }
        },

        alert: function(id) {
            if (this.itemText[id]) {
                this.callParent([
                    this.itemText[id].title,
                    this.itemText[id].text
                ]);
            }
        }
    }
);