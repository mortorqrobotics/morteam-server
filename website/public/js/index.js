var socket = io();
// socket.emit("add to clients", {_id: localStorage._id});

spinnerOpts = {
	lines: 13, // The number of lines to draw
	length: 0, // The length of each line
	width: 20, // The line thickness
	radius: 42, // The radius of the inner circle
	scale: .5, // Scales overall size of the spinner
	corners: 1, // Corner roundness (0..1)
	color: 'orange', // #rgb or #rrggbb or array of colors
	opacity: 0.25, // Opacity of the lines
	rotate: 0, // The rotation offset
	direction: 1, // 1: clockwise, -1: counterclockwise
	speed: 1, // Rounds per second
	trail: 60, // Afterglow percentage
	fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
	zIndex: 2e9, // The z-index (defaults to 2000000000)
	className: 'spinner', // The CSS class to assign to the spinner
	top: '50%', // Top position relative to parent
	left: '50%', // Left position relative to parent
	shadow: false, // Whether to render a shadow
	hwaccel: false, // Whether to use hardware acceleration
	position: 'absolute' // Element positioning
}


function messageNotification(title, content, chatid) {
	var newMessageNotice = new jBox('Notice', {
		attributes: {
			x: 'right',
			y: 'bottom'
		},
		theme: 'NoticeBorder',
		volume: 100,
		animation: {
			open: 'slide:bottom',
			close: 'slide:right'
		},
		content: content,
		maxWidth: 300,
		maxHeight: 105,
		title: title,
		closeOnClick: false,
		onOpen: function() {
			$($(this)[0].content).attr("data-chatid", chatid);
			$($(this)[0].content).parent().parent().addClass("messageNotification");
		}
	});
};
function newSubdivisionModal(title, instructions) {
	var new_modal = new jBox('Modal', {
		width: 350,
		height: 373,
		title: title,
		onClose: function() {
			setTimeout(function() {
				new_subdivision_modal.destroy();  //keyword "this" does not work. make sure to name the modal "new_subdivision_modal".
			}, 100)
		}
	});
	sendAjax("GET", "/teams/current/users", function(users) {
		var span = document.createElement("span");
		var subdivision_name = '<input type="text" class="name_input" id="subdivision_name" placeholder="Subdivision Name">';
		var public_option = '<p class="subdivision_type public selected">Public</p>';
		var private_option = '<p class="subdivision_type private">Private</p>';
		var help = '<span class="glyphicon glyphicon-question-sign subdivision_help" title="A public subdivision can be viewed and joined<br/> by anyone in the team, but viewing and joining<br/> a private subdivision requires an invitation."></span>';
		var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="subdivision_members_search">';
		var potential_members = document.createElement("div");
		$(potential_members).attr("id", "potential_subdivision_members");
		$(potential_members).addClass("potential_members");
		var create_btn = '<input type="button" id="make_subdivision_btn" class="button done_button" value="Make Subdivision">'
		for (var i = 0; i < users.length; i++) {
			var user = document.createElement("p");
			$(user).addClass("potential_member");
			$(user).attr("data-userid", users[i]._id);
			$(user).html(users[i].firstname + " " + users[i].lastname);
			$(potential_members).append(user);
			if (users[i]._id == localStorage._id) {
				$(user).addClass("hidden");
			}
		}
		$(span).append($(subdivision_name));
		$(span).append("<br/>");
		$(span).append($(public_option));
		$(span).append($(private_option));
		$(span).append($(help));
		$(span).append("<br/>");
		$(span).append(instructions);
		$(span).append("<br/>");
		$(span).append($(user_search));
		$(span).append("<br/>");
		$(span).append($(potential_members));
		$(span).append("<br/>");
		$(span).append($(create_btn));
		new_modal.setContent($(span));
		$('.subdivision_help').jBox('Tooltip', {
			delayOpen: 0,
			delayClose: 300,
			theme: "TooltipDark",
			position: {
				y: 'bottom'
			}
		});
		new_modal.open();
	})
	return new_modal;
}
function customAudienceModal(title) {
	var new_modal = new jBox('Modal', {
		width: 350,
		height: 373,
		title: title,
		onClose: function() {
			setTimeout(function() {
				custom_audience_modal.destroy();  //keyword "this" does not work. make sure to name the modal "custom_audience_modal".
			}, 100)
		}

	});
	var span = document.createElement("span");
	var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="audience_members_search">';
	var potential_members = document.createElement("div");
	$(potential_members).attr("id", "potential_audience_members");
	$(potential_members).addClass("potential_members");
	$(potential_members).addClass("tall");
	var add_btn = '<input type="button" id="choose_audience_btn" class="button done_button" value="Done">'
	sendAjax("GET", "/subdivisions/joined", function(subdivisions) {
		for (var i = 0; i < subdivisions.length; i++) {
			var subdivision = document.createElement("p");
			$(subdivision).addClass("potential_subdivision");
			$(subdivision).attr("data-subdivisionid", subdivisions[i]._id);
			$(subdivision).html(subdivisions[i].name);
			$(potential_members).append(subdivision);
		}
	}, { async: false }); // TODO: does this really need to be synchronous?

	sendAjax("GET", "/teams/current/users", function(users) {
		for (var i = 0; i < users.length; i++) {
			var user = document.createElement("p");
			$(user).addClass("potential_member");
			$(user).attr("data-userid", users[i]._id);
			$(user).html(users[i].firstname + " " + users[i].lastname);
			$(potential_members).append(user);
			if (users[i]._id == localStorage._id) {
				$(user).addClass("clicked");
				$(user).addClass("hidden");
			}
		}
		$(span).append($(user_search));
		$(span).append("<br/>");
		$(span).append($(potential_members));
		$(span).append("<br/>");
		$(span).append($(add_btn));
		new_modal.setContent($(span));
		new_modal.open();
	})
	return new_modal;
}
function getAudienceText(obj) {
	var result = "";

	if (obj.entireTeam == true) {
		return "Everyone";
	}

	if (obj.userAudience.length != 0) {
		for (var i = 0; i < obj.userAudience.length; i++) {
			result += obj.userAudience[i].firstname + " " + obj.userAudience[i].lastname + ", ";
		}
	}

	if (obj.subdivisionAudience.length != 0) {
		for (var i = 0; i < obj.subdivisionAudience.length; i++) {
			result += obj.subdivisionAudience[i].name + ", ";
		}
	}

	result = result.substring(0, result.length-2);

	return result;

}
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
$(document).ready(function() {
	// document.body.appendChild(loadingDiv);

	if (isCurrentUserAdmin()) {
		$("#invited_subdivisions").after('<hr><p class="new_subdivision"><span class="glyphicon glyphicon-plus"></span> Make a Subdivision</p>');
	}

	sendAjax("GET", "/subdivisions/joined", function(subdivisions) {
		if (subdivisions.length != 0) {
			for (var i = 0; i < subdivisions.length; i++) {
				var p = document.createElement("p");
				$(p).addClass("subdivision-link");
				$(p).attr("data-subdivisionid", subdivisions[i]._id);
				var glyphSpan = "<span class='glyphicon glyphicon-screenshot'></span>"
				var nameSpan = document.createElement("span");
				$(nameSpan).html(" " + subdivisions[i].name);
				$(p).append(glyphSpan);
				$(p).append(nameSpan);
				$("#your_subdivisions").append($(p));

				var li = document.createElement("li")
				$(li).addClass("audience_item");
				$(li).attr("data-subdivisionid", subdivisions[i]._id);
				$(li).html(subdivisions[i].name);
				$(li).insertAfter($(".first_audience"));
			}
		} else {
			$("#your_subdivisions").append("none");
		}
	});
	sendAjax("GET", "/subdivisions/public", function(subdivisions) {
		if (subdivisions.length != 0) {
			for (var i = 0 ; i < subdivisions.length; i++) {
				var p = document.createElement("p");
				$(p).addClass("subdivision-link");
				$(p).attr("data-subdivisionid", subdivisions[i]._id);
				var glyphSpan = "<span class='glyphicon glyphicon-screenshot'></span>"
				var nameSpan = document.createElement("span");
				$(nameSpan).html(" " + subdivisions[i].name);
				$(p).append(glyphSpan);
				$(p).append(nameSpan);
				$("#public_subdivisions").append($(p));

			}
		} else {
			$("#public_subdivisions").append("none");
		}
	});
	sendAjax("GET", "/subdivisions/invitations", function(invites) {
		if (invites.length != 0) {
			for (var i = 0; i < invites.length; i++) {
				var p = document.createElement("p");
				$(p).addClass("subdivision-invite");
				$(p).attr("data-subdivisionid", invites[i]._id);
				var glyphSpan = "<span class='glyphicon glyphicon-screenshot'></span>"
				var nameSpan = document.createElement("span");
				$(nameSpan).html(" " + invites[i].name);
				$(nameSpan).addClass("nameSpan");
				$(p).append(glyphSpan);
				$(p).append(nameSpan);
				$("#invited_subdivisions").append($(p));
			}
		} else {
			$("#invited_subdivisions").append("none");
		}
	});

	$(document).on("click", ".accept-invite", function() {
		var subdivId = $(this).parent().attr("data-subdivisionid");
		var invite = $(this).parent();
		sendAjax("POST", ["subdivisions/id", subdivId, "invitations/accept"], function(response) {
			if (response == "success") {
				invite.remove();
			}
		})
	});
	var subdivision_invite_modal = new jBox('Modal', {
		width: 'auto',
		height: 'auto',
		title: 'subdivision Invitation',
	});

	$(document).on("click", ".subdivision-link", function() {
		location.assign("/subdivisions/id/" + $(this).attr("data-subdivisionid"));
	});
	$(document).on("click", ".subdivision-invite", function() {
		subdivision_invite_modal.setContent('<span><span class="inviter"></span> You have been invited to the subdivision: <span class="invited_scope_name">'+$(this).find(".nameSpan").html()+'</span></span><br/><div style="text-align: center"><input type="button" class="button invite_btn accept_invite_btn" data-subdivisionid="'+$(this).attr("data-subdivisionid")+'" value="Accept"></input><input type="button" class="button invite_btn ignore_invite_btn" data-subdivisionid="'+$(this).attr("data-subdivisionid")+'" value="Hide"></input></div>')
		subdivision_invite_modal.open();
	});
	$(document).on("click", ".accept_invite_btn", function() {
		var $this = $(this);
		var subdivId = $(this).parent().attr("data-subdivisionid");
		sendAjax("POST", ["subdivisions/id", subdivId, "invitations/accept"], function(response) {
			if (response =="success") {
				subdivision_invite_modal.close();
				var acceptedSubdivision = $("#invited_subdivisions p[data-subdivisionid='"+ $this.attr("data-subdivisionid") +"']").clone();
				acceptedSubdivision.removeClass("subdivision-invite");
				acceptedSubdivision.addClass("subdivision-link");
				if ($("#your_subdivisions")[0].innerHTML.indexOf("none") > -1) {
					$("#your_subdivisions").empty();
					$("#your_subdivisions").append('<h5 style="margin-bottom: 15px;">Your Subdivisions</h5>');
				}
				$("#your_subdivisions").append(acceptedSubdivision);
				$("#invited_subdivisions p[data-subdivisionid='"+ $this.attr("data-subdivisionid") +"']").remove();
			} else {
				alert("fail");
			}
		});
	});
	$(document).on("click", ".ignore_invite_btn", function() {
		var $this = $(this);
		var subdivId = $(this).attr("data-subdivisionid");
		sendAjax("POST", ["subdivisions/id", subdivId, "invitations/ignore"], function(response) {
			if (response=="success") {
				subdivision_invite_modal.close();
				$("#invited_subdivisions p[data-subdivisionid='"+ $this.attr("data-subdivisionid") +"']").remove();
			} else {
				alert("fail");
			}
		});
	});
	$(document).on("click", ".delete_icon", function() {
		if (window.confirm("Are you sure?")) {
			var announcement = $(this).parent();
			var annId = $(this).parent().attr("data-postid");
			sendAjax("DELETE", ["announcements/id", annId], function(response) {
				if (response == "success") {
					$ann.isotope('remove', announcement).isotope();
				} else {
					alert(response);
				}
			});
		}
	});

	$(document).on("click", "#team_button", function() {
		location.assign("/teams/current");
	});
	$(document).on("click", ".announcement_poster", function() {
		location.assign("/profiles/id/" + $(this).attr("data-userid"));
	})

	//audience stuff
	subdivisionAudience = [];
	userAudience = [];
	$(document).on("click", ".audience_item:not(.custom_audience)", function() {
		$(".audience_item").removeClass("selected");
		$(this).addClass("selected");
		$(".audience_selection").html($(this).html());
	});
	$(document).on("click", ".custom_audience", function() {
		custom_audience_modal = customAudienceModal("Custom Audience");
	});
	$(document).on("click", "#choose_audience_btn", function() {
		var p_selected_users = $(".potential_member.clicked");
		var p_selected_subdivisions = $(".potential_subdivision.clicked");

		subdivisionAudience = [];
		userAudience = []

		for (var i = 0; i < p_selected_users.length; i++) {
			userAudience.push($(p_selected_users[i]).attr("data-userid"));
		}
		for (var i = 0; i < p_selected_subdivisions.length; i++) {
			subdivisionAudience.push($(p_selected_subdivisions[i]).attr("data-subdivisionid"));
		}

		$(".audience_item").removeClass("selected");
		$(".custom_audience").addClass("selected");
		$(".audience_selection").html("Custom");

		$(".potential_member").removeClass("clicked");
		$(".potential_subdivision").removeClass("clicked");
		custom_audience_modal.close();
	});
	$(document).on("click", ".announcement_post_button", function() {
		var message = (new nicEditors.findEditor('main_textarea')).getContent();
		var filteredMessage = message.replace("(<((?!br|a|/a|img|b|/b|i|/i|u|/u|div|/div|hr)[^>]+)>)", "").replace(/(<div\s+.*?class=").*?(".*)/gi, "");
		if (filteredMessage != "<br>") {
			if ($(".audience_item.selected").hasClass("first_audience")) {
				var targetAudience = "everyone"
			} else if ($(".audience_item.selected").hasClass("custom_audience")) {
				var targetAudience = {
					userMembers: userAudience,
					subdivisionMembers: subdivisionAudience
				}

			} else {
				var targetAudience = $(".audience_item.selected").attr("data-subdivisionid");
			}
			nicEditors.findEditor('main_textarea').setContent('');
			sendAjax("POST", "/announcements", {
				audience: targetAudience,
				content: filteredMessage
			}, function(annId) {
				if (annId != "fail") {
					var announcementDiv = document.createElement("div");
					$(announcementDiv).addClass("announcement");
					$(announcementDiv).attr("data-postid", annId);
					var announcementTopDiv = document.createElement("div");
					$(announcementTopDiv).addClass("announcement_top");
					var img = document.createElement("img");
					$(img).attr("id", "medium_prof_pic");
					$(img).attr("src", localStorage.profpicpath + "-60");
					$(img).addClass("user-link")
					$(img).attr("data-userid", localStorage._id)
					var span = document.createElement("span");
					$(span).addClass("announcement_poster");
					$(span).attr("data-userid", localStorage._id);
					var now = new Date()
					var timestamp = document.createElement("span");
					$(timestamp).addClass("announcement_timestamp")
					$(span).html(localStorage.firstname + " " + localStorage.lastname)
					$(timestamp).html(" - " + "just now");
					$(announcementTopDiv).append(img);
					$(announcementTopDiv).append(span);
					$(announcementTopDiv).append(timestamp);
					$(announcementDiv).append(announcementTopDiv);
					var deleteButton = document.createElement("span")
					$(deleteButton).addClass("glyphicon");
					$(deleteButton).addClass("glyphicon-remove");
					$(deleteButton).addClass("delete_icon");
					$(announcementDiv).append(deleteButton);
					$(announcementDiv).append("<br/>");
					$(announcementDiv).append(Autolinker.link(filteredMessage));

					$('.announcements_list').prepend(announcementDiv).isotope('prepended', announcementDiv)
					document.getElementById('main_textarea').value = "";
					$('#main_textarea').css("height", "56px");
				} else {
					alert(annId);
				}
			});
		}
	});



	//general modal stuff
	$(document).on("click", ".potential_member", function() {
		if ($(this).hasClass("clicked")) {
			$(this).removeClass("clicked");
		} else {
			$(this).addClass("clicked");
		}
	});
	$(document).on("click", ".potential_subdivision", function() {
		if ($(this).hasClass("clicked")) {
			$(this).removeClass("clicked");
		} else {
			$(this).addClass("clicked");
		}
	});
	$(document).on("keyup", '.members_search', function() {
		var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
		$('.potential_members p').show().filter(function() {
				var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
				console.log(!~text.indexOf(val));
				return !~text.indexOf(val);
		}).hide();
	});

	//new subdivision modal
	$(document).on("click", ".new_subdivision", function() {
		new_subdivision_modal = newSubdivisionModal("New subdivision", "Please select some initial members");
	})
	$(document).on("click", ".subdivision_type", function() {
		$(".subdivision_type").removeClass("selected");
		$(this).addClass("selected");
	});
	$(document).on("click", '#make_subdivision_btn', function() {
		$(this).val("Loading");
		$(this).prop("disabled",true);
		if ($("#subdivision_name").val() != "") {
			if ($("#subdivision_name").val().length < 22) {
				var type;
				if ($(".public").hasClass("selected")) {
					type = "public";
				} else {
					type = "private";
				}
				var p_selected_users = $("p.clicked");
				var selectedUsers = [];
				for (var i = 0; i < p_selected_users.length; i++) {
					selectedUsers.push($(p_selected_users[i]).attr("data-userid"));
				}
				sendAjax("POST", "/subdivisions", {
					name: $("#subdivision_name").val(),
					type: type
				}, function(subdivId) {
					if (subdivId != "fail") {
						for (var i = 0; i < selectedUsers.length; i++) {
							// TODO: put this into one request for a list of users?
							sendAjax("POST", ["subdivisions/id", subdivId, "invitations", selectedUsers[i]], function(response) {
								if (response == "success") {
									//
								} else {
									alert("fail");
								}
							});
						}
						new_subdivision_modal.close();
						location.assign("/"); // TODO: possibly make this better
					} else {
						alert("failed to create");
					}
				});
			} else {
				alert("The name can only have 21 letters or less.");
			}
		} else {
			alert("You forgot to name the subdivision.");
		}
	});

	socket.on('message', function(msg) {
		if (msg.type == "group") {
			messageNotification(msg.author_fn+" "+msg.author_ln+" in "+msg.chat_name, msg.content, msg.chat_id);
		} else {
			messageNotification(msg.author_fn+" "+msg.author_ln, msg.content, msg.chat_id);
		}
		$('#audio-files').find('audio#click-sound')[0].play();
		$('#audio-files').find('audio#click-sound')[0].currentTime = 0;
	})

});
function appendLater(announcementDiv) {
	$('.announcements_list').append(announcementDiv).isotope('appended', announcementDiv);
}
function appendFirst(announcementDiv) {
	$('.announcements_list').append(announcementDiv);
}

