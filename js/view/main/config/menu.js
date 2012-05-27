Ext.define('phpdoe.view.main.config.menu', {
    extend : 'Ext.view.View',
    id : 'conf-menu-view',
    store: 'ConfigCards',
    trackOver : true,
    autoScroll : true,
    overItemCls    : 'x-view-over',
    itemSelector : 'div.menu-wrap',
    singleSelect : true,
    selectedItemCls : 'x-view-selected',
    tpl: [
        '<tpl for=".">',
        '<div class="menu-wrap" id="tplMenu-{id}">',
        '<div class="menu {card}"></div>',
        '{label}',
        '</div>',
        '</tpl>'
    ],
    initComponent : function () {

        if (config.user.lang === 'en') {
            Ext.getStore('ConfigCards').add(
                {id :'conf-card-main', card: 'card1', label:'Main'},
                {id :'conf-card-error-files', card: 'card4', label:'Module "Files with error"'},
                {id :'conf-card-all-files', card: 'card6', label:'Module "All files"'}
            );
        } else {
            Ext.getStore('ConfigCards').add(
                {id :'conf-card-main', card: 'card1', label:'Main'},
                {id :'conf-card-need-translate', card: 'card2', label:'Module "Files need translate"'},
                {id :'conf-card-need-update', card: 'card3', label:'Module "Files need update"'},
                {id :'conf-card-error-files', card: 'card4', label:'Module "Files with error"'},
                {id :'conf-card-need-review', card: 'card5', label:'Module "Files need reviewed"'},
                {id :'conf-card-all-files', card: 'card6', label:'Module "All files"'}
            );
        }



        this.callParent();
    }

});