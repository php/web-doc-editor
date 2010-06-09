Ext.namespace('ui','ui.cmp','ui.cmp._CheckXmlWin');

ui.cmp._CheckXmlWin.store = new Ext.data.Store({
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        fields        : [
            {name : 'line'},
            {name : 'libel'}
        ]
    })
});

ui.cmp._CheckXmlWin.cm = new Ext.grid.ColumnModel([
    {
        header    : _('Line'),
        dataIndex : 'line'
    },
    {
        id        : 'libel_id',
        header    : _('Libel'),
        dataIndex : 'libel'
    }
]);


ui.cmp._CheckXmlWin.sm = new Ext.grid.RowSelectionModel({
    singleSelect: true
});

ui.cmp._CheckXmlWin.grid = Ext.extend(Ext.grid.GridPanel,
{
    loadMask         : true,
    autoExpandColumn : 'libel_id',
    cm               : ui.cmp._CheckXmlWin.cm,
    sm               : ui.cmp._CheckXmlWin.sm,
    store            : ui.cmp._CheckXmlWin.store,

    initComponent: function(config)
    {
        ui.cmp._CheckXmlWin.grid.superclass.initComponent.call(this);
        Ext.apply(this, config);
    }
});

ui.cmp.CheckXmlWin = Ext.extend(Ext.Window,
{
    id         : 'xml-errors-win',
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
            Ext.getCmp('xml-errors-win').close();
        }
    }],
    
    addErrorsInStore : function() {
        
        var record = Ext.data.Record.create({name: 'line'}, {name: 'libel'});

        for( i=0; i < this.errors.length; i++ ) {
            this.items.items[0].store.add( new record({'line': this.errors[i].line, 'libel' : this.errors[i].libel+"<br>"+Ext.util.Format.htmlEncode(this.errors[i].ctx1)}) );
        }
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : [new ui.cmp._CheckXmlWin.grid()]
        });
        
        ui.cmp.CheckXmlWin.superclass.initComponent.call(this);
        
        // We add errors into the store
        this.addErrorsInStore();
        
        this.show();
    }
});