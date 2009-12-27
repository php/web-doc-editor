Ext.ux.IFrameComponent = Ext.extend(Ext.BoxComponent, {
    onRender : function(ct, position){
        this.el = ct.createChild({tag: 'iframe', id: this.id, frameBorder: 0, src: this.url});
    }
});