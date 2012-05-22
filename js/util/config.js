Ext.define("phpdoe.util.config",{
    singleton   : true,
    alternateClassName: ['config'],


    // static config
    NAME    : "Php Docbook Online Editor",


    // load dynamically config
    user : {
        userID: null,
        login: null,
        anonymousIdent: null,
        isAnonymous: null,
        haveKarma: false,
        authService: null,
        authServiceID: null,
        isGlobalAdmin: false,
        isLangAdmin: false,
        lang: null,
        conf: '',
        email: '',
        project : ''
    },

    topic : {
        global: {
            author: '',
            content: '',
            topicDate: ''
        },
        lang: {
            author: '',
            content: '',
            topicDate: ''
        }
    },

    appConf: {

    }

});