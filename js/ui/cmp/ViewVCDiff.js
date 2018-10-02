Ext.namespace('ui','ui.cmp');

// ViewVCDiff
// config - {prefix, fid, fpath, fname, rev1, rev2}
ui.cmp.ViewVCDiff = Ext.extend(Ext.Panel,
{
    layout           : 'fit',
    title            : _('Diff From VCS'),
    iconCls          : 'iconDiffView',
    collapsedIconCls : 'iconDiffView',
    plugins          : [Ext.ux.PanelCollapsedTitle],

    initComponent    : function()
    {
        Ext.apply(this,
        {
            items : {
                id         : this.prefix + '-diff-' + this.fid,
                xtype      : 'panel',
                layout     : 'fit',
                items      : [
                    new Ext.ux.IFrameComponent({
                        id  : 'frame-' + this.prefix + '-diff-' + this.fid,
                        url : String.format(PhDOE.app.conf.viewVcUrl, this.fpath + this.fname, this.rev1, this.rev2)
                    })
                ]
            }
        });
        ui.cmp.ViewVCDiff.superclass.initComponent.call(this);
    }
});
