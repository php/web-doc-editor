Ext.ux.IFrameComponent = Ext.extend(Ext.BoxComponent, {
    onRender : function(ct, position){

        ct.mask(
            '<img src="themes/img/loading.gif" ' +
                'style="vertical-align: middle;" /> '+
            _('Loading...')
        );

        var frame    = document.createElement('iframe'),
            callback = function(e) {
                ct.unmask();
            };

        frame.id = this.id;
        frame.name = this.id;
        frame.src = this.url;
        frame.frameBorder = 0;

        this.el = ct.appendChild(frame);

        if(Ext.isIE) {
            document.frames[this.url].name = this.id;
        }

        frame[ Ext.isIE?'onreadystatechange':'onload'] = callback.createDelegate(frame);

    }
});