function apiFail(){
    $("#alerts").text("Authentication failed :(");
}

var existingPromise=false;

$(document).ready(function(){
    //if there is a key in cookies, put it into the input for ease of use
    var creds = Cookies.get("r34-api-credentials")
    if (creds){
        $("#key-input").val(creds);
    }

    //check key is valid, if it is, go back to last url
    $("#submit-button").click(function(){
        if (!(existingPromise)){
            //get value of creds from input and put into url
            var creds = $("#key-input").val();
            var url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=0${creds}`;

            //make post request
            existingPromise=true;
            $("#alerts").text("Authenticating...");
            $.ajax({
                url:url,
                success:function(data){
                    //check if error message got recieved
                    if (data != "Missing authentication. Go to api.rule34.xxx for more information"){
                        //add credentials to cookies, and redirect back to normal site
                        Cookies.set("r34-api-credentials",creds,{ expires: 30 })

                        var url = Cookies.get("last-url");
                        if (!(url)){
                            url = new URL(".",window.location.href).href;
                        }
                        $(location).attr('href',url);
                    }
                    else{
                        apiFail()
                    }
                    existingPromise=false;
                },
                error:function(){
                    apiFail()
                    existingPromise=false;
                }
            })
        }
    });

})