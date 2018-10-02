// Copyright (c) 2010 David Davis - http://xant.us/
// License: MIT
Ext.ux.DblClickCloseTabs = Ext.extend( Object, {

    init: function( panel ) {
        this.panel = panel;
        panel.initEvents = panel.initEvents.createSequence( this.initEvents, this );
    },

    initEvents: function() {
        this.panel.mon(this.panel.strip, {
            dblclick: this.onDblClick.createDelegate( this, [ this.panel ], 0 )
        });
        // cleanup
        delete this.panel;
    },

    onDblClick: function(panel,e) {
        if( panel.getActiveTab().closable ) {
            panel.remove( panel.getActiveTab() );
        }
    }

});

Ext.preg( 'dblclickclosetabs', Ext.ux.DblClickCloseTabs );
