
$(document).ready(function(){

    //group minimize button
    var minimizeBtn = $("#group-minimize").children()[1];
    $(minimizeBtn).click(function(){
        TagsContainer.minimizeGroup();
    })

    //search bar autocomplete
    $("#search-bar").on("input",function(){
        var value = $("#search-bar").val()
        if (value.length>0){
            Search.apiRequest(value,function(data){
                Search.clearResults();
                Search.expandResults(data);
            });
        }else{
            Search.minimiseResults();
        }
        
    })

    $("#rating").click(function(){
        var thisDom = $(this).children()[1];
        var ratings = [" all"," safe"," explicit"," questionable"];
        var index = (ratings.indexOf($(thisDom).text())+1)%ratings.length;
        $(thisDom).text(ratings[index]);
    })

    $("#sort").click(function(){
        var thisDom = $(this).children()[1];
        var sortTypes = [" default"," score"," updated"];
        var index = (sortTypes.indexOf($(thisDom).text())+1)%sortTypes.length;
        $(thisDom).text(sortTypes[index]);
    })

    $("#group-add").click(function(){
        TagsContainer
        .addGroup()
    })
});

//group class
class Group {
    constructor(label,symbol="~"){
        this.label = label;
        this.tagIDs = [];
        this.symbol = symbol;
    }

    addTag(tagID){
        this.tagIDs.push(tagID);
    }

    deleteTag(tagID){
        var index = this.tagIDs.indexOf(tagID);
        this.tagIDs.splice(index,1);
    }
}

//tag class
class Tag{
    constructor(label,groupID = null,value = null,symbol="+"){
        this.label = label;
        this.groupID = groupID;
        this.symbol = symbol;
        this.value = value;
    }
}


