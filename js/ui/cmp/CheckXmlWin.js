Ext.namespace('ui','ui.cmp');

ui.cmp.CheckXmlWin = Ext.extend(Ext.Window,
{
    title      : _('XML Errors'),
    iconCls    : 'iconXml',
    width      : 650,
    height     : 350,
    layout     : 'fit',
    resizable  : false,
    modal      : true,
    autoScroll : true,
    closeAction: 'close',
    buttons    : [{
        text    : _('Close'),
        handler : function()
        {
            this.ownerCt.ownerCt.close();
        }
    }],

    store : new Ext.data.JsonStore({
        root          : 'Items',
        totalProperty : 'nbItems',
        fields        : [
            {name : 'line'},
            {name : 'libel'}
        ]
    }),

    addErrorsInStore : function() {

        var record = Ext.data.Record.create({name: 'line'}, {name: 'libel'});

        this.store.removeAll();

        for( i=0; i < this.errors.length; i++ ) {
            this.store.add( new record({'line': this.errors[i].line, 'libel' : this.errors[i].libel+"<br>"+Ext.util.Format.htmlEncode(this.errors[i].ctx1)}) );
        }

        this.store.sort('line', 'desc');
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [{
                xtype:'grid',
                store: this.store,
                loadMask: true,
                autoExpandColumn : 'libel_id',
                colModel: new Ext.grid.ColumnModel(
                    [{
                        header : _('Line'),
                        dataIndex : 'line',
                        sortable: true
                    },{
                        id : 'libel_id',
                        header : _('Libel'),
                        dataIndex: 'libel'
                    }]
                ),
                sm : new Ext.grid.RowSelectionModel({
                    singleSelect: true
                })
            }]
        });

        ui.cmp.CheckXmlWin.superclass.initComponent.call(this);

        // We add errors into the store
        this.addErrorsInStore();

        this.show();
    }
});
