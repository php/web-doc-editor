Ext.namespace('ui','ui.component','ui.component._CommitLogPrompt');

ui.component._CommitLogPrompt.store = new Ext.data.Store({
    proxy : new Ext.data.HttpProxy({
        url : './php/controller.php'
    }),
    baseParams : { task : 'getCommitLogMessage' },
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

ui.component._CommitLogPrompt.cm = new Ext.grid.ColumnModel([
    new Ext.grid.RowNumberer(),
    {
        id        : 'log_msg',
        header    : _('Log message'),
        dataIndex : 'text',
        renderer  : function(value)
        {
            return value.split("\n").join("<br/>");
        },
        editor : new Ext.Editor(
            new Ext.form.TextArea({
                grow    : true,
                growMin : 120
            }), {
                shadow    : false,
                autoSize  : true,
                listeners : {
                    complete : function(editor, newValue, OldValue)
                    {
                        var messID = editor.record.data.id;

                        XHR({
                            url    : './php/controller.php',
                            params : {
                                task   : 'saveLogMessage',
                                messID : messID,
                                mess   : newValue
                            },
                            success : function(response)
                            {
                                ui.component._CommitLogPrompt.store.getById(messID).commit();
                            },
                            failure : function(response)
                            {
                                phpDoc.winForbidden();
                            }
                        });
                    }
                }
            }
        )
    }
]);

ui.component._CommitLogPrompt.sm = new Ext.grid.RowSelectionModel({
    singleSelect: true
});

// config - { rowIdx }
ui.component._CommitLogPrompt.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.component._CommitLogPrompt.menu.superclass.constructor.call(this);
}
Ext.extend(ui.component._CommitLogPrompt.menu, Ext.menu.Menu,
{
    init : function()
    {
        var store = ui.component._CommitLogPrompt.store;

        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : _('Delete this Log Message'),
                iconCls : 'iconDelete',
                handler : function()
                {
                    XHR({
                        scope  : this,
                        url    : './php/controller.php',
                        params : {
                            task   : 'deleteLogMessage',
                            messID : store.getAt(this.rowIdx).data.id
                        },
                        success : function(response)
                        {
                            store.remove(store.getAt(this.rowIdx));
                        },
                        failure : function(response)
                        {
                            phpDoc.winForbidden();
                        }
                    });
                }
            }]
        });
    }
});

ui.component._CommitLogPrompt.grid = Ext.extend(Ext.grid.EditorGridPanel,
{
    loadMask         : true,
    autoExpandColumn : 'log_msg',
    cm    : ui.component._CommitLogPrompt.cm,
    sm    : ui.component._CommitLogPrompt.sm,
    store : ui.component._CommitLogPrompt.store,
    listeners : {
        rowcontextmenu : function(grid, rowIndex, e)
        {
            grid.getSelectionModel().selectRow(rowIndex);

            new ui.component._CommitLogPrompt.menu({
                rowIdx : rowIndex
            }).showAt(e.getXY());
        }
    }
});

ui.component.CommitLogPrompt = Ext.extend(Ext.Window,
{
    id         : 'commit-log-win',
    title      : _('Manage Log Message'),
    iconCls    : 'winManageLog',
    width      : 650,
    height     : 350,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    html       : '<div class="diff-content"></div>',
    buttons : [{
        text    : _('Close'),
        handler : function()
        {
            this.ownerCt.close();
        }
    }],
    listeners : {
        close : function()
        {
            ui.component._CommitLogPrompt.store.reload();
        }
    },
    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.component._CommitLogPrompt.grid()],
        });
        ui.component.CommitLogPrompt.superclass.initComponent.call(this);
    }
});
ui.component.CommitLogPrompt.store = ui.component._CommitLogPrompt.store;
