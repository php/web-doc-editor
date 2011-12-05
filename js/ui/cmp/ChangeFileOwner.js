Ext.namespace('ui','ui.cmp','ui.cmp._ChangeFileOwner');

ui.cmp._ChangeFileOwner.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getVCSUsers'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        fields        : [
            {name : 'userID'},
            {name : 'authService'},
            {name : 'userName'}
        ]
    }),
    sortInfo: {
        field: 'authService',
        direction: 'ASC'
    }
});


ui.cmp.ChangeFileOwner = Ext.extend(Ext.Window,
{
    title      : _('Change file\'s owner'),
    iconCls    : 'iconSwitchLang',
    width      : 550,
    height     : 255,
    layout     : 'form',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'close',
    padding    : 10,
    buttons    : [{
        text    : _('Save'),
        handler : function()
        {
            var win = this.ownerCt.ownerCt,
                newOwnerID = win.items.items[1].items.items[0].getValue();
            
            new ui.task.ChangeFileOwner({
                fileIdDB : win.fileIdDB,
                newOwnerID : newOwnerID,
                from     : win
            });
            
        }
    },{
        text    : _('Close'),
        handler : function()
        {
            var win = this.ownerCt.ownerCt;
            win.close();
        }
    }],

    initComponent : function()
    {
        var win = this;
        
        Ext.apply(this,
        {
            defaults: {
                labelWidth : 120
            },
            items : [{
                xtype   : 'fieldset',
                title   : _('Information'),
                iconCls : 'iconInfo',
                width   : 515,
                items   : [{
                    xtype:'displayfield',
                    fieldLabel: _('File'),
                    value: this.fileFolder + this.fileName
                },{
                    xtype:'displayfield',
                    fieldLabel: _('Current owner'),
                    value: this.currentOwner
                }]
            },{
                xtype   : 'fieldset',
                title   : _('Action'),
                iconCls : 'iconSwitchLang',
                width   : 515,
                items   : [{
                    xtype         : 'combo',
                    name          : 'newOwner',
                    fieldLabel    : _('New owner'),
                    editable      : false,
                    store         : ui.cmp._ChangeFileOwner.store,
                    triggerAction : 'all',
                    valueField    : 'userID',
                    tpl: new Ext.XTemplate(
                        '<tpl for="."><div class="x-combo-list-item">',
                            '{authService} - {userName}',
                        '</div></tpl>'
                    ),
                    displayField  : 'userName',
                    listeners     : {
                        afterrender : function(cmp)
                        {
                            cmp.store.load({
                                callback: function() {
                                    cmp.setValue(PhDOE.user.userID);
                                }
                            });
                        }
                    }
                }]
            }]
        });
        
        ui.cmp.ChangeFileOwner.superclass.initComponent.call(this);
        
        this.show();
    }
});
