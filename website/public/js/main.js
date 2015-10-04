function getUsername(){
  return localStorage.username || sessionStorage.username;
}
function getToken(){
  return localStorage.token || sessionStorage.token;
}
function getId(){
  return localStorage.id || sessionStorage.id;
}
function getTeams(){
  return JSON.parse(localStorage.teams) || JSON.parse(sessionStorage.teams);
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
function getTimeNow() {
    var now = new Date();
    var Hours = now.getHours();
    var suffix;
    if (parseInt(Hours) > 12) {
        Hours = (parseInt(Hours) - 12).toString();
        suffix = "PM";
    } else if (Hours == "12") {
        suffix = "PM";
    } else {
        suffix = "AM";
    }
    var Minutes = now.getMinutes();
    if (parseInt(Minutes) < 10) {
        Minutes = "0" + Minutes;
    }
    return Hours + ":" + Minutes + " " + suffix;
}
function standardizeTime(date) {
    var Hours = date.getHours();
    var suffix;
    if (parseInt(Hours) > 12) {
        Hours = (parseInt(Hours) - 12).toString();
        suffix = "PM";
    } else if (Hours == "12") {
        suffix = "PM";
    } else {
        suffix = "AM";
    }
    var Minutes = date.getMinutes();
    if (parseInt(Minutes) < 10) {
        Minutes = "0" + Minutes;
    }
    return Hours + ":" + Minutes + " " + suffix;
}
$(document).ready(function(){
  $('#name_link').html(localStorage.firstname);

  var fade_speed = 200;
  $('#notif_button').click(function() {
      $('#notif_drop').fadeIn(fade_speed).removeClass("hidden")
      $('.triangle_thing_notif').fadeIn(fade_speed).removeClass("hidden")
      $('#darken').fadeIn(fade_speed).removeClass("hidden")
      $('#notif_button').addClass('active');
      $('#darken').click(function() {
          $(this).fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('#notif_drop').fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('.triangle_thing_notif').fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('#notif_button').removeClass('active');
      });
  });
  $('.profile_id').click(function() {
      $('#prof_drop').fadeIn(fade_speed).removeClass("hidden");
      $('.triangle_thing_prof').fadeIn(fade_speed).removeClass("hidden");
      $('#darken').fadeIn(fade_speed).removeClass("hidden");
      $('#darken').click(function() {
          $(this).fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('#prof_drop').fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('.triangle_thing_prof').fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
      });
  });
  $('.profile_name').click(function() {
      $('#prof_drop').fadeIn(fade_speed).removeClass("hidden");
      $('.triangle_thing_prof').fadeIn(fade_speed).removeClass("hidden");
      $('#darken').fadeIn(fade_speed).removeClass("hidden");
      $('#darken').click(function() {
          $(this).fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('#prof_drop').fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
          $('.triangle_thing_prof').fadeOut(fade_speed, function() {
              $(this).addClass("hidden")
          });
      });
  });
  $(document).on("click", "#logout_button", function(){
    $.post("/f/logout", JSON.stringify({"id": getId(), "token": getToken()}), function(responseText){
      if(responseText == "success"){
        removeFromStorage("id");
        removeFromStorage("username");
        removeFromStorage("firstname");
        removeFromStorage("lastname");
        removeFromStorage("email");
        removeFromStorage("phone");
        removeFromStorage("teams");
        removeFromStorage("c_team");
        removeFromStorage("c_team_position");
        location="login";
      }
    });
  });
  $(document).on("click", "#view_prof_button", function(){
    location="u/"+localStorage.id;
  });
  $("#view_prof_button_ejs").click(function(){
    location="../u/"+localStorage.id;
  });

  $("#aboutus_link").click(function(){
    location="about";
  });
  $(".menu").click(function() {
    if ($(".nav_dropdown").css("top").indexOf("-") != -1) {
        $(".nav_dropdown").velocity({
            top: "40px"
        }, 200);
    } else {
        $(".nav_dropdown").velocity({
            top: "-215px"
        }, 200);
    }
  });
  $(document).on("click", ".user-link", function(){
    location="/u/"+$(this).attr("data-userid");
  })

});
