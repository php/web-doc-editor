Ext.namespace('ui','ui.task');

// config - { item, value, [notify=true] }
ui.task.setTopicTask = function(config)
{
    Ext.apply(this, config);
    
    // Apply modification in DB
    XHR({
        scope   : this,
        params  : {
            task    : 'setTopic',
            content : this.content
        },
        success : function(r)
        {
            var o = Ext.util.JSON.decode(r.responseText);
            
            // We update the topic information
            PhDOE.topic.author = o.author;
            PhDOE.topic.content = o.content;
            PhDOE.topic.topicDate = Date.parseDate(o.topicDate, 'Y-m-d H:i:s');
            PhDOE.topic.topicDate = PhDOE.topic.topicDate.format(_('Y-m-d, H:i'));
            
            // We set the topic
            PhDOE.setTopic();
            
        }
    });
};