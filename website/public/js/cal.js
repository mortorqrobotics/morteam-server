var socket = io();
var daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function messageNotification(title, content, chatid) {
	var newMessageNotice = new jBox("Notice", {
		attributes: {
			x: "right",
			y: "bottom"
		},
		theme: "NoticeBorder",
		volume: 100,
		animation: {
			open: "slide:bottom",
			close: "slide:right"
		},
		content: content,
		maxWidth: 300,
		maxHeight: 105,
		title: title,
		closeOnClick: false,
		onOpen: function() {
			$($(this)[0].content).attr("data-chatid", chatid);
		}
	});
};
function showAttendance(title, eventId) {
	var new_modal = new jBox("Modal", {
		width: 350,
		height: 373,
		title: title,
		onClose: function() {
			setTimeout(function() {
				attendance_modal.destroy(); //keyword "this" does not work. make sure to name the modal "attendance_modal".
			}, 100)
		}
	});
	sendAjax("GET", ["event/id", eventId, "attendance"], function(attendees) {
		var span = $(document.createElement("span"));
		var userSearch = $(document.createElement("input"), {
			"type": "text",
			"placeholder": "Search Names...",
			"class": "members_search",
			"id": "subdivision_members_search"
		});
		var selectAllLink = $(document.createElement("a"), {
			"class": "select_all_link",
			"text": "Select All"
		});
		var potentialMembers = $(document.createElement("div"), {
			"id": "attendance_list",
			"class": "potential_members tall"
		});
		var saveButton = $(document.createElement("input"), {
			"type": "button",
			"data-eventid": eventId,
			"id": "save_attendance",
			"class": "button done_button",
			"value": "Save"
		});
		for (var i = 0; i < attendees.length; i++) {
			var attendee = attendees[i];
			var attendeeElem = $(document.createElement("p"), {
				"class": "potential_member attendee",
				"data-userid": attendee.user._id,
				"text": attendee.user.firstname
			});
			if (attendee.status == "present") {
				attendeeElem.addClass("clicked");
			} else if (attendee.status == "excused") {
				attendeeElem.addClass("excused");
			} else if (attendee.status == "tardy") {
				attendeeElem.addClass("tardy");
			}
			potentialMembers.append(attendeeElem);
		}
		span.append(userSearch);
		span.append("<br />");
		span.append(selectAllLink);
		span.append("<br />");
		span.append(potentialMembers);
		span.append("<br />");
		span.append(saveButton);
//		var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="subdivision_members_search">';
//		var select_all_link = '<a class="select_all_link">Select All</a>';
//		var potential_members = document.createElement("div");
//		$(potential_members).attr("id", "attendance_list");
//		$(potential_members).addClass("potential_members");
//		$(potential_members).addClass("tall");
//		var save_btn = '<input type="button" data-eventid="' + eventId + '" id="save_attendance" class="button done_button" value="Save">'
//		for (var i = 0; i < attendees.length; i++) {
//			var attendee = document.createElement("p");
//			$(attendee).addClass("potential_member");
//			$(attendee).addClass("attendee");
//			$(attendee).attr("data-userid", attendees[i].user._id);
//			$(attendee).html(attendees[i].user.firstname + " " + attendees[i].user.lastname);
//			if (attendees[i].status == "present") {
//				$(attendee).addClass("clicked");
//			} else if (attendees[i].status == "excused") {
//				$(attendee).addClass("excused");
//			} else if (attendees[i].status == "tardy") {
//				$(attendee).addClass("tardy");
//			}
//			$(potential_members).append(attendee);
//		}
//		$(span).append($(user_search));
//		$(span).append("<br/>");
//		$(span).append($(select_all_link));
//		$(span).append("<br/>");
//		$(span).append($(potential_members));
//		$(span).append("<br/>");
//		$(span).append($(save_btn));
		new_modal.setContent($(span));
		new_modal.open();
	});
	return new_modal;
}
function readableDate(datestr) {
	var date = new Date(datestr);
	return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}
