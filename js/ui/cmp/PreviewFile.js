Ext.namespace('ui','ui.cmp');

ui.cmp.PreviewFile = Ext.extend(Ext.Window,
{
    id         : 'winPreviewFile',
    layout     : 'fit',
    title      : _('Preview'),
    iconCls    : 'iconView',
    closable   : true,
    closeAction: 'close',
    maximized  : true,
    modal      : true,
    buttons : [{
        text    : _('Close'),
        handler : function()
        {
            this.ownerCt.ownerCt.close();
        }
    }],

    initComponent : function()
    {
        var win = this;

        ui.cmp.PreviewFile.superclass.initComponent.call(this);

        XHR({
            params  : {
                task : 'previewFile',
                path : this.path
            },
            success : function(r)
            {
                var o = Ext.util.JSON.decode(r.responseText), frame;

                // We add a random string to the URL to not display the file cache
                o.url = o.url + '?' + Math.random();

                frame = new Ext.ux.IFrameComponent({ id: 'frame-previewFile', url: o.url });

                win.add(
                    frame
                );
                win.show();

            },
            failure : function()
            {
            }
        });

    }
});
