// usage:
// sendAjax(method, url, [data], success, [fail], [options])
// this function will live forever
function sendAjax() {
	// shift removes the first element from the array and returns it
	// pop removes the last element from the array and returns it
	var args = Array.prototype.slice.call(arguments);
	var options = {};
	if (typeof (args.last()) == "object") {
		options = args.pop(); // any additional options
	}
	options.method = args.shift(); // method
	options.url = args.shift(); // url
	if (typeof args[0] != "function") {
		options.data = args.shift(); // request body
	}
	if (args.length > 0) {
		options.success = args[0]; // success handler
		if (args.length > 1) {
			options.error = args[1]; // fail handler
		}
	}
	$.ajax(options);
}

Array.prototype.last = function() {
	return this[this.length - 1];
};

function getUsername() {
	return localStorage.username || sessionStorage.username;
}
function getToken() {
	return localStorage.token || sessionStorage.token;
}
function getId() {
	return localStorage._id || sessionStorage._id;
}
function getTeams() {
	return JSON.parse(localStorage.teams) || JSON.parse(sessionStorage.teams);
}
function removeFromStorage(key) {
	if (localStorage.getItem(key) != null) {
		localStorage.removeItem(key);
	} else if (sessionStorage.getItem(key) != null) {
		sessionStorage.removeItem(key);
	} else {
		console.log("item was not found in storage");
	}
}
function createToken(size) {
	var token = "";
	for (var i = 0; i < size; i++) {
		var rand = Math.floor(Math.random() * 62);
		token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
	}
	return token;
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
	var hours = date.getHours();
	var suffix = hours < 12 ? "AM" : "PM";
	hours = (hours + 11) % 12 + 1; // probably too clever
	hours = hours.toString();

	var minutes = date.getMinutes().toString();
	if (minutes.length == 1) {
		minutes = "0" + minutes;
	}

	return hours + ":" + minutes + " " + suffix;
}
function removeHTML(text) {
	var replacements = [
		[/&/g, "&amp;"],
		[/</g, "&lt;"],
		[/>/g, "&gt;"]
	];
	for (var i = 0; i < replacements.length; i++) {
		text = text.replace(replacements[i][0], replacements[i][1]);
	}
	return text;
}
function normalizeDisplayedText(text) {
	return Autolinker.link(removeHTML(text));
}
$(document).ready(function() {
	$('#name_link').html(localStorage.firstname);
	$(".profile_id").not(".ejs").attr("src", localStorage.profpicpath + "-60");

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
	$(document).on("click", "#logout_button", function() {
		$.post("/f/logout", JSON.stringify({"id": getId(), "token": getToken()}), function(responseText) {
			if (responseText == "success") {
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
	$(document).on("click", "#view_prof_button", function() {
		location="u/"+localStorage._id;
	});
	$("#view_prof_button_ejs").click(function() {
		location="../u/"+localStorage._id;
	});

	$("#aboutus_link").click(function() {
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
	$(document).on("click", ".user-link", function() {
		location="/u/"+$(this).attr("data-userid");
	})

	var typingTimer;
	var doneTypingInterval = 300;
	$(document).on("keyup", ".searchbox", function() {
		clearTimeout(typingTimer);
		typingTimer = setTimeout(doneTyping, doneTypingInterval);
	})
	$(document).on("keydown", ".searchbox", function() {
		clearTimeout(typingTimer);
	})
	function doneTyping() {
		if ($(".searchbox").val() != "") {
			$.post("/f/searchForUsers", {search: $(".searchbox").val()}, function(responseText) {
				if (responseText != "fail") {
					$(".search_drop").show();
					$(".search_drop_items").empty();
					var matchedUsers = responseText;
					for (var i = 0; i < matchedUsers.length; i++) {
						$(".search_drop_items").append('<li class="user-link" data-userid="'+matchedUsers[i]._id+'"><img id="small_prof_pic" src="'+matchedUsers[i].profpicpath+'-60" onError="this.src=\'../images/user.jpg\'"></img>&nbsp;&nbsp;<span style="vertical-align:middle;">'+matchedUsers[i].firstname + ' ' + matchedUsers[i].lastname+'</span></li>')
					}
				} else {
					$(".search_drop").hide();
				}
			})
		} else {
			$(".search_drop").hide();
		}
	}
	$(document).on("click", ".messageNotification", function() {
		location="chat";
	})
});
