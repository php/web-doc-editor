Ext.namespace('ui','ui.component','ui.component._CommitLogManager');

ui.component._CommitLogManager.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCommitLogMessage'
    }),
    reader : new Ext.data.JsonReader(
        {
            root          : 'Items',
            totalProperty : 'nbItems',
            id            : 'id'
        }, Ext.data.Record.create([
            {
                name    : 'id',
                mapping : 'id'
            }, {
                name    : 'text',
                mapping : 'text'
            }
        ])
    )
});

ui.component._CommitLogManager.editor = new Ext.ux.grid.RowEditor({
    saveText: _('Update'),
    cancelText: _('Cancel'),
    listeners: {
        afteredit: function(editor, changes, record, rowIdx)
        {
            XHR({
                params : {
                    task   : 'saveLogMessage',
                    messID : record.data.id,
                    mess   : record.data.text
                },
                success : function(response)
                {
                   record.commit();
                   // Notify
                   PhDOE.notify('info', _('Message updated'), _('Log Message was updated successfully !'));
                },
                failure : function(response)
                {
                    PhDOE.winForbidden();
                }
            });
        }
    }
});

ui.component._CommitLogManager.cm = new Ext.grid.ColumnModel([
    new Ext.grid.RowNumberer(),
    {
        id        : 'log_msg',
        header    : _('Log message'),
        dataIndex : 'text',
        editor    : {
            xtype : 'textarea'
        },
        renderer  : function(value)
        {
            return value.split("\n").join("<br/>");
        }
    }
]);

ui.component._CommitLogManager.sm = new Ext.grid.RowSelectionModel({
    singleSelect: true
});

// config - { rowIdx }
ui.component._CommitLogManager.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIdx: function(rowIdx) {
        this.rowIdx = rowIdx;
    },

    initComponent : function(config)
    {
        Ext.apply(this,{

            items  : [{
                scope   : this,
                text    : _('Delete this Log Message'),
                iconCls : 'iconDelete',
                handler : function()
                {
                    XHR({
                        scope  : this,
                        params : {
                            task   : 'deleteLogMessage',
                            messID : ui.component._CommitLogManager.store.getAt(this.rowIdx).data.id
                        },
                        success : function(response)
                        {
                            ui.component._CommitLogManager.store.remove(ui.component._CommitLogManager.store.getAt(this.rowIdx));

                            // Notify
                            PhDOE.notify('info', _('Message deleted'), _('Log Message was deleted successfully !'));

                        },
                        failure : function(response)
                        {
                            PhDOE.winForbidden();
                        }
                    });
                }
            }]
        });
        ui.component._CommitLogManager.menu.superclass.initComponent.call(this);
    }
});

ui.component._CommitLogManager.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoExpandColumn : 'log_msg',
    cm      : ui.component._CommitLogManager.cm,
    sm      : ui.component._CommitLogManager.sm,
    store   : ui.component._CommitLogManager.store,
    plugins : [ui.component._CommitLogManager.editor],
    listeners : {
        render : function(grid)
        {
            grid.store.load();
        }
    },

    onRowContextMenu: function(grid, rowIndex, e) {

        e.stopEvent();
        this.getSelectionModel().selectRow(rowIndex);

        if( ! this.menu ) {
            this.menu = new ui.component._CommitLogManager.menu();
        }
        this.menu.setRowIdx(rowIndex);
        this.menu.showAt(e.getXY());

    },

    initComponent: function(config)
    {
        ui.component._CommitLogManager.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});

ui.component.CommitLogManager = Ext.extend(Ext.Window,
{
    id         : 'commit-log-win',
    title      : _('Manage Log Message'),
    iconCls    : 'iconWinManageLog',
    width      : 650,
    height     : 350,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'hide',
    store      : ui.component._CommitLogManager.store,
    buttons : [{
        text    : _('Close'),
        handler : function()
        {
            Ext.getCmp('commit-log-win').hide();
        }
    }],

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.component._CommitLogManager.grid()]
        });
        ui.component.CommitLogManager.superclass.initComponent.call(this);

    }
});