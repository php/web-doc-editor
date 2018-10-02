Ext.ux.IFrameComponent = Ext.extend(Ext.BoxComponent, {

    frame: null,

    setUrl : function(url) {
        this.frame.src = url;
    },

    onRender : function(ct, position){

        ct.mask(
            '<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" /> '+
            _('Loading...')
        );

        this.frame    = document.createElement('iframe'),
            callback = function(e) {
                ct.unmask();
            };

        this.frame.id = this.id;
        this.frame.name = this.id;
        this.frame.src = this.url;
        this.frame.frameBorder = 0;

        this.el = ct.appendChild(this.frame);

        if(Ext.isIE) {
            document.frames[this.url].name = this.id;
        }

        this.frame[ Ext.isIE?'onreadystatechange':'onload'] = callback.createDelegate(this.frame);

    }
});
