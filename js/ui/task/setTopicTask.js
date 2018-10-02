Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.setTopicTask = function(config)
{
    Ext.apply(this, config);
    var isLang = this.isLang;
    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task    : 'setTopic',
            content : this.content,
            lang : isLang ? 'lang' : 'global'
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText),
                topic = PhDOE.topic[isLang ? 'lang' : 'global'];

            // We update the topic information
            topic.author = o.author;
            topic.content = o.content;
            topic.topicDate = Date.parseDate(o.topicDate, 'Y-m-d H:i:s');
            topic.topicDate = topic.topicDate.format(_('Y-m-d, H:i'));

            // We set the topic
            PhDOE.setTopic(isLang);

        }
    });
};
