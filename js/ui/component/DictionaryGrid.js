Ext.namespace('ui','ui.component','ui.component._DictionaryGrid');

//------------------------------------------------------------------------------
// DictionaryGrid internals
ui.component._DictionaryGrid.store = Ext.extend(Ext.data.Store,
{    
    proxy    : new Ext.data.HttpProxy({
        url : "./do/getDictionaryWords"
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
        {
            name : 'id'
        },

        {
            name : 'valueEn'
        },

        {
            name : 'valueLang'
        },

        {
            name : 'lastUser',
            hideField : true
        },

        {
            name : 'lastDate',
            type : 'date',
            dateFormat : 'Y-m-d H:i:s',
            hideField : true
        }
        ]
    }),
    sortInfo : {
        field     : 'valueEn',
        direction : 'ASC'
    },
    listeners: {
        load: function() {
            if( PhDOE.userLogin != "anonymous" ) {
                // Enable the "add new word" button"
                Ext.getCmp(this.fid + '-btn-new-word').enable();
            }
        }
    },
    initComponent : function(config)
    {
       Ext.apply(this, config);
       ui.component._DictionaryGrid.store.superclass.initComponent.call(this);
    }

});

ui.component._DictionaryGrid.editor = Ext.extend(Ext.ux.grid.RowEditor,
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

                    record.set('lastUser', PhDOE.userLogin);
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
            if( editor.record.data.id == "new" ) {
                editor.record.store.remove(editor.record);
            }
        }
    }
});

ui.component._DictionaryGrid.sm = Ext.extend(Ext.grid.RowSelectionModel,
{
    singleSelect: true
}
);

ui.component._DictionaryGrid.viewConfig = {
    forceFit      : true,
    emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '</div>',
    deferEmptyText: false
};

ui.component._DictionaryGrid.menu = Ext.extend(Ext.menu.Menu,
{
    setRowIdx: function(rowIdx) {
        this.rowIdx = rowIdx;
    },

    initComponent : function(config)
    {
        Ext.apply(this,{

            items  : [{
                scope   : this,
                text    : _('Delete this word'),
                iconCls : 'iconDelete',
                disabled: (PhDOE.userLogin == "anonymous"),
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
        ui.component._DictionaryGrid.menu.superclass.initComponent.call(this);
    }
});

ui.component._DictionaryGrid.grid = Ext.extend(Ext.grid.GridPanel,
{
    onRowContextMenu: function(grid, rowIndex, e)
    {
        e.stopEvent();
        this.getSelectionModel().selectRow(rowIndex);

        if( ! this.menu ) {
            this.menu = new ui.component._DictionaryGrid.menu({grid: grid});
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
                   header: String.format(_('{0} word'), PhDOE.userLang.ucFirst() ),
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
           viewConfig       : ui.component._DictionaryGrid.viewConfig,
           sm               : new ui.component._DictionaryGrid.sm(),
           store            : new ui.component._DictionaryGrid.store({ fid : this.fid}),
           plugins          : [new ui.component._DictionaryGrid.editor()],
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
                    var record = Ext.data.Record.create([{
                        name: 'id'
                    }, {
                        name: 'valueEn'
                    }, {
                        name: 'valueLang'
                    },{
                        name: 'lastUser'
                    },{
                        name: 'lastDate'
                    }]);

                    var newDate = new Date();

                    var e = new record({
                        id: 'new',
                        valueEn: '',
                        valueLang: '',
                        lastUser: PhDOE.userLogin,
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
       ui.component._DictionaryGrid.grid.superclass.initComponent.call(this);

       this.on('rowcontextmenu', this.onRowContextMenu, this);
    }
});


//------------------------------------------------------------------------------
// DictionaryGrid
// config - {prefix, fid, ftype, loadStore}
ui.component.DictionaryGrid = Ext.extend(Ext.Panel,
{
    initComponent : function()
    {
        Ext.apply(this,
        {
            layout: 'border',
            border: false,
            items : [
                new ui.component._DictionaryGrid.grid({
                    dataType          : this.dataType,
                    prefix            : this.prefix,
                    fid               : this.fid,
                    ftype             : this.ftype,
                    loadStore         : this.loadStore
                })
            ]
        });
        ui.component.DictionaryGrid.superclass.initComponent.call(this);
    }
});