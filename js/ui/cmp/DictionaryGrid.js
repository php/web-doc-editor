Ext.namespace('ui','ui.cmp','ui.cmp._DictionaryGrid');

//------------------------------------------------------------------------------
// DictionaryGrid internals
ui.cmp._DictionaryGrid.store = Ext.extend(Ext.data.Store,
{
    proxy    : new Ext.data.HttpProxy({
        url : "./do/getDictionaryWords"
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'valueEn'},
            {name : 'valueLang'},
            {name : 'lastUser', hideField : true},
            {name : 'lastDate', type : 'date', dateFormat : 'Y-m-d H:i:s', hideField : true}
        ]
    }),
    sortInfo : {
        field     : 'valueEn',
        direction : 'ASC'
    },
    listeners: {
        load: function() {
            if( !PhDOE.user.isAnonymous ) {
                // Enable the "add new word" button"
                Ext.getCmp(this.fid + '-btn-new-word').enable();
            }
        }
    },

    initComponent : function(config)
    {
       Ext.apply(this, config);
       ui.cmp._DictionaryGrid.store.superclass.initComponent.call(this);
    }

});

ui.cmp._DictionaryGrid.editor = Ext.extend(Ext.ux.grid.RowEditor,
{
    saveText   : _('Update'),
    cancelText : _('Cancel'),
    listeners  : {
        afteredit: function(editor, changes, record, rowIdx)
        {
            XHR({
                params : {
                    task      : 'manageDictionaryWord',
                    wordId    : record.data.id,
                    valueEn   : record.data.valueEn,
                    valueLang : record.data.valueLang
                },
                success : function(r)
                {
                    var o = Ext.util.JSON.decode(r.responseText);

                    record.set('lastUser', PhDOE.user.login);
                    record.set('lastDate', Date.parseDate(o.dateUpdate, 'Y-m-d H:i:s'));

                    record.commit();

                    // Notify
                    PhDOE.notify('info', _('Word in dictionary added/updated'), _('The word have been added/updated successfully !'));
                },
                failure : function()
                {
                    PhDOE.winForbidden();
                }
            });
        },
        canceledit: function(editor) {
            // If we cancel Edit on a new word
            if( editor.record.data.id === "new" ) {
                editor.record.store.remove(editor.record);
            }
        }
    }
});

ui.cmp._DictionaryGrid.sm = Ext.extend(Ext.grid.RowSelectionModel,
{
    singleSelect: true
}
);

ui.cmp._DictionaryGrid.viewConfig = {
    forceFit      : true,
    emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
    deferEmptyText: false
};

ui.cmp._DictionaryGrid.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIdx: function(rowIdx) {
        this.rowIdx = rowIdx;
    },

    initComponent : function()
    {
        Ext.apply(this,{

            items  : [{
                scope   : this,
                text    : _('Delete this word'),
                iconCls : 'iconTrash',
                disabled: (PhDOE.user.isAnonymous),
                handler : function()
                {
                    XHR({
                        scope  : this,
                        params : {
                            task   : 'delDictionaryWord',
                            wordId : this.grid.store.getAt(this.rowIdx).data.id
                        },
                        success : function()
                        {
                            this.grid.store.remove(this.grid.store.getAt(this.rowIdx));

                            // Notify
                            PhDOE.notify('info', _('Word deleted'), _('The word was deleted successfully !'));

                        },
                        failure : function()
                        {
                            PhDOE.winForbidden();
                        }
                    });

                }
            }]
        });
        ui.cmp._DictionaryGrid.menu.superclass.initComponent.call(this);
    }
});

ui.cmp._DictionaryGrid.grid = Ext.extend(Ext.grid.GridPanel,
{
    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
        this.getSelectionModel().selectRow(rowIndex);

        if( ! this.menu ) {
            this.menu = new ui.cmp._DictionaryGrid.menu({grid: grid});
        }
        this.menu.setRowIdx(rowIndex);
        this.menu.showAt(e.getXY());
    },

    initComponent : function()
    {
       Ext.apply(this, {
           region           : 'center',
           split            : true,
           loadMask         : true,
           autoScroll       : true,
           bodyBorder       : false,
           border           : false,
           autoExpandColumn : this.dataType,
           columns          : [
               {
                   id: 'id',
                   header: _('En word'),
                   sortable: true,
                   dataIndex: 'valueEn',
                   editor    : {
                       xtype : 'textfield'
                   }
               },
               {
                   header: String.format(_('{0} word'), PhDOE.user.lang.ucFirst() ),
                   sortable: true,
                   dataIndex: 'valueLang',
                   editor    : {
                       xtype : 'textfield'
                   }
               },
               {
                   header: _('Last User Update'),
                   sortable: true,
                   dataIndex: 'lastUser',
                   editor    : {
                       xtype     : 'displayfield',
                       hideField : true
                   }
               },
               {
                   header: _('Last Date Update'),
                   sortable: true,
                   dataIndex: 'lastDate',
                   editor    : {
                       xtype : 'displayfield',
                       hideField : true
                   },
                   renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
               }
           ],
           viewConfig       : ui.cmp._DictionaryGrid.viewConfig,
           sm               : new ui.cmp._DictionaryGrid.sm(),
           store            : new ui.cmp._DictionaryGrid.store({ fid : this.fid}),
           plugins          : [new ui.cmp._DictionaryGrid.editor()],
           tbar: [
           {
                scope   : this,
                tooltip : _('<b>Load/Refresh</b>'),
                iconCls : 'iconRefresh',
                handler : function()
                {
                    this.store.reload();
                }
           }, '->', {
                scope   : this,
                id      : this.fid + '-btn-new-word',
                disabled: true,
                text    : _('Add a new word'),
                iconCls : 'iconNewWord',
                handler : function()
                {
                    var Record = Ext.data.Record.create([{
                            name: 'id'
                        }, {
                            name: 'valueEn'
                        }, {
                            name: 'valueLang'
                        },{
                            name: 'lastUser'
                        },{
                            name: 'lastDate'
                        }]),
                    newDate = new Date(),
                    e = new Record({
                        id: 'new',
                        valueEn: '',
                        valueLang: '',
                        lastUser: PhDOE.user.login,
                        lastDate: newDate
                    });

                    this.plugins[0].stopEditing();
                    this.store.insert(0, e);
                    this.getView().refresh();
                    this.getSelectionModel().selectRow(0);
                    this.plugins[0].startEditing(0);
                }
           }
           ]
       });
       ui.cmp._DictionaryGrid.grid.superclass.initComponent.call(this);

       this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});


//------------------------------------------------------------------------------
// DictionaryGrid
// config - {prefix, fid, ftype, loadStore}
ui.cmp.DictionaryGrid = Ext.extend(Ext.Panel,
{
    initComponent : function()
    {
        Ext.apply(this,
        {
            layout: 'border',
            border: false,
            items : [
                new ui.cmp._DictionaryGrid.grid({
                    dataType : this.dataType,
                    prefix   : this.prefix,
                    fid      : this.fid,
                    ftype    : this.ftype,
                    loadStore: this.loadStore
                })
            ]
        });
        ui.cmp.DictionaryGrid.superclass.initComponent.call(this);
    }
});
