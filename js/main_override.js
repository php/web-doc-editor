Array.prototype.in_array = function(valeur) {
        for (var i in this) { if (this[i] == valeur) return true;}
        return false;
}

Ext.ux.IFrameComponent = Ext.extend(Ext.BoxComponent, {
     onRender : function(ct, position){
          this.el = ct.createChild({tag: 'iframe', id: 'iframe-'+ this.id, frameBorder: 0, src: this.url});
     }
});