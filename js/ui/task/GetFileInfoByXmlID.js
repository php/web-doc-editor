Ext.namespace('ui','ui.task');

// config - { xmlID }
ui.task.GetFileInfoByXmlID = function(config)
{
    Ext.apply(this, config);

    // We load the File
    XHR({
        scope  : this,
        params : {
            task     : 'getFileInfoByXmlID',
            xmlID : this.xmlID
        },
        success : function(response)
        {

            var o    = Ext.util.JSON.decode(response.responseText);

            ui.component.RepositoryTree.getInstance().openFile(
                o.lang + o.path,
                o.name
            );

        }
    });
};
