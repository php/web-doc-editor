Ext.namespace('ui','ui.cmp','ui.cmp._EntitiesAcronymsPanel');

//------------------------------------------------------------------------------
// EntitiesAcronymsGrid internals

ui.cmp._EntitiesAcronymsPanel.grid = Ext.extend(Ext.grid.GridPanel,
{
    onRowClick: function(grid)
    {
        var data = grid.getSelectionModel().getSelected().data;

        Ext.getCmp(this.dataType + '-details-' + this.fid).update(data.value);

    },

    onRowDblClick: function(grid)
    {
        var data           = grid.getSelectionModel().getSelected().data,
            cmp            = Ext.getCmp(this.prefix + '-' + this.ftype + '-FILE-' + this.fid),
            cursorPosition = Ext.util.JSON.decode(cmp.getCursorPosition()),
            dataInserted   = (this.dataType === 'entities') ? '&' + data.items + ';' : '<acronym>' + data.items + '</acronym>';

        //Insert the entities at the cursor position
        cmp.insertIntoLine(cursorPosition.line, cursorPosition.caracter, dataInserted);
    },

    initComponent : function()
    {
       var url;

       if( this.dataType === 'entities' ) {
           url = "./do/getEntities";
       } else if( this.dataType === 'acronyms' ) {
           url = "./do/getAcronyms";
       }

       Ext.apply(this, {
           region           : 'center',
           split            : true,
           loadMask         : true,
           autoScroll       : true,
           bodyBorder       : false,
           border           : false,
           autoExpandColumn : this.dataType,
           columns          : [
               {id: 'items', header: _('Items'), sortable: true, dataIndex: 'items'},
               {header: _('From'), sortable: true, dataIndex: 'from', width: 50}
           ],
           viewConfig : {
               forceFit      : true,
               emptyText     : '<div style="text-align: center">' + _('You must manually load this data.<br>Use the refresh button !') + '<br><br>'+_('(You can change this behavior by setting an option in the configuration window)') + '</div>',
               deferEmptyText: false
           },
           sm         : new Ext.grid.RowSelectionModel({singleSelect: true}),
           store      : new Ext.data.Store({
               autoLoad : this.loadStore,
               proxy    : new Ext.data.HttpProxy({
                   url : url
               }),
               listeners: {
                   scope : this,
                   load  : function()
                   {
                       if( this.dataType === 'entities' ) {
                           Ext.getCmp(this.prefix + '-' + this.fid).panEntities = true;
                       } else if( this.dataType === 'acronyms' ) {
                           Ext.getCmp(this.prefix + '-' + this.fid).panAcronyms = true;
                       }
                       Ext.getCmp('main-panel').fireEvent('tabLoaded', this.prefix, this.fid);
                   }

               },
               reader : new Ext.data.JsonReader(
               {
                   root          : 'Items',
                   totalProperty : 'nbItems',
                   idProperty    : 'id',
                   fields        : [
                       {name : 'id'},
                       {name : 'from'},
                       {name : 'items'},
                       {name : 'value'}
                   ]
               })
           }),
           tbar: [
           {
                scope   : this,
                tooltip : _('<b>Load/Refresh</b>'),
                iconCls : 'iconRefresh',
                handler : function()
                {
                    this.store.reload();
                }
            },
               _('Filter: '), ' ',
               new Ext.form.TwinTriggerField({
                    width           : 180,
                    hideTrigger1    : true,
                    enableKeyEvents : true,
                    validateOnBlur  : false,
                    validationEvent : false,
                    trigger1Class   : 'x-form-clear-trigger',
                    trigger2Class   : 'x-form-search-trigger',
                    listeners : {
                        specialkey : function(f, e)
                        {
                            if (e.getKey() === e.ENTER) {
                                this.onTrigger2Click();
                            }
                        }
                    },
                    onTrigger1Click: function()
                    {
                        this.setValue('');
                        this.triggers[0].hide();
                        this.setSize(180,10);
                        this.ownerCt.ownerCt.store.clearFilter();
                    },
                    onTrigger2Click: function()
                    {
                        var v = this.getValue(), regexp;

                        if (v === '' || v.length < 3) {
                            this.markInvalid(
                                _('Your filter must contain at least 3 characters')
                            );
                            return;
                        }
                        this.clearInvalid();
                        this.triggers[0].show();
                        this.setSize(180,10);

                        regexp = new RegExp(v, 'i');

                        // We filter on 'from', 'items', 'value'
                        this.ownerCt.ownerCt.store.filterBy(function(record) {

                            if( regexp.test(record.data.from)  ||
                                regexp.test(record.data.items) ||
                                regexp.test(record.data.value)
                            ) {
                                return true;
                            } else {
                                return false;
                            }
                        }, this);
                    }
                })
           ]
       });
       ui.cmp._EntitiesAcronymsPanel.grid.superclass.initComponent.call(this);

       this.on('rowclick',    this.onRowClick,    this);
       this.on('rowdblclick', this.onRowDblClick, this);

    }
});


//------------------------------------------------------------------------------
// EntitiesAcronymsGrid
// config - {prefix, fid, ftype, loadStore}
ui.cmp.EntitiesAcronymsPanel = Ext.extend(Ext.Panel,
{
    initComponent : function()
    {
        var panelDesc;

        if( this.dataType === 'entities' ) {
            panelDesc = _('Click on a row to display the content of the entitie.<br>Double-click on it to insert it at the cursor position.');
        } else if( this.dataType === 'acronyms' ) {
            panelDesc = _('Click on a row to display the content of the acronym.<br>Double-click on it to insert it at the cursor position.');
        }

        Ext.apply(this,
        {
            layout: 'border',
            border: false,
            items : [
                new ui.cmp._EntitiesAcronymsPanel.grid({
                    dataType : this.dataType,
                    prefix   : this.prefix,
                    fid      : this.fid,
                    ftype    : this.ftype,
                    loadStore: this.loadStore
                }),
                {
                    xtype        : 'panel',
                    id           : this.dataType + '-details-'+this.fid,
                    region       : 'south',
                    split        : true,
                    height       : 100,
                    autoScroll   : true,
                    bodyBorder   : false,
                    bodyCssClass : this.dataType + '-details',
                    html         : panelDesc
                }
            ]
        });

        ui.cmp.EntitiesAcronymsPanel.superclass.initComponent.call(this);
    }
});
