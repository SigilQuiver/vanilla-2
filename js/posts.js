function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

$(document).ready(function(){
    $(window).on("scroll",function(){

        var graceperiod = window.innerHeight*0.5;
        var documentEnd = $(window).scrollTop() > document.body.offsetHeight-(window.innerHeight+graceperiod);
        if(PostManager.scrollReady && documentEnd){
            PostManager.appendPosts();
        }
    })

    $("#search-button").click(function(){
        PostManager.initSearch();
    })
})


class Post{
    constructor(file_url,sample_url,tag_info,tags,source,score,id){
        this.file_url = file_url;
        this.sample_url = sample_url;
        this.tags = tags;
        this.tag_info = tag_info;
        this.source = source;
        this.score = score;
        this.id = id;
        this.tagTypes = this.getTags();
    }

    getTags(){
        var tagTypes = {
            artist:[],
            character:[],
            copyright:[],
            metadata:[],
            tag:[]
        };

        for (var t of this.tag_info){
            tagTypes[t.type].push({name:t.tag,count:t.count});
        }

        return tagTypes;
    }

    getArtistsString(){
        if (this.tagTypes.artist.length>0){
            var countlist = this.tagTypes.artist.map(t => t.count);
            var biggestTag = this.tagTypes.artist[indexOfMax(countlist)].name;
            biggestTag = biggestTag.replace(/_/g, " ");
            biggestTag = biggestTag.replace(/ *\([^)]*\) */g, "");
            return this.tagTypes.artist.length>1 ? biggestTag+` +${this.tagTypes.artist.length-1}` : biggestTag;
        }
    }

    getCharactersString(){
        if (this.tagTypes.character.length>0){
            var countlist = this.tagTypes.character.map(t => t.count);
            var biggestTag = this.tagTypes.character[indexOfMax(countlist)].name;
            biggestTag = biggestTag.replace(/_/g, " ");
            biggestTag = biggestTag.replace(/ *\([^)]*\) */g, "");
            return this.tagTypes.character.length>1 ? biggestTag+` +${this.tagTypes.character.length-1}` : biggestTag;
        }
    }
}

PostManager = {
    scrollReady:false,
    postResults:0,
    pageID:0,
    limit:5,
    postTotal:0,

    newPost(post){

        var media;
        if (post.file_url.slice(-4) == ".mp4"){
            media = `
            <video controls loop loading="lazy">
                <source src="${post.file_url}" type="video/mp4">
            </video>`
        }else{
            media = `<img src="${post.sample_url}" loading="lazy"></img>`
        }

        postInfo = "";

        var artists = post.getArtistsString();
        if (artists){
            postInfo += `<li><i class="fas fa-paintbrush"></i> ${artists}</li>`
        }
        
        var postDom = $.parseHTML(`
        <div class="rounded-only no-overflow post-container" style="order:${post.id}" id="p${post.id}">
            <div>
                <ul class="post-info">
                    <li><i class="fas fa-heart"></i> ${post.score}</li>
                    ${postInfo}
                </ul>
            </div>
            <div class="img-container-v">${media}</div>
            <div class="minimize no-overflow"><div class="tags-container border"></div></div>
            <button class="footer-button tag-button"><i class="fas fa-caret-down"></i></button>
        </div>`);

        var [a,b,postTags,expandButton] = $(postDom).children();
        postTags = $(postTags).children()[0];

        var tagDom;
        var icon;
        var icons = {
            artist:"fas fa-paintbrush",
            character:"fas fa-user",
            copyright:"far fa-copyright",
            metadata:"fas fa-wrench",
        }
        for (type of Object.keys(post.tagTypes)){
            icon = "";
            if (icons[type]){
                icon = `<i class="${icons[type]}"></i> `;
            }

            for (var t of post.tagTypes[type]){
                tagDom = $.parseHTML(`
                <span class="filled no-overflow tag-container">
                    <button class="tag-button">${icon}<span>${t.name}</span></button>
                </span>`);

                $($($(tagDom).children([0])).children([1])).click(function(){
                    QueryManager.tagNewWindow($(this).text());
                })


                $(postTags).append(tagDom);

            }
        }
        $(expandButton).click(function(){
            var postTags = $($(this).parent()).children()[2];
            if ($(postTags).hasClass("minimize")){
                $(postTags).removeClass("minimize");
            }else{
                $(postTags).addClass("minimize");
            }
        });

        return postDom
    },

    appendPosts(){
        if (this.pageID*this.limit<=this.postResults){
            this.apiRequest(this.pageID,this.limit,
                function(postList){
                    var postDom;
                    for(p of postList){
                        postDom = PostManager.newPost(p);
                        $("#posts-container").append(postDom);
                        PostManager.postTotal+=1;
                    }
            })
            this.pageID += 1;
        }
    },

    initSearch(){
        this.postList = {};
        this.scrollReady = true;
        this.apiPostNum();
        this.pageID = 0;
        $("#posts-container").empty();
        this.appendPosts();
    },

    apiRequest(pid,limit,callback=null){
        this.scrollReady = false;

        var query = TagsContainer.compileTags();
        console.log(query);
        var url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=${limit}&fields=tag_info&tags=${query}&pid=${pid}&json=1`;
        console.log(url)
        
        $.ajax({
            url:url,
            success:function(data){
                PostManager.scrollReady = true;
                var postList = [];
                var p;
                console.log(data);
                for (i in data){
                    p = data[i];
                    postList.push(new Post(p.file_url,p.sample_url,p.tag_info,p.tags,p.source,p.score,parseInt(i)+(pid*limit)))}
                console.log(postList);
                if (callback){callback(postList);}
            },
            error:function(){
                PostManager.scrollReady = true;
            }
        })
    },

    apiPostNum(){
        var query = TagsContainer.compileTags();
        $.ajax({
            url:`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=0&tags=${query}`,
            success:function(data){
                PostManager.postResults = $($(data).children()[0]).attr("count");
                $("#post-results").text(PostManager.postResults+" results");
            }
        })
    }


}