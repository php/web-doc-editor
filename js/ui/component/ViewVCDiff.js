Ext.namespace('ui','ui.component');

// ViewVCDiff
// config - {prefix, fid, fpath, fname, rev1, rev2}
ui.component.ViewVCDiff = Ext.extend(Ext.Panel,
{
    layout    : 'fit',
    title     : _('Diff From cvs'),
    height    : 150,
    collapsed : true,

    initComponent : function()
    {
        Ext.apply(this,
        {
            items : {
                id         : this.prefix + '-diff-' + this.fid,
                xtype      : 'iframepanel',
                loadMask   : true,
                defaultSrc : 'http://cvs.php.net/viewvc.cgi/phpdoc/en' +
                                this.fpath + this.fname +
                                '?r1=' + this.rev1 + '&r2=' + this.rev2
            }
        });
        ui.component.ViewVCDiff.superclass.initComponent.call(this);
    }
});
