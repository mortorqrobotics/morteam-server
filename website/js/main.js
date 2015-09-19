function getUsername(){
  return localStorage.username || sessionStorage.username;
}
function getToken(){
  return localStorage.token || sessionStorage.token;
}
function getId(){
  return localStorage.id || sessionStorage.id;
}
function removeFromStorage(key){
  if (localStorage.getItem(key) != null){
    localStorage.removeItem(key);
  }else if(sessionStorage.getItem(key) != null){
    sessionStorage.removeItem(key);
  }else{
    console.log("item was not found in storage");
  }
}
$(document).ready(function(){
  if(getToken()){
    $("#logged-in-info").removeClass("hidden");
    $("#username-display").html(getUsername());
  }else{
    $("#logged-out-info").removeClass("hidden");
  }

  $(".logout-btn").click(function(){
    $.post("/f/logout", JSON.stringify({"id": getId(), "token": getToken()}), function(responseText){
      if(responseText == "success"){
        removeFromStorage("id");
        removeFromStorage("token");
        removeFromStorage("username");
        removeFromStorage("firstname");
        removeFromStorage("lastname");
        removeFromStorage("email");
        removeFromStorage("phone");
        location="login";
      }
    });
  })
})
