Ext.namespace('ui','ui.task');

// config - { xmlID }
ui.task.GetFileInfoByXmlID = function(config)
{
    Ext.apply(this, config);

    // We load the File
    XHR({
        scope   : this,
        params  : {
            task  : 'getFileInfoByXmlID',
            xmlID : this.xmlID
        },
        success : function(r)
        {
            var o    = Ext.util.JSON.decode(r.responseText);

            ui.cmp.RepositoryTree.getInstance().openFile(
                'byPath',
                o.lang + o.path,
                o.name
            );
        }
    });
};
