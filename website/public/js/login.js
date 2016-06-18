$(document).ready(function() {

	// clear cache and reset cookies and localStorage for update if not already done
	var resetCount = 1; // increment this whenever another reset is needed
	if (parseInt(localStorage.resets).toString() != localStorage.resets || localStorage.resets < resetCount) {
		sessionStorage.clear();
		localStorage.clear();
		localStorage.resets = resetCount;
		document.cookie = "connect.sid=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
		location.reload(true);
	}

	$("#username_box").focus();
	$("#login_button").click(function() {
		var $this = $(this);
		$(this).val("Logging in...");
		$(this).prop("disabled",true);
		var username = $.trim($("#username_box").val());
		var password = $("#password_box").val();
		sendAjax("POST", "/login", {
			"username": username,
			"password": password,
			"rememberMe": $('#remember_box').is(':checked')
		}, function(user) {
			if (["inc/username", "inc/password", "fail"].indexOf(user) == -1) {
				localStorage.username = user.username;
				localStorage.firstname = user.firstname;
				localStorage.lastname = user.lastname;
				localStorage._id = user._id;
				localStorage.phone = user.phone;
				localStorage.email = user.email;
				localStorage.teams = JSON.stringify(user.teams);
				localStorage.profpicpath = user.profpicpath;
				if (user.teams && user.teams.length > 0) {
					if (user.current_team) {
						localStorage.c_team = user.current_team.id;
						localStorage.c_team_position = user.current_team.position;

						// for morscout
						localStorage.teamNumber = user.current_team.number;
						localStorage.teamName = user.current_team.name;
					}
				}

				// TODO: does this always work right?
				var host = location.host;
				var lastIndex = host.lastIndexOf(".");
				var secondLastIndex = host.slice(0, lastIndex).lastIndexOf(".");
				if (secondLastIndex == -1) {
					secondLastIndex = 0;
					host = "." + host;
				}
				// suffix will be something like ".morteam.com"
				var suffix = host.slice(secondLastIndex));

				if (location.search == "?scout") {
					location.assign("http://scout" + suffix);
				} else if (location.seach == "?map") {
					location.assign("http://map" + suffix);
				} else {
					location.assign("/");
				}

			} else if (user == "inc/password" || user == "inc/username") {
				alert("incorrect username/password");
				$this.val("Log in");
				$this.prop("disabled",false);
			} else {
				alert(user);
				$this.val("Log in");
				$this.prop("disabled",false);
			}
		});
	});

	$(document).keypress(function(e) {
		if (e.which == 13) {
			if ($("#password_box").is(":focus")) {
				$("#login_button").trigger("click");
			} else if ($("#username_box").is(":focus")) {
				$("#password_box").focus();
			}
		}
	});
});