//Object that handles tags and groups
let TagsContainer =  {

    GroupList : {}, //table of group objects with ids
    TagList : {},   //table of tag objects with ids
    expandedGroup : null, //group id of the currently expanded group

    //expand a group by ID
    expandGroup(groupID){
        var [topLabel,tagContainer] = $("#group-expand").children();
        $(topLabel).removeClass("minimize");
        $(tagContainer).removeClass("minimize");
        var labelName = $(topLabel).children()[0];

        this.expandedGroup = groupID;
        var group = $("#g"+groupID);
        $(labelName).text($($(group).children()[0]).text());

        var groupTags = $(tagContainer).children();
        
        var id;
        for (tagDom of groupTags){
            id = $(tagDom).attr("id").substring(1);
            if (this.TagList[id].groupID == groupID){
                $(tagDom).css("display", "flex");
            }else{
                $(tagDom).css("display", "none");
            }
        }
    },

    //minimize an expanded group
    minimizeGroup(){
        var [topLabel,tagContainer] = $("#group-expand").children();
        $(topLabel).addClass("minimize");
        $(tagContainer).addClass("minimize");

        this.expandedGroup = null;
    },

    //create a new group with an initial name
    addGroup(label=null){

        //get group id number
        var num = Object.keys(this.GroupList).length;
        while (num.toString() in this.GroupList){
            num += 1;
        }
        var groupID = num.toString();

        label = label ? label : "group"+groupID;

        this.GroupList[groupID] = new Group(label);

        var groupDom = $($.parseHTML(
        `<span id="g${groupID}" class="filled no-overflow tag-container">
            <span class="input" role="textbox" contenteditable style="min-width:1em;">${label}</span>
            <button class="line-left tag-button"><i class="fas fa-less-than-equal"></i></button>
            <button class="line-left tag-button"><i class="fas fa-expand"></i></button>
            <button class="line-left tag-button"><i class="fas fa-times"></i></button>
        </span>`));
        
        //apply listener events to parts of group element
        //put each child of the group dom into a variable
        var [labelInput,typeBtn,expandBtn,closeBtn] = groupDom.children();
        
        //input listener
        $(labelInput).on("input",function(){
            var groupID = $($(this).parent()).attr("id").substring(1);
            TagsContainer.GroupList[groupID].label = $(this).text();
            if (TagsContainer.expandedGroup == groupID){
                $($($("#group-expand").children()[0]).children()[0]).text($(this).text());
            }
        });

        $(typeBtn).click(function(){
            var groupID = $($(this).parent()).attr("id").substring(1);
            TagsContainer.changeGroupSymbol(groupID)
        });

        //expand button listener
        $(expandBtn).click(function(){
            var groupID = $($(this).parent()).attr("id").substring(1);
            TagsContainer.expandGroup(groupID);
        });
        
        //delete button listener
        $(closeBtn).click(function(){
            var groupID = $($(this).parent()).attr("id").substring(1);
            TagsContainer.deleteGroup(groupID);
        });

        //add element to container
        $("#tags-container").append(groupDom);
    },

    //deletes a group by ID
    deleteGroup(groupID){
        $("#g"+groupID).remove();

        for (tagID of this.GroupList[groupID].tagIDs){
            delete this.TagList[tagID]
            $("#t"+tagID).remove()
        }

        delete this.GroupList[groupID]

        if (this.expandedGroup == groupID){this.minimizeGroup()
        }
    },

    //create a tag and if there is an expanded group add it to that instead
    addTag(label,value = null){
        if (!value){
            value = label.replace(/ /g,"_");
        }

        var num = Object.keys(this.TagList).length;
        while (num.toString() in this.TagList){
            num += 1;
        }
        var tagID = num.toString();

        var tagDom = $($.parseHTML(
        `<span id="t${tagID}" class="filled no-overflow tag-container">
            <button class="tag-button">${label}</button>
            <button class="line-left tag-button"><i class="fas fa-plus"></i></button>
        </span>`));
        
        var [closeBtn,typeBtn] = tagDom.children();

        $(closeBtn).click(function(){
            var tagID = $($(this).parent()).attr("id").substring(1);
            TagsContainer.deleteTag(tagID);
        });

        $(typeBtn).click(function(){
            var tagID = $($(this).parent()).attr("id").substring(1);
            TagsContainer.changeTagSymbol(tagID)
        });

        this.TagList[tagID] = new Tag(label,this.expandedGroup,value);
        if (this.expandedGroup){
            this.GroupList[this.expandedGroup].addTag(tagID);
            $("#group-tags-container").append(tagDom);
            $(typeBtn).remove()
        }else{
            $("#tags-container").append(tagDom);
        }
    },

    //delete a tag along with its references
    deleteTag(tagID){
        tag = this.TagList[tagID]
        if (tag.groupID){
            this.GroupList[tag.groupID].deleteTag(tagID);
        }

        $("#t"+tagID).remove()
        delete this.TagList[tagID];
    },

    changeGroupSymbol(groupID){
        var symbols = ["+","-","~"];
        var iconClasses = ["fa-plus","fa-minus","fa-less-than-equal"];
        var index = (symbols.indexOf(this.GroupList[groupID].symbol)+1)%symbols.length;
        this.GroupList[groupID].symbol = symbols[index];

        var icon = $($("#g"+groupID).children()[1]).children()[0];
        $(icon).removeClass();
        $(icon).addClass("svg-inline--fa "+iconClasses[index])
    },

    changeTagSymbol(tagID){
        var symbols = ["+","-"];
        var iconClasses = ["fa-plus","fa-minus"]
        var index = (symbols.indexOf(this.TagList[tagID].symbol)+1)%symbols.length;
        this.TagList[tagID].symbol = symbols[index];
        
        var icon = $($("#t"+tagID).children()[1]).children()[0];
        $(icon).removeClass();
        $(icon).addClass("svg-inline--fa "+iconClasses[index])
    },

    checkDuplicateLabel(label){

        var tag;
        for(tagID of Object.keys(this.TagList)){
            tag = this.TagList[tagID];
            if (tag.label == label && tag.groupID == this.expandedGroup){
                return true;
            }
        }

        return false;
    },

    compileTags(){
        var queryString = "";

        var minScore = $("#min-score").val();
        if (minScore){queryString += `score:>=${minScore} `}

        var rating = $($("#rating").children()[1]).text().substring(1);
        if (rating != "all"){queryString +=`rating:${rating} `} 

        var sort = $($("#sort").children()[1]).text().substring(1);
        if (sort != "default"){queryString +=`sort:${sort}:desc `} 


        //groupless tags first
        var tag;
        for (tagID of Object.keys(this.TagList)){
            tag = this.TagList[tagID];
            if(tag.groupID == null){
                if(tag.symbol == "-"){
                    queryString += "-";
                }
                queryString += tag.value +" ";
            }
        }
        var group;
        var groupQuery;
        for (groupID of Object.keys(this.GroupList)){
            group = this.GroupList[groupID];
            if(group.tagIDs.length > 0){
                groupQuery = "";
                
                for (groupTagID of group.tagIDs){
                    tag = this.TagList[groupTagID];
                    console.log(tag,!queryString.includes(tag))
                    if (!queryString.includes(tag)){
                        if (group.symbol == "-"){
                            groupQuery += "-";
                        }

                        groupQuery += tag.value +" ";
                        
                        if (group.symbol == "~"){
                            groupQuery += "~ ";
                        }
                    }
                }

                if (group.symbol == "~"){
                    queryString += "( " + groupQuery.slice(0,-3) +" ) ";
                }else{
                    queryString += groupQuery;
                }
            }
        }

        queryString = queryString.slice(0,-1);

        return queryString;
    }
};

class Result{
    constructor(label,value){
        this.label = label;
        this.value = value;
    }
}

let Search = {

    url:"https://api.rule34.xxx/autocomplete.php?q=",
    ResultList:[],

    apiRequest(query,callback = null){
        console.log()
        $.ajax({
            url:this.url+query.replace(" ","_"),
            success:function(data){
                data = JSON.parse(data);
                if (callback){callback(data);}
            },
        })
    },

    minimiseResults(){
        $("#search-result").addClass("minimize");
        $("#search-bar").val("")
    },

    expandResults(data){
        $("#search-result").removeClass("minimize");

        var result;
        var resultDOM;
        for(i in data){
            result = data[i];
            this.ResultList.push(new Result(result["label"],result["value"]));

            resultDOM = $($.parseHTML(`<li><button id="r${i.toString()}"  class="result-button line-top">${result["label"]}</button></li>`));
            $("#search-result").append(resultDOM);

            $("#r"+i.toString()).click(function(){
                
                var id = parseInt($(this).attr("id").substring(1));
                if(!TagsContainer.checkDuplicateLabel(Search.ResultList[id].label)){
                    TagsContainer.addTag(Search.ResultList[id].label,Search.ResultList[id].value);
                }
                Search.minimiseResults();
            })
        }
    },

    clearResults(){
        this.ResultList = [];
        $("#search-result").empty();
    },

    
}


