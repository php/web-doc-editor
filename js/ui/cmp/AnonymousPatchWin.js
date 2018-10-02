Ext.namespace('ui','ui.cmp','ui.cmp._AnonymousPatchWin');

ui.cmp._AnonymousPatchWin.form = Ext.extend(Ext.FormPanel,
{
    frame:true,
    labelWidth: 5,
    bodyStyle:'padding:5px 5px 0',
    defaultType: 'radio',

    initComponent: function(config)
    {
        Ext.apply(this,
        {
            items: [{
                xtype: 'displayfield',
                value: _('File: ')+this.fpath+this.fname+'<br><br>'+_('You have opened a modified file from the "Patch for review" module.<br>This file has been modified by an anonymous user.<br><br>Please choose one of the following actions:')
            },{
                boxLabel: _('Continue to modify this file'),
                name: 'choice',
                inputValue: 'continue',
                checked: true,
                listeners: {
                    afterrender: function()
                    {
                        new Ext.ToolTip({
                            title       : _('Continue to modify this file'),
                            target      : 'x-form-el-'+this.id,
                            anchor      : 'right',
                            html        : '<br>'+_('This action will open this file for modification. Once your modification finish, just save it and this file will be own by you.'),
                            width       : 250,
                            autoHide    : true
                        });
                    }
                }
            },{
                boxLabel: _('Reject this patch'),
                name: 'choice',
                inputValue: 'reject',
                listeners: {
                    afterrender: function()
                    {
                        new Ext.ToolTip({
                            title       : _('Reject this patch'),
                            target      : 'x-form-el-'+this.id,
                            anchor      : 'right',
                            html        : '<br>'+_('This action will close this file, and clear the local change. This file will return into his original version, as it is on VCS server.'),
                            width       : 250,
                            autoHide    : true
                        });
                    }
                }
            },{
                boxLabel: _('Validate this patch'),
                name: 'choice',
                inputValue: 'validate',
                listeners: {
                    afterrender: function()
                    {
                        new Ext.ToolTip({
                            title       : _('Validate this patch'),
                            target      : 'x-form-el-'+this.id,
                            anchor      : 'right',
                            html        : '<br>'+_('This action changes the owner of the modification and register it under your name. The file will appear under your name and you can then commit it.'),
                            width       : 250,
                            autoHide    : true
                        });
                    }
                }
            }]
        });
        ui.cmp._AnonymousPatchWin.form.superclass.initComponent.call(this);
    }
});

ui.cmp.AnonymousPatchWin = Ext.extend(Ext.Window,
{
    id         : 'anonymous-patch-win',
    title      : _('Anonymous patch manager'),
    iconCls    : 'iconPatch',
    width      : 450,
    height     : 260,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closable   : false,
    closeAction: 'close',
    buttons    : [{
        text    : _('Next'),
        iconCls : 'iconArrowRight',
        handler : function()
        {
            var win = this.ownerCt.ownerCt,
                choice = win.items.items[0].getForm().getValues().choice;

            switch(choice) {

                case 'continue':
                    win.close();
                    break;

                case 'reject':

                    Ext.MessageBox.confirm(
                        _('Confirm'),
                        _('Rejecting this patch, you are about to delete this change.<br>Are you sure you want to do that?'),
                        function(btn)
                        {
                            if( btn === 'yes' )
                            {
                                //we clear local change for this file
                                ui.task.ClearLocalChangeTask({
                                    ftype: win.ftype,
                                    fpath: win.fpath,
                                    fname: win.fname,
                                    noConfirm: true
                                });
                                win.close();
                            }
                        }
                    );
                    break;

                case 'validate':

                    //We change the file owner
                    ui.task.ChangeFileOwner({
                        fileIdDB : win.fidDB,
                        newOwnerID : PhDOE.user.userID,
                        from     : win,
                        fromType : 'tab'
                    });
                    break;
            }
        }
    }],

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.cmp._AnonymousPatchWin.form({
                fpath: this.fpath,
                fname: this.fname
            })]
        });

        ui.cmp.AnonymousPatchWin.superclass.initComponent.call(this);

        this.show();
    }
});
