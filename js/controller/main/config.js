Ext.define('phpdoe.controller.main.config', {
    extend: 'Ext.app.Controller',

    init: function() {
        this.control({
            '#conf-menu-view': {
                selectionchange : this.showCard,
                afterrender: this.selectFirstMenuItem
            },
            '#config-left-panel-width,#config-on-save-file,#config-display-en-work,#config-theme,#config-lang,#config-load-mails,#config-load-bugs,#config-cm2-theme,#config-newFile-nbDisplay': {
                change: {
                    fn: this.saveConfField,
                    buffer: 1000
                }
            }
        });
        this.control({
            '#config-left-panel-width': {
                change: this.changeLeftPanelWidth
            }
        });
    },

    showCard: function(view, nodes)
    {
        Ext.getCmp('confCard').layout.setActiveItem(nodes[0].get('id'));
    },

    selectFirstMenuItem: function(view)
    {
        view.select(0);
    },

    updateConf: function(name, value)
    {
        name = name.split('.');

        Ext.Ajax.request({
            task : 'confUpdate',
            params: {
                module: name[0],
                itemName  : name[1],
                value     : value
            },
            success: function (json) {
                config.user.conf[name[0]][name[1]] = value;

                Ext.create('phpdoe.view.main.config.notify').show();
                /*
                 // If we touch this config option, we need to reload this store too
                 if( this.module == "newFile" &&  this.itemName == "nbDisplay" ) {
                 ui.cmp.PendingTranslateGrid.getInstance().store.reload();
                 }
                 if( this.module == "needUpdate" &&  this.itemName == "nbDisplay" ) {
                 ui.cmp.StaleFileGrid.getInstance().store.reload();
                 }
                 if( this.module == "error" &&  (this.itemName == "skipNbLiteralTag" || this.itemName == "nbDisplay") ) {
                 ui.cmp.ErrorFileGrid.getInstance().store.reload();
                 }
                 if( this.module == "reviewed" &&  this.itemName == "nbDisplay" ) {
                 ui.cmp.PendingReviewGrid.getInstance().store.reload();
                 }

                 if( this.module == "main" &&  this.itemName == "displayENWork" ) {
                 ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload(function() {
                 ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();
                 });
                 }

                 */
            }
        });
    },

    saveConfField: function(field)
    {
        this.updateConf(field.getName(), field.getValue());
    },

    changeLeftPanelWidth: function(field)
    {
        Ext.getCmp('navigate').setWidth(field.getValue());
    }
});