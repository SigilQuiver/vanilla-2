
$.fn.isInViewport = function() {
    var elementTop = $(this).offset().top;
    var elementBottom = elementTop + $(this).outerHeight();

    var viewportTop = $(window).scrollTop();
    var viewportBottom = viewportTop + $(window).height();

    return (elementBottom > viewportTop) && (elementTop < viewportBottom);
};


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


function apiCredCheck(failCallback){
    //check cookies for api credentials
    var creds = Cookies.get("r34-api-credentials");
    console.log(creds);
    if (creds){
        var url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=0${creds}`;
        
        //make post request
        $.ajax({
            url:url,
            success:function(data){
                //check if error message got recieved
                if (data == "Missing authentication. Go to api.rule34.xxx for more information"){
                    failCallback();
                }
            },
            error:function(){
                failCallback();
            }
        })
    }else{
        failCallback();
    }
    
}

//redirect to api key screen
function apiFail(){
    var url = new URL("api-key.html",window.location.href).href;
    console.log(url);
    Cookies.set("last-url",window.location.href)
    $(location).attr('href',url);
}

$(document).ready(function(){
    console.log("floop you man")
    //check api credentials are good
    apiCredCheck(apiFail);

    //pause videos when offscreen
    $(window).on("scroll",function(){

        var graceperiod = window.innerHeight;
        var documentEnd = $(window).scrollTop() > document.body.offsetHeight-(window.innerHeight+graceperiod);
        if(PostManager.scrollReady && documentEnd){
            PostManager.appendPosts();
        }

        // Pause videos not in the viewport
        var videoList = document.getElementsByTagName("video");
        for (video of videoList){
            
            if (!$(video).isInViewport()){
                
                $(video).trigger("pause");
            }
            else{
                if (!video.paused){
                    console.log($(video).isInViewport())
                }
            }
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
            tag:[],
        };

        for (var t of this.tag_info){
            //edge case check for unknown tag type
            if (!(tagTypes[t.type])){
                tagTypes.tag.push({name:t.tag,count:t.count});
            }
            else{
                tagTypes[t.type].push({name:t.tag,count:t.count});
            }
            
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
    limit:4,
    postTotal:0,

    newPost(post){

        //creates elements for the post content, with their sample displayed first by default
        var media;
        var splash;
        var isVideo = false;
        if (post.file_url.slice(-4) == ".mp4"){
            media = `
            <video hidden controls loop preload="none" poster="${post.sample_url}">
                <source loading="lazy" src="${post.file_url}" type="video/mp4">
            </video>`

            splash = `
            <div class="splash-container video">
                <div class="splash-icon noclick tint">
                    <i class="fas fa-play noclick"></i>
                    <div>video</div>
                </div>

                <img loading="lazy" src="${post.sample_url}"></img>
            </div>`

            isVideo = true;

        }else if (post.file_url.slice(-4) == ".gif"){
            media = `<img hidden loading="lazy" src="${post.file_url}"></img>`
            splash = `
            <div class="splash-container gif">
                <div class="splash-icon noclick tint">
                    <i class="fas fa-play noclick absolute"></i>
                    <div>gif</div>
                </div>

                <img loading="lazy" src="${post.preview_url}"></img>
            </div>`
        }else{
            media = `<img hidden loading="lazy" src="${post.file_url}"></img>`

            splash = `
            <div class="splash-container">
                <img loading="lazy" src="${post.sample_url}"></img>
            </div>
            `
        }


        postInfo = "";

        //gets text (usually main artist) for the top right of posts
        var artists = post.getArtistsString();
        if (artists){
            postInfo += `<li><i class="fas fa-paintbrush"></i> ${artists}</li>`
        }
        
        //shell for posts
        var postDom = $.parseHTML(`
        <div class="rounded-only no-overflow post-container" style="order:${post.id}" id="p${post.id}">
            <div>
                <ul class="post-info">
                    <li><i class="fas fa-heart"></i> ${post.score}</li>
                    ${postInfo}
                </ul>
            </div>
            <div class="img-container-v">${splash}${media}</div>
            <button class="footer-button tag-button"><i class="fas fa-caret-down"></i><i class="fas fa-caret-up" style="display:none"></i></button>
            <div class="minimize no-overflow"><div class="tags-container border"></div></div>
            
        </div>`);

        //put each child of the post dom
        var [a,imgContainer,expandButton,postTags] = $(postDom).children();
        postTags = $(postTags).children()[0];

        var tagDom;
        var icon;
        var icons = {
            artist:"fas fa-paintbrush",
            character:"fas fa-user",
            copyright:"fas fa-copyright",
            metadata:"fas fa-wrench",
        }

        //swap between splash and media, unless it's a video which is one way
        var [splash,media] = $(imgContainer).children();

        $(splash).click(function(){
            var media = $($(this).parent()).children()[1];

            $(media).show()
            $(this).hide()

            if ($(this).hasClass("video")){
                $(media).get(0).play();
            }
        });

        //if it's not a video, allow second click to switch back to sample again
        if (!($(splash).hasClass("video"))){
            $(media).click(function(){
                var splash = $($(this).parent()).children()[0];

                $(this).hide()
                $(splash).show()
            });
        }

        //create button for each tag, with an icon, and put it into the tags container
        for (type of Object.keys(post.tagTypes)){
            icon = "";
            if (icons[type]){
                icon = `<i class="${icons[type]} no-click"></i> `;
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
        
        //expand button functionality
        $(expandButton).click(function(){
            var postTags = $($(this).parent()).children();
            let i = 0;
            while (!$(postTags[i]).hasClass("no-overflow")){
                i++;
            }
            postTags = postTags[i]
            var icons = $(this).children();
            if ($(postTags).hasClass("minimize")){
                $(postTags).removeClass("minimize");
                icons[0].style.display = "none";
                icons[1].style.display = "var(--fa-display,inline-block)";

            }else{
                $(postTags).addClass("minimize");
                icons[0].style.display = "var(--fa-display,inline-block)";
                icons[1].style.display = "none";
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

        var creds = Cookies.get("r34-api-credentials");
        var query = TagsContainer.compileTags();
        console.log(query);
        var url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&limit=${limit}&fields=tag_info&tags=${query}&pid=${pid}&json=1${creds}`;
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
                    //p.sample_url = p.sample_url.replace('api-cdn.','');
                    //p.file_url = p.file_url.replace('api-cdn.','');
                    //p.file_url = p.file_url.replace('api-cdn-mp4.','');
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
        var creds = Cookies.get("r34-api-credentials");
        var query = TagsContainer.compileTags();
        $.ajax({
            url:`https://api.rule34.xxx/index.php?page=dapi&s=post&limit=0&q=index&limit=0&tags=${query}${creds}`,
            success:function(data){
                PostManager.postResults = $($(data).children()[0]).attr("count");
                $("#post-results").text(PostManager.postResults+" results");
            }
        })
    }


}
