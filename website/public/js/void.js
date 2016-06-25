$(document).ready(function() {

	$(".show_join").click(function() {
		$(".void_left").empty();
		$(".void_right").empty();
		$(".void_left").removeClass("col-sm-6");
		$(".void_left").addClass("col-md-12");
		$(".void_left").append('<input class="void_input team_join_id" type="text" placeholder="Team Code"></input><br/><input class="team_join_btn button" type="button" value="Join"></input>');
		$(".team_join_id").focus();
	});
	$(".show_create").click(function() {
		$(".void_left").empty();
		$(".void_right").empty();
		$(".void_right").removeClass("col-sm-6");
		$(".void_right").addClass("col-md-12");
		$(".void_right").append('<input class="void_input team_num" type="text" placeholder="Team Number"></input><br/><input class="void_input team_name" type="text" placeholder="Team Name"></input><br/><input class="void_input team_id" type="text" placeholder="Choose Team ID"></input><br/><input type="button" class="button team_create_btn" value="Done"></input>');
	});

	$(document).on("click", ".team_create_btn", function() {
		sendAjax("POST", "/teams", {
			id: $(".team_id").val(),
			name: $(".team_name").val(),
			number: $(".team_num").val()
		}, function(response) {
			if (response == "success") {
				// TODO: the creator of a team should automatically be added to it
				var teamCode = $(".team_id").val();
				sendAjax("POST", ["teams/code", teamCode, "join"], function(teamId) {
					if (teamId == "fail") {
						return alert("fail");
					}

					localStorage.c_team = teamId;
					localStorage.c_team_position = "leader";
					location.assign("/");
				})
			} else {
				alert("failed, maybe try another team ID");
			}
		})
	});
	$(document).on("click", ".team_join_btn", function() {
		// TODO: very similar to some code right there ^^^
		var teamCode = $(".team_join_id").val();
		sendAjax("POST", ["teams/code", teamCode, "join"], function(teamId) {
			if (teamId == "fail") {
				return alert("fail");
			}

			localStorage.c_team = teamId;
			localStorage.c_team_position = "member";
			location.assign("/");
		})
	});
});
