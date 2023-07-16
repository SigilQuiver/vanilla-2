
$(document).ready(function(){
    QueryManager.checkForQuery();
});

var QueryManager = {

    urlBase: window.location.protocol + "//" + window.location.host + window.location.pathname,

    pushQuery(query){
        var newurl = urlBase+query;
        window.history.pushState({path:newurl},'',newurl);
    },

    tagNewWindow(tag){
        url = this.urlBase + `?tag=${tag}`;
        window.open(url);
    },

    checkForQuery(){
        const params = new URLSearchParams(window.location.search)
        const tag = params.get("tag");
        if(tag){
            console.log(params.get("tag"));
            TagsContainer.addTag(tag);
            PostManager.initSearch();
        }
    }
}
