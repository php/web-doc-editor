Ext.namespace('ui','ui.cmp');

ui.cmp.DirectActionWin = Ext.extend(Ext.Window,
{
    title      : _('Live action'),
    layout     : 'form',
    iconCls    : 'iconDirectAction',
    width      : 850,
    height     : 450,
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'close',
    padding: 10,
    tools: [{
       id:'restore',
       hidden: true,
       handler: function(e,tEl,p,tc) {
           p.toggleMaximize();
           p.tools['maximize'].show();
           p.tools['restore'].hide();
       }
    },{
       id:'maximize',
       handler: function(e,tEl,p,tc) {
           p.toggleMaximize();
           p.tools['maximize'].hide();
           p.tools['restore'].show();
       }
    }],
    buttonAlign: 'center',
    buttons    : [{
        text: _('Save'),
        handler: function()
        {
            // Get value
            var action, patchID, idDB, win = this.ownerCt.ownerCt;

            action = win.items.items[1].items.items[0].getValue();
            patchID = win.items.items[1].items.items[1].getValue();
            idDB = win.idDB;

            // We need a patch with this action
            if( action == 'putIntoMyPatches' && patchID == '' ) {
                win.items.items[1].items.items[1].markInvalid();
                win.items.items[1].items.items[1].focus();
                return;
            }

            XHR({
                scope: this,
                params: {
                    task: 'setDirectAction',
                    action: action,
                    patchID: patchID,
                    idDB: idDB
                },
                success: function(r) {
                    var o = Ext.util.JSON.decode(r.responseText);

                    // We reload some stores
                    ui.cmp.WorkTreeGrid.getInstance().getRootNode().reload();
                    ui.cmp.PatchesTreeGrid.getInstance().getRootNode().reload();

                    // We close this window
                    win.close();
                }
            });

        }
    },'->',{
        text    : _('Close'),
        handler : function()
        {
            this.ownerCt.ownerCt.close();
        }
    }],

    displayData: function(info)
    {
        this.items.items[0].setText(info.fileInfo.lang + info.fileInfo.path + info.fileInfo.name + ' ' + _('by') + ' <b>' + info.userInfo.vcs_login + '</b> ' + _('on') + ' ' + info.fileInfo.date, false);

        this.items.items[2].update(info.vcsDiff);

        // We select the right action
        this.items.items[1].items.items[0].setValue(this.action);
        // Do we need to display patchList and Add button ?
        if( this.action == 'deleteThisChange' )
        {
            this.items.items[1].items.items[1].hide();
            //this.items.items[1].items.items[2].hide();
            Ext.getCmp('Action-win-btn-add-new-patch').hide();
        }

        if( this.action == 'putIntoMyPatches' )
        {
            this.items.items[1].items.items[1].show();
            //this.items.items[1].items.items[2].show();
            Ext.getCmp('Action-win-btn-add-new-patch').show();
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items: [{
                xtype:'label',
                fieldLabel: _('Modified file'),
                text: '-'
            },{
                xtype:'compositefield',
                fieldLabel: _('Action'),
                items: [{
                    xtype     : 'combo',
                    allowBlank: false,
                    editable:false,
                    triggerAction: 'all',
                    lazyRender:true,
                    mode: 'local',
                    store: new Ext.data.ArrayStore({
                        id: 'putIntoMyPatches',
                        fields: [
                            'actionID',
                            'actionText'
                        ],
                        data: [['putIntoMyPatches', _('Put into this patch:')], ['deleteThisChange', _('Delete this change')]]
                    }),
                    valueField: 'actionID',
                    displayField: 'actionText',
                    listeners: {
                        select: function(combo, record, index)
                        {
                            if( record.data.actionID == 'deleteThisChange' )
                            {
                                combo.ownerCt.items.items[1].hide();
                                combo.ownerCt.items.items[2].hide();
                            }

                            if( record.data.actionID == 'putIntoMyPatches' )
                            {
                                combo.ownerCt.items.items[1].show();
                                combo.ownerCt.items.items[2].show();
                            }
                        }
                    }
                },{
                    xtype     : 'combo',
                    allowBlank: false,
                    editable:false,
                    triggerAction: 'all',
                    lazyRender:true,
                    mode: 'local',
                    store: PhDOE.user.patchList,
                    valueField: 'id',
                    displayField: 'name'
                },{
                    xtype: 'button',
                    iconCls: 'iconAdd',
                    id: 'Action-win-btn-add-new-patch',
                    tooltip: _('Create a new patch'),
                    handler: function() {
                        var win = new ui.cmp.ManagePatchPrompt({
                            title: _('Create a new patch')
                        });
                        win.show(this.el);
                    }
                }]
            },{
                xtype:'label',
                fieldLabel: _('Diff'),
                cls: 'diff-content'
            }],
            listeners: {
                afterrender: function()
                {
                    XHR({
                        scope: this,
                        params: {
                            task: 'getDirectActionData',
                            action: this.action,
                            idDB: this.idDB
                        },
                        success: function(r) {
                            var o = Ext.util.JSON.decode(r.responseText);

                            if( !o.fileInfo ) {
                                this.close();
                                PhDOE.notify('error', _('Live action'), _('This live action didn\'t exist'));
                                return;
                            }

                            this.displayData(o);
                        }
                    });
                }
            }
        });

        ui.cmp.DirectActionWin.superclass.initComponent.call(this);

        this.show();
    }
});