function daysInMonth(month,year) {
	return new Date(year, month, 0).getDate();
}
function removeDuplicates(arr) {
	var seen = {};
	var result = [];
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		if (!seen[item]) {
			seen[item] = true;
			result.push(item);
		}
	 }
	return result;
}
function eventModal(title, date) {
	var new_modal = new jBox("Modal", {
		width: 350,
		height: 495,
		title: title,
		onClose: function() {
			setTimeout(function() {
				event_modal.destroy();  // keyword "this" does not work. make sure to name the modal "event_modal".
			}, 100)
		}
	});
	var span = document.createElement("span");
	var event_name = '<input type="text" id="event_name" class="name_input" placeholder="Title">';
	var event_description = '<textarea class="event_description" placeholder="Description (Optional)"></textarea>';
	var entireTeamDiv = '<div><input id="entireTeam" type="checkbox"> Invite Everyone</div>'
	var hasAttendanceDiv = '<div><input id="hasAttendance" type="checkbox" checked> Take Attendance?</div>'
	var sendEmailDiv = '<div><input id="sendEmail" type="checkbox" checked> Send Email?</div>'
	var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="event_members_search">';
	var potential_members = document.createElement("div");
	$(potential_members).attr("id", "potential_attendance_members");
	$(potential_members).addClass("potential_members");
	var done_btn = '<input data-date="'+ date +'" type="button" id="event_done_btn" class="button done_button" value="Done">'
	sendAjax("GET", "/subdivisions/joined", function(subdivisions) {
		for (var i = 0; i < subdivisions.length; i++) {
			var subdivision = document.createElement("p");
			$(subdivision).addClass("potential_subdivision");
			$(subdivision).attr("data-subdivisionid", subdivisions[i]._id);
			$(subdivision).html(subdivisions[i].name);
			$(potential_members).append(subdivision);
		}
	}, { async: false }); // TODO: should this really be synchronous?

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
		$(span).append($(event_name));
		$(span).append("<br/>");
		$(span).append($(event_description));
		$(span).append("<br/>");
		$(span).append("Please select the attendees:");
		$(span).append("<br/>");
		$(span).append($(entireTeamDiv));
		$(span).append($(hasAttendanceDiv));
		$(span).append($(sendEmailDiv));
		$(span).append($(user_search));
		$(span).append("<br/>");
		$(span).append($(potential_members));
		$(span).append("<br/>");
		$(span).append($(done_btn));
		new_modal.setContent($(span));
		new_modal.open();
	});
	return new_modal;
}


