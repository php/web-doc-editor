Ext.namespace('ui','ui.cmp','ui.cmp._CommitLogManager');

ui.cmp._CommitLogManager.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './do/getCommitLogMessage'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'text'}
        ]
    })
});

ui.cmp._CommitLogManager.editor = new Ext.ux.grid.RowEditor({
    saveText   : _('Update'),
    cancelText : _('Cancel'),
    listeners  : {
        afteredit: function(editor, changes, record)
        {
            XHR({
                params : {
                    task   : 'saveLogMessage',
                    messID : record.data.id,
                    mess   : record.data.text
                },
                success : function()
                {
                   record.commit();
                   // Notify
                   PhDOE.notify('info', _('Message updated'), _('Log Message was updated successfully !'));
                },
                failure : function()
                {
                    PhDOE.winForbidden();
                }
            });
        }
    }
});

ui.cmp._CommitLogManager.cm = new Ext.grid.ColumnModel([
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

ui.cmp._CommitLogManager.sm = new Ext.grid.RowSelectionModel({
    singleSelect: true
});

// config - { rowIdx }
ui.cmp._CommitLogManager.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIdx: function(rowIdx) {
        this.rowIdx = rowIdx;
    },

    initComponent : function()
    {
        Ext.apply(this,{

            items  : [{
                scope   : this,
                text    : _('Delete this Log Message'),
                iconCls : 'iconTrash',
                handler : function()
                {
                    XHR({
                        scope  : this,
                        params : {
                            task   : 'deleteLogMessage',
                            messID : ui.cmp._CommitLogManager.store.getAt(this.rowIdx).data.id
                        },
                        success : function()
                        {
                            ui.cmp._CommitLogManager.store.remove(ui.cmp._CommitLogManager.store.getAt(this.rowIdx));

                            // Notify
                            PhDOE.notify('info', _('Message deleted'), _('Log Message was deleted successfully !'));

                        },
                        failure : function()
                        {
                            PhDOE.winForbidden();
                        }
                    });
                }
            }]
        });
        ui.cmp._CommitLogManager.menu.superclass.initComponent.call(this);
    }
});

ui.cmp._CommitLogManager.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoExpandColumn : 'log_msg',
    cm               : ui.cmp._CommitLogManager.cm,
    sm               : ui.cmp._CommitLogManager.sm,
    store            : ui.cmp._CommitLogManager.store,
    plugins          : [ui.cmp._CommitLogManager.editor],
    viewConfig       : {
        emptyText : '<div class="x-grid-empty" style="text-align:center;">'+_('No log message currently')+'</div>'
    },
    listeners        : {
        render : function(grid)
        {
            grid.store.load();
        }
    },

    onRowContextMenu: function(grid, rowIndex, e) {

        e.stopEvent();
        this.getSelectionModel().selectRow(rowIndex);

        if( ! this.menu ) {
            this.menu = new ui.cmp._CommitLogManager.menu();
        }
        this.menu.setRowIdx(rowIndex);
        this.menu.showAt(e.getXY());

    },

    initComponent: function(config)
    {
        ui.cmp._CommitLogManager.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});

ui.cmp.CommitLogManager = Ext.extend(Ext.Window,
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
    store      : ui.cmp._CommitLogManager.store,
    buttons    : [{
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
            items : [new ui.cmp._CommitLogManager.grid()]
        });
        ui.cmp.CommitLogManager.superclass.initComponent.call(this);
    }
});
