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
                {id :'4', card: 'card4', label:'Module "Files with error"'},
                {id :'6', card: 'card6', label:'Module "All files"'}
            );
        } else {
            Ext.getStore('ConfigCards').add(
                {id :'conf-card-main', card: 'card1', label:'Main'},
                {id :'conf-card-need-translate', card: 'card2', label:'Module "Files need translate"'},
                {id :'3', card: 'card3', label:'Module "Files need update"'},
                {id :'4', card: 'card4', label:'Module "Files with error"'},
                {id :'5', card: 'card5', label:'Module "Files need reviewed"'},
                {id :'6', card: 'card6', label:'Module "All files"'}
            );
        }



        this.callParent();
    }

});