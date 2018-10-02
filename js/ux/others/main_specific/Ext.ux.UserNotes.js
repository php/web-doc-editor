Ext.ux.UserNotes = Ext.extend(Ext.Button, {

    originalTitle : _('Notes (<b>{0}</b>)'),
    text  : String.format(_('Notes (<b>{0}</b>)'), '-'),

    //var n = Ext.data.Record.create([{name:'name'},{name:'date'}, {name:'content'}]);
    //this.store.insert(0, new n({name:'Machin', date:'10/02/10, 19h00', content: 'Contenu inséré'}));

    initComponent: function() {

        Ext.ux.UserNotes.superclass.initComponent.apply(this);
        Ext.apply(this, {
            iconCls : 'iconUserNotes',
            id : this.fid + '-userNotes',
            menu : new Ext.menu.Menu({

                showSeparator: false,
                allowOtherMenus: true,
                plain: true,
                autoHeight: true,
                forceLayout: true,
                enableScrolling: false,
                items: [{
                    xtype: 'grid',
                    loadMask: true,
                    width: 500,
                    height: 200,
                    contextMenuFrom: false,
                    contextMenuRowIndex: false,
                    sm: new Ext.grid.RowSelectionModel({
                        singleSelect:true
                    }),
                    winNotes : new Ext.Window({
                        scope       : this,
                        title       : _('Add a new note'),
                        iconCls     : 'iconUserNotes',
                        closeAction : 'hide',
                        width       : 600,
                        height      : 300,
                        layout      :'form',
                        hideLabel   : true,
                        modal       : true,
                        items       : [{
                            xtype      : 'htmleditor',
                            hideLabel  : true,
                            enableLinks: false,
                            anchor     : '100%'
                        }],
                        listeners: {
                            show: function(win) {
                                win.items.items[0].setValue('');
                            }

                        },
                        buttons: [{
                            text: _('Add'),
                            handler: function()
                            {
                                var mainBtn = this.ownerCt.ownerCt.scope,
                                win = this.ownerCt.ownerCt;

                                // Stay the mainMenu open event a clic
                                mainBtn.menu.show(mainBtn.el);

                                var fieldValue = this.ownerCt.ownerCt.items.items[0].getValue();
                                var file = mainBtn.file;

                                XHR({
                                    scope  : this,
                                    params : {
                                        task : 'addUserNote',
                                        file : file,
                                        note : fieldValue

                                    },
                                    success : function()
                                    {
                                        // We close the window
                                        win.hide();

                                        // We must refresh the store
                                        mainBtn.menu.items.items[0].store.reload();

                                        // Notify
                                        PhDOE.notify('info', _('Note added'), _('The note was added successfully !'));

                                    },
                                    failure : function()
                                    {
                                        PhDOE.winForbidden();
                                    }
                                });


                            }
                        },{
                            text   : _('Cancel'),
                            handler: function()
                            {
                                var mainBtn = this.ownerCt.ownerCt.scope;

                                // Stay the mainMenu open event a clic
                                mainBtn.menu.show(mainBtn.el);

                                this.ownerCt.ownerCt.hide();
                            }
                        }]


                    }),
                    contextMenu : new Ext.menu.Menu({
                        scope    : this,
                        listeners: {
                            show: function(m) {
                                // We hide item according for the right click origin
                                if( this.scope.menu.items.items[0].contextMenuFrom === 'containercontextmenu') {
                                    this.items.items[2].disable();
                                } else {

                                    // We must check if this note is owned by the current use.
                                    // If so, he can delete it. If not, he can't.
                                    var grid = this.scope.menu.items.items[0];

                                    var noteOwner = grid.store.getAt(grid.contextMenuRowIndex).data.user
                                    if( PhDOE.userLogin == noteOwner ) {
                                        this.items.items[2].enable();
                                    } else {
                                        this.items.items[2].disable();
                                    }
                                }

                                // Not depending of above condition, we disable items for anonymous
                                if( PhDOE.userLogin == "anonymous" ) {
                                    this.items.items[0].disable();
                                    this.items.items[2].disable();
                                }
                            }
                        },
                        items : [{
                            text    : _('Add a new note'),
                            iconCls : 'iconUserNotes',
                            handler : function()
                            {
                                var grid = this.ownerCt.scope.menu.items.items[0];

                                grid.winNotes.show();
                            }
                        }, '-', {
                            text    : _('Delete this note'),
                            iconCls : 'iconDelete',
                            handler : function()
                            {
                                var grid = this.ownerCt.scope.menu.items.items[0],
                                noteID = grid.store.getAt(grid.contextMenuRowIndex).data.id;

                                XHR({
                                    scope  : this,
                                    params : {
                                        task   : 'delUserNote',
                                        noteID : noteID

                                    },
                                    success : function(r)
                                    {
                                        var o = Ext.util.JSON.decode(r.responseText);

                                        // We must refresh the store
                                        grid.store.reload();

                                        // o.result can be false if we try to delete a note not owned by userLogin

                                        if( o.result ) {
                                            // Notify
                                            PhDOE.notify('info', _('Note deleted'), _('The note was deleted successfully !'));
                                        }

                                    },
                                    failure : function()
                                    {
                                        PhDOE.winForbidden();
                                    }
                                });


                            }
                        },'-', {
                            text    : _('Reload data'),
                            iconCls : 'iconRefresh',
                            handler : function()
                            {
                                var grid = this.ownerCt.scope.menu.items.items[0];

                                grid.store.reload();
                            }
                        }]
                    }),
                    store: new Ext.data.Store({
                        autoLoad: true,
                        proxy : new Ext.data.HttpProxy({
                            url : './do/getUserNotes'
                        }),
                        baseParams: {
                            file: this.file
                        },
                        reader : new Ext.data.JsonReader({
                            root          : 'Items',
                            totalProperty : 'nbItems',
                            idProperty    : 'id',
                            fields        : [
                            {
                                name : 'id'
                            },

                            {
                                name : 'user'
                            },

                            {
                                name : 'note'
                            },

                            {
                                name : 'date',
                                type : 'date',
                                dateFormat : 'Y-m-d H:i:s'
                            }
                            ]
                        }),
                        sortInfo : {
                            field     : 'date',
                            direction : 'DESC'
                        },
                        listeners: {
                            scope: this,
                            datachanged: function(ds) {
                                var total = ds.getCount();
                                this.setText(String.format(this.originalTitle, total));

                            }
                        }
                    }),
                    listeners: {
                        scope: this,
                        rowclick: function(grid) {
                            // If the contextMenu is show, we hide it
                            if( !grid.contextMenu.hidden ) {
                                grid.contextMenu.hide();
                            }
                        },
                        containercontextmenu: function(grid, e) {
                            e.stopEvent();

                            // We deselect all previous rows
                            grid.getSelectionModel().clearSelections();

                            grid.contextMenuFrom = 'containercontextmenu';

                            grid.contextMenu.showAt(e.getXY());

                            // When we display the contextMenu, the initial menu disappears.
                            // We must re-show him and set a zindex for contextmenu higher than the initial menu to be visible.
                            this.menu.show(this.el);
                            var zindex = this.menu.el.zindex + 2000;
                            grid.contextMenu.el.setStyle('z-index', zindex);
                        },
                        rowcontextmenu: function(grid, rowIndex, e) {
                            e.stopEvent();

                            // We select this row
                            grid.getSelectionModel().selectRow(rowIndex);

                            grid.contextMenuFrom = 'rowcontextmenu';
                            grid.contextMenuRowIndex = rowIndex;

                            grid.contextMenu.showAt(e.getXY());

                            // When we display the contextMenu, the initial menu disappears.
                            // We must re-show him and set a zindex for contextmenu higher than the initial menu to be visible.
                            this.menu.show(this.el);
                            var zindex = this.menu.el.zindex + 2000;
                            grid.contextMenu.el.setStyle('z-index', zindex);
                        }

                    },
                    colModel: new Ext.grid.ColumnModel({
                        defaults: {
                            sortable: true
                        },
                        columns: [{
                            id: 'user',
                            header: _('By'),
                            sortable: true,
                            dataIndex: 'user'
                        }, {
                            header: _('Date'),
                            dataIndex: 'date',
                            renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
                        }]
                    }),
                    autoExpandColumn: 'user',
                    viewConfig: {
                        forceFit: true,
                        deferEmptyText: false,
                        emptyText    : '<div style="text-align: center;">' + _('No user notes') + '<br><br>' + _('Right click to add a new note') + '</div>',
                        enableRowBody : true,
                        getRowClass   : function(record, rowIndex, p)
                        {
                            p.body = '<p class="x-usernotes-content">' + record.data.note + '</p>';
                            return 'x-grid3-row-expanded';
                        }
                    }

                }]
            })
        });
    }

});

Ext.reg('usernotes', Ext.ux.UserNotes);
