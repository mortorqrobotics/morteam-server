function hideLeftbar(time, button) {
	$(".leftbar").velocity({left: "-260px"}, { duration: time, queue: false });
	$(button).removeClass("glyphicon-chevron-left").addClass("glyphicon-chevron-right");
	$(button).velocity({left: "10px"}, { duration: time, queue: false });
}
function showLeftbar(time, button) {
	$(".leftbar").velocity({left: "0px"}, { duration: time, queue: false });
	$(button).removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-left");
	$(button).velocity({left: "220px"}, { duration: time, queue: false });
}

sendAjax("GET", "/teams/current/number", function(number) {
	var currentTeam = data[number];

	if (currentTeam) {
		var map = new google.maps.Map(document.getElementById("map"), {
			zoom: 15,
			center: new google.maps.LatLng(currentTeam.longitude, currentTeam.latitude),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		});
	} else {
		var map = new google.maps.Map(document.getElementById("map"), {
			zoom: 4,
			center: new google.maps.LatLng(39.9583086,-98.3331244),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		});
	}

	var infoWindow = new google.maps.InfoWindow();

	for (var team in data)(function() {
		var teamNum = team;

		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(data[team].longitude, data[team].latitude),
			map: map
		});

		google.maps.event.addListener(marker, "click", function() {
//						infoWindow.setContent("<a class='teamNumLink' style='cursor: pointer' target='_blank' >Team " + teamNum + "</a>");
//						infoWindow.open(map, marker);

			sendAjax("GET", ["teams/number", teamNum, "exists"], function(teams) {
				$(".leftbar").empty()

				if (team != "false" && team != "fail") {

					var teamDisplay = document.createElement("div");
					$(teamDisplay).addClass("leftbar_item");
					$(teamDisplay).addClass("bold");
					$(teamDisplay).attr("id", "teamNum");
					$(teamDisplay).append("Team " + team.number);
					$(teamDisplay).append("<br/>");
					$(teamDisplay).append("<span id='teamName'>"+team.name+"</span>");

					showLeftbar(300, $(".hide_leftbar")[0]);
					$("#leftbar").append($(teamDisplay))

				} else {
					var teamDisplay = document.createElement("div");
					$(teamDisplay).addClass("leftbar_item");
					$(teamDisplay).addClass("bold");
					$(teamDisplay).attr("id", "teamNum");
					$(teamDisplay).append("Team " + teamNum);

					showLeftbar(300, $(".hide_leftbar")[0]);
					$("#leftbar").append($(teamDisplay))
				}

				var TBALinkDiv = document.createElement("div");
				$(TBALinkDiv).addClass("leftbar_item");
				var TBALink = document.createElement("a");
				$(TBALink).attr("target", "_blank");
				$(TBALink).attr("href", "http://www.thebluealliance.com/team/" + teamNum);
				$(TBALink).html("Team " + teamNum + " on TheBlueAlliance");
				$(TBALinkDiv).append($(TBALink));
				$(".leftbar").append($(TBALinkDiv));

			})

		});
	})();
});

$(document).on("click", ".teamNumLink", function() {
	var $this = $(this);
	var clickedTeamNum = $.trim($(this).html().substring(5, 9))
	// TODO: this code looks just like the code above it...
	sendAjax("GET", ["teams/number", clickedTeamNum, "exists"], function(team) {
		$(".leftbar").empty()

		if (team != "false" && team != "fail") {

			var teamDisplay = document.createElement("div");
			$(teamDisplay).addClass("leftbar_item");
			$(teamDisplay).addClass("bold");
			$(teamDisplay).attr("id", "teamNum");
			$(teamDisplay).append(team.number);
			$(teamDisplay).append("<br/>");
			$(teamDisplay).append("<span id='teamName'>"+team.name+"</span>");

			showLeftbar(300, $(".hide_leftbar")[0]);
			$("#leftbar").append($(teamDisplay))

		} else {
			var teamDisplay = document.createElement("div");
			$(teamDisplay).addClass("leftbar_item");
			$(teamDisplay).addClass("bold");
			$(teamDisplay).attr("id", "teamNum");
			$(teamDisplay).append($this.html());

			showLeftbar(300, $(".hide_leftbar")[0]);
			$("#leftbar").append($(teamDisplay))
		}

		var TBALinkDiv = document.createElement("div");
		$(TBALinkDiv).addClass("leftbar_item");
		var TBALink = document.createElement("a");
		$(TBALink).attr("target", "_blank");
		$(TBALink).attr("href", "http://www.thebluealliance.com/team/" + $.trim($this.html().substring(5, 9)));
		$(TBALink).html("TheBlueAlliance Link For Team " + $.trim($this.html().substring(5, 9)));
		$(TBALinkDiv).append($(TBALink));
		$(".leftbar").append($(TBALinkDiv));

	})
})

$(".hide_leftbar").click(function() {
	if ($(this).hasClass("glyphicon-chevron-left")) {
		hideLeftbar(300, this);
	} else {
		showLeftbar(300, this);
	}
});