function loadAnnouncements(callback) {
	// spinner = new Spinner(spinnerOpts).spin(loadingDiv);
	sendAjax("GET", "/announcements?skip=" + 20*localStorage.page, function(announcements) {
		if (announcements != "fail") {

			for (var i = 0; i < announcements.length; i++) {
				var announcementDiv = document.createElement("div");
				$(announcementDiv).addClass("announcement");
				$(announcementDiv).attr("data-postid", announcements[i]._id);
				var announcementTopDiv = document.createElement("div");
				$(announcementTopDiv).addClass("announcement_top");
				var img = document.createElement("img");
				$(img).attr("id", "medium_prof_pic");
				$(img).attr("src", announcements[i].author.profpicpath + "-60");
				$(img).addClass("user-link")
				$(img).attr("data-userid", announcements[i].author._id)
				var span = document.createElement("span");
				$(span).addClass("announcement_poster");
				$(span).attr("data-userid", announcements[i].author._id);
				var shownDate = new Date(announcements[i].timestamp);
				var timestamp = document.createElement("span");
				$(timestamp).addClass("announcement_timestamp")
				$(span).html(announcements[i].author.firstname + " " + announcements[i].author.lastname)
				$(timestamp).html(" - " + standardizeTime(shownDate) + " - " + months[shownDate.getMonth()] + " " + shownDate.getDate() + ", " + shownDate.getFullYear());
				var audienceGlobe = document.createElement("span");
				$(audienceGlobe).addClass("glyphicon glyphicon-globe audience_globe");
				var audienceText = getAudienceText(announcements[i]);
				$(audienceGlobe).attr("title", audienceText);
				$(announcementTopDiv).append(img);
				$(announcementTopDiv).append(span);
				$(announcementTopDiv).append(timestamp);
				$(announcementTopDiv).append(audienceGlobe);

				$(announcementDiv).append(announcementTopDiv);
				if (localStorage._id == announcements[i].author._id || isCurrentUserAdmin()) {
					var deleteButton = document.createElement("span")
					$(deleteButton).addClass("glyphicon");
					$(deleteButton).addClass("glyphicon-remove");
					$(deleteButton).addClass("delete_icon");
					$(announcementDiv).append(deleteButton);
				}
				$(announcementDiv).append("<br/>");
				$(announcementDiv).append(announcements[i].content);
				callback(announcementDiv);
				document.getElementById('main_textarea').value = "";
				$('#main_textarea').css("height", "56px");
				if (i == announcements.length-1) {
					// spinner.stop();
				}
			}
			$('.audience_globe').jBox('Tooltip', {
					delayOpen: 0,
					delayClose: 0,
					theme: "TooltipDark"
			});
			setTimeout(function() {
					$ann = $(".announcements_list").isotope({
							itemSelector: ".announcement",
							layoutMode: "vertical"
					});
			}, 1);
			var intervalCounter = 0;
			var isotopeInterval = setInterval(function() {
				if (intervalCounter == 3) {
					clearInterval(isotopeInterval);
				} else {
					$ann.isotope()
				}
				intervalCounter++
			}, 1000)
			localStorage.page++;
		} else {
			alert("failed to load announcements");
		}
	});
}

$(window).load(function() {
	localStorage.page = 0;
	loadAnnouncements(appendFirst);

	 function bindScroll() {
		 if ($(window).scrollTop() + $(window).height() > $(document).height() - 300) {
			 $(window).unbind('scroll');
			 loadAnnouncements(appendLater);
		 }
	 }

	$(window).scroll(bindScroll);

	$("div.nicEdit-main").addClass('wordwrap');
	var textareaWidthNum;
	var textareaWidth;
	$(window).resize(function() {
		textareaWidthNum = $(".post_announcement").width();
		textareaWidth = textareaWidthNum + "px";
		$(".nicEdit-main").css("width", textareaWidth);
		$(".post_announcement").children().not(".announcement_post_button").not(".announcement_audience_button").css("width", textareaWidth);
		console.log($(".nicEdit-main").css("width"));
	});

})