$(document).ready(function() {
	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var today = now.getDate();

	sendAjax("GET", "/events/upcoming", function(upcomingEvents) {
		if (upcomingEvents.length > 0) {
			for (var i = 0; i < upcomingEvents.length; i++) {
				var li = document.createElement("li");
				$(li).html(upcomingEvents[i].name + " (" + readableDate(upcomingEvents[i].date) + ")");
				$(".upcoming_events").append($(li));
			}
		} else {
			$(".upcoming_events").append("<li>none</li>");
		}
	});

	sendAjax("GET", ["users/id", localStorage._id, "tasks/pending"], function(tasks) {
		if (tasks != "fail") {
			if (tasks.length > 0) {
				for (var i = 0; i < tasks.length; i++) {
					var li = document.createElement("li");
					// $(li).html(tasks[i].name + " (By " + readableDate(tasks[i].due_date) + ")");
					$(li).html(tasks[i].name + " <span class='due_date_display'>(By " + readableDate(tasks[i].due_date) + ")</span> <span style='vertical-align: -5%; font-size: 14px' title='Assigned By "+ tasks[i].creator.firstname + " " + tasks[i].creator.lastname +"' class='assigned_by glyphicon glyphicon-info-sign'></span>");
					var div = document.createElement("div");
					$(div).addClass("indented");
					$(div).html(tasks[i].description);
					$(li).append("<br/>");
					$(li).append($(div));
					$(".task_list").append($(li));
				}
				$('.assigned_by').jBox('Tooltip', {
						delayOpen: 0,
						delayClose: 0,
						theme: "TooltipDark"
				});
			} else {
				$(".task_list").append("<li>none</li>");
			}
		} else {
			alert(tasks);
		}
	})

	$(".selected_year").html(year);
	for (i=-1 ; i<5 ; i++) {
		var year_li = document.createElement("li");
		$(year_li).addClass("year");
		$(year_li).html(now.getFullYear() + i)
		$(".years").append(year_li)
		if (i==0) {
			$(year_li).addClass("selected");
		}
	}
	$(document).on("click", ".year", function() {
		$(".year").removeClass("selected");
		$(this).addClass("selected");
		$(".selected_year").html($(this).html());
		year = parseInt($(this).html());
		$(".month_name[data-month='"+month+"']").trigger("click");
	});

	$(".month_name:not(.year_select)").click(function() {
		$('.timeline').find('*').not('.current_month_display').remove();
		var $this = $(this);
		month = parseInt($this.attr("data-month"));
		$(".month_name").removeClass("selected");
		$(this).addClass("selected");
		$(".current_month_display").html(months[parseInt($this.attr("data-month"))-1]);
		for (var i = 1; i <= daysInMonth(parseInt($this.attr("data-month")), year); i++) {
			var day_div = document.createElement("div");
			$(day_div).attr("data-day", i);
			$(day_div).addClass("day");
			var day_of_month = document.createElement("div");
			$(day_of_month).addClass("day_of_month");
			$(day_of_month).html(i);
			var day_content = document.createElement("div");
			$(day_content).addClass("day_content");
			$(day_div).append($(day_of_month));
			if (localStorage.c_team_position == "leader" || localStorage.c_team_position == "admin") {
			var add_event = document.createElement("input");
				$(add_event).attr("type", "button");
				$(add_event).addClass("add_event");
				$(add_event).attr("value", "+");
				$(add_event).attr("title", "Add Event");
				$(day_div).append($(add_event));
			}
			$(day_div).append($(day_content));
			var day_name = document.createElement("h4");
			$(day_name).addClass("day_name");
			$(day_name).html(daysInWeek[ new Date(year, parseInt($this.attr("data-month"))-1, i).getDay() ]);
			var day_list = document.createElement("ul");
			$(day_list).addClass("day_list");
			$(day_list).attr("data-day", i);
			$(day_content).append($(day_name));
			$(day_content).append($(day_list));
			$(".timeline").append($(day_div));
		}
		if (month == now.getMonth()+1 && year == now.getFullYear()) {
			$(".day[data-day='"+ today +"']").find(".day_content").addClass("today");
			var scrollPix = $(".day[data-day='"+ today +"']").offset().top - $(window).height()*0.5 + $(".day[data-day='"+ today +"']").height()*0.5;
			$('.timeline').scrollTop(scrollPix);
		}
		sendAjax("GET", ["events", "year", year, "month", month], function(events) {
			if (events != "fail") {
				for (var i = 0; i < events.length; i++) {
					var day = new Date(events[i].date).getDate();
					var li = document.createElement("li");
					$(li).attr("data-eventid", events[i]._id);
					var event_name_display = document.createElement("span");
					$(event_name_display).addClass("bold");
					$(event_name_display).html(events[i].name);
					// TODO: add attendance and delete buttons
					var event_description_display = document.createElement("div");
					$(event_description_display).addClass("indented");
					$(event_description_display).html(events[i].description);
					$(li).append($(event_name_display));
					if (localStorage.c_team_position == "leader" || localStorage.c_team_position == "admin") {
						var attendance_btn = '<span title="Record Attendance" class="glyphicon glyphicon-list-alt leaders_only attendance"></span>';
						var delete_event_btn = '<span class="glyphicon glyphicon-trash list_right delete_event"></span>';
						$(li).append(" ");
						if (events[i].hasAttendance) {
							$(li).append(attendance_btn);
						}
						$(li).append(delete_event_btn);
					}
					$(li).append("<br/>")
					$(li).append($(event_description_display));
					$(".day_list[data-day='"+ day +"']").append($(li));
				}
			} else {
				alert(events);
			}
		});
	});
	$(".month_name[data-month='"+month+"']").trigger("click"); // This has to be after the click event declaration for month_name

	$(document).on("click", ".add_event", function() {
		var $this = $(this);
		var newDate = new Date(year, month-1, $this.prev().html());
		event_modal = eventModal("New Event", newDate.toString());
	});

	$(document).on("change", "#entireTeam", function() {
		if (this.checked) {
			$('#potential_attendance_members').addClass("hidden");
			$('#potential_attendance_members > .clicked').removeClass("clicked");
		} else {
			$('#potential_attendance_members').removeClass("hidden");
		}
	})

	$(document).on("click", ".delete_event", function() {
		var $this = $(this);
		if (window.confirm("Are you sure?")) {
			var eventId = $this.parent().attr("data-eventid");
			sendAjax("DELETE", ["events/id", eventId], function(response) {
				if (response == "success") {
					$this.parent().remove();
				} else {
					alert(response);
				}
			})
		}
	});

	$(document).on("click", ".attendance", function() {
		attendance_modal = showAttendance("Attendance for " + $(this).prev().html(), $(this).parent().attr("data-eventid"));
	});
	updatedAttendees = [];
	$(document).on("click", "#save_attendance", function() {
		var p_attendees = $("#attendance_list > .potential_member");
		updatedAttendees.length = 0;
		for (var i = 0; i < p_attendees.length; i++) {
			if ($(p_attendees[i]).hasClass("clicked")) {
				updatedAttendees.push({
					user: $(p_attendees[i]).attr("data-userid"),
					status: "present"
				})
			} else if ($(p_attendees[i]).hasClass("excused")) {
				updatedAttendees.push({
					user: $(p_attendees[i]).attr("data-userid"),
					status: "excused"
				})
			} else if ($(p_attendees[i]).hasClass("tardy")) {
				updatedAttendees.push({
					user: $(p_attendees[i]).attr("data-userid"),
					status: "tardy"
				})
			} else {
				updatedAttendees.push({
					user: $(p_attendees[i]).attr("data-userid"),
					status: "absent"
				})
			}
		}
		var eventId = $(this).attr("data-eventid");
		sendAjax("PUT", ["event/id", eventId, "attendance"], {
			updatedAttendees: updatedAttendees
		}, function(response) {
			if (response == "success") {
				attendance_modal.close();
			} else {
				alert(response);
			}
		});
	});

	$(document).on("click", ".select_all_link", function() {
		if ($(this).html() == "Select All") {
			$("#attendance_list > .potential_member").not(".excused").addClass("clicked");
			$(this).html("Deselect All")
		} else {
			$("#attendance_list > .potential_member").not(".excused").removeClass("clicked");
			$(this).html("Select All");
		}
	});


	$(document).on("click", "#event_done_btn", function() {
		if ($("#event_name").val() != "") {
			var $this = $(this);
			var p_selected_users = $(".potential_member.clicked");
			var p_selected_subdivisions = $(".potential_subdivision.clicked");

			subdivisionAttendees = [];
			userAttendees = []

			for (var i = 0; i < p_selected_users.length; i++) {
				userAttendees.push($(p_selected_users[i]).attr("data-userid"));
			}
			for (var i = 0; i < p_selected_subdivisions.length; i++) {
				subdivisionAttendees.push($(p_selected_subdivisions[i]).attr("data-subdivisionid"));
			}
			if (removeDuplicates(userAttendees).length == 1 && subdivisionAttendees.length == 0) {
				event_modal.close();
			} else {
				sendAjax("POST", "/events", {
					name: normalizeDisplayedText($("#event_name").val()),
					description: normalizeDisplayedText($(".event_description").val()),
					userAttendees: userAttendees,
					subdivisionAttendees: subdivisionAttendees,
					date: $this.attr("data-date"),
					entireTeam: $('#entireTeam').is(':checked'),
					hasAttendance: $('#hasAttendance').is(':checked'),
					sendEmail: $('#sendEmail').is(':checked')
				}, function(newEvent) {
					event_modal.close();
					if (newEvent != "fail") {
						var li = document.createElement("li");
						$(li).attr("data-eventid", newEvent._id);
						var event_name_display = document.createElement("span");
						$(event_name_display).addClass("bold");
						$(event_name_display).html(newEvent.name);
						// TODO: add attendance and delete buttons
						var attendance_btn = '<span title="Record Attendance" class="glyphicon glyphicon-list-alt leaders_only attendance"></span>';
						var delete_event_btn = '<span class="glyphicon glyphicon-trash list_right delete_event"></span>';
						var event_description_display = document.createElement("div");
						$(event_description_display).addClass("indented");
						$(event_description_display).html(newEvent.description);
						$(li).append($(event_name_display));
						$(li).append(" ");
						if ($('#hasAttendance').is(':checked')) {
							$(li).append(attendance_btn);
						}
						$(li).append(delete_event_btn);
						$(li).append("<br/>")
						$(li).append($(event_description_display));


						$(".day_list[data-day='"+ new Date($this.attr("data-date")).getDate() +"']").append($(li));
					} else {
						alert(newEvent);
					}
				});
			}
		} else {
			alert("You forgot to name the event");
		}
	});

	$(document).on("contextmenu", ".attendee", function(e) {
		e.preventDefault();
		$(".drop").remove();
		var drop = $("<div class='drop' data-userid='"+$(this).attr("data-userid")+"'><li id='mark-present' class='drop_item'>Mark As Present</li><li id='mark-tardy' class='drop_item'>Mark as Tardy</li><li id='mark-excused' class='drop_item'>Mark As Excused</li></div>");
		drop.css("top", e.pageY);
		drop.css("left", e.pageX);
		$("body").append(drop);
		$(document).click(function() {
			 $(".drop").remove();
			 $(".chat_name:not(.make_group)").unbind("contextmenu");
		});
		return false;
	})
	$(document).on("click", "#mark-present", function() {
		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").removeClass("tardy");
		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").removeClass("excused");

		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").addClass("clicked");
	});
	$(document).on("click", "#mark-tardy", function() {
		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").removeClass("clicked");
		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").removeClass("excused");

		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").addClass("tardy");
	});
	$(document).on("click", "#mark-excused", function() {
		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").removeClass("tardy");
		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").removeClass("clicked");

		$(".attendee[data-userid='"+ $(this).parent().attr("data-userid") +"']").addClass("excused");
	});


	function hideLeftbar(time, button) {
		$(".leftbar").velocity({left: "-260px"}, { duration: time, queue: false });
		$(".wrapper").velocity({left: "0px"}, { duration: time, queue: false });
		$(".wrapper").velocity({width: "100vw"}, { duration: time, queue: false });
		$(button).removeClass("glyphicon-chevron-left").addClass("glyphicon-chevron-right");
		$(button).velocity({left: "10px"}, { duration: time, queue: false });
	}
	function showLeftbar(time, button) {
		$(".leftbar").velocity({left: "0px"}, { duration: time, queue: false });
		$(".wrapper").velocity({left: "260px"}, { duration: time, queue: false });
		$(".wrapper").velocity({width: "-=260px"}, { duration: time, queue: false });
		$(button).removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-left");
		$(button).velocity({left: "220px"}, { duration: time, queue: false });
		setTimeout(function() {
			$(".wrapper").css("width", "calc(100vw - 260px)");
		}, time + time)
	}
	$(".hide_leftbar").click(function() {
		if ($(this).hasClass("glyphicon-chevron-left")) {
			hideLeftbar(300, this);
		} else {
			showLeftbar(300, this);
		}
	});
	if ($(window).width() < 825) {
		hideLeftbar(0, ".hide_leftbar");
	}

	//general modal stuff
	$(document).on("click", ".potential_member", function() {
		if ($(this).hasClass("clicked")) {
			$(this).removeClass("clicked");
		} else if ($(this).hasClass("excused")) {
			if (window.confirm("Are you sure you want to mark this person as unexcused?")) {
				$(this).removeClass("excused");
			}
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
