var socket = io();

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}
function validateEmail(email) {
	var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}
function validatePhone(phone) {
	return phone.match(/\d/g).length===10;
}

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
					// $($(this)[0].content).attr("data-author", author._id);
					$($(this)[0].content).attr("data-chatid", chatid);
			}
	});
};
var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function readableDate(datestr) {
	var date = new Date(datestr);
	return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}
function findTeamInTeamArray(teams, teamId) {
	for (var i = 0; i < teams.length; i++) {
		if (teams[i].id == teamId) {
			return team;
		}
	}
}
function assignTaskModal(title) {
	var new_modal = new jBox("Modal", {
		width: 350,
		height: "auto",
		title: title,
		onClose: function() {
			setTimeout(function() {
				task_modal.destroy();
			}, 100)
		}
	})
	new_modal.setContent('<input type="text" class="task_name" placeholder="Title"></input><br/><textarea class="task_description" placeholder="Short Description (Optional)"></textarea><br/>Due: <select class="task_month"><option value="1">January</option><option value="2">February</option><option value="3">March</option><option value="4">April</option><option value="5">May</option><option value="6">June</option><option value="7">July</option><option value="8">August</option><option value="9">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option></select><select class="task_day"></select><select class="task_year"></select><br/><input type="button" class="button submit_task" value="Submit"></input>');

	var thisYear = new Date().getFullYear();
	var thisMonth = new Date().getMonth()+1;
	var thisDay = new Date().getDate();

	$(".task_month option[value='"+thisMonth+"']").prop("selected", true); // selects current month


	for (var j = thisYear ; j < thisYear+5 ; j++) {
		$(".task_year").append("<option value='"+j+"'>"+j+"</option>"); // adds next 5 years
	}

	for (var k = 1 ; k <= new Date($(".task_year").find(":selected").text(), $('.task_month option[value="'+thisMonth+'"]').val(), 0).getDate() ; k++) {
		$(".task_day").append("<option value='"+k+"'>"+k+"</option>")
		if (k == new Date($(".task_year").find(":selected").text(), $('.task_month option[value="'+thisMonth+'"]').val(), 0).getDate()) {
			$(".task_day option[value='"+(parseInt(thisDay)+1).toString()+"']").prop("selected", true);
		}
	}

	$(".task_month").change(function() {
		$(".task_day").empty();
		for (var k = 1 ; k <= new Date($(".task_year").find(":selected").text(), $(".task_month").find(":selected").val(), 0).getDate() ; k++) {
			$(".task_day").append("<option value='"+k+"'>"+k+"</option>")
		}
	});
	$(".task_year").change(function() {
		$(".task_day").empty();
		for (var i = 1 ; i <= new Date($(this).find(":selected").text(), $(".task_month").find(":selected").val(), 0).getDate() ; i++) {
			$(".task_day").append("<option value='"+i+"'>"+i+"</option>");
		}
	})
	new_modal.open();
	return new_modal

}
function changePasswordModal(title) {
	var new_modal = new jBox("Modal", {
			width: 350,
			height: "auto",
			title: "Change Password",
			onClose: function() {
				setTimeout(function() {
					change_password_modal.destroy();
				},100);
			}
	});
	new_modal.setContent('<input type="password" placeholder="Old password" class="old_password modal_textbox"></input><br/><input type="password" placeholder="New Password" class="new_password modal_textbox"></input><br/><input type="password" placeholder="Confirm New Password" class="new_password_confirm modal_textbox"></input><br/><input type="button" class="button modal_button save_password" value="Save"></input>');
	new_modal.open();
	return new_modal;
}
function editProfileModal(title) {
	var new_modal = new jBox("Modal", {
			width: 350,
			height: "auto",
			title: title,
			onClose: function() {
				setTimeout(function() {
					edit_profile_modal.destroy();
				}, 100)
			}
	});
	new_modal.setContent('<form action="/profile" enctype="multipart/form-data" method="post" id="edit_profile_form"><input type="text" name="firstname" class="edit_firstname modal_textbox"></input><br/><input type="text" name="lastname" class="edit_lastname modal_textbox"></input><br/><input type="text" name="email" class="edit_email modal_textbox"></input><br/><input type="text" name="phone" class="edit_phone modal_textbox"></input><br/><input type="text" name="parentEmail" placeholder="Parent Email" class="edit_parent_email modal_textbox"></input><br/><input name="new_prof_pic" type="file" id="new_prof_pic" class="hidden" accept="image/*" /><input type="button" class="button edit_prof_pic modal_button" value="Change Profile Picture"></input><br/><input type="submit" class="button modal_button save_prof" value="Save"></input></form>')

	sendAjax("GET", "/users/self", function(self) {
		$(".modal_textbox").val("");
		$(".edit_firstname").val(self.firstname)
		$(".edit_lastname").val(self.lastname)
		$(".edit_email").val(self.email)
		$(".edit_phone").val(self.phone)
		$(".edit_parent_email").val(self.parentEmail)
		new_modal.open();
	})
	return new_modal;

}

$(document).ready(function() {
	var userId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
	sendAjax("GET", ["users/id", userId, "absences"], function(data) {
		var absences = data.absences;
		var present = data.present;
		for (var i = 0; i < absences.length; i++) {
			$(".absences_list").append('<li class="absence_date">'+ absences[i].name + ' (' + readableDate(absences[i].date) + ')' + '</li>')
			if (isCurrentUserAdmin()) {
				$(".absences_list").append('<input type="button" data-eventid="'+absences[i]._id+'" class="button excuse_btn" value="Excuse" style="float: right;" /><br/>');
			} else {
				$(".absences_list").append("<br/>");
			}
		}

		$("#absences_num").html(absences.length);
		if (!isNaN(100*present/(absences.length+present))) {
			$("#presence_percent").html(Math.round(100*present/(absences.length+present)) + "%");
		} else {
			$("#presence_percent").html("N/A");
		}
	});
	sendAjax("GET", ["users/id", userId, "tasks/completed"], function(tasks) {
		if (tasks != "fail") {
			if (tasks.length > 0) {
				for (var i = 0; i < tasks.length; i++) {
					var li = document.createElement("li");
					$(li).addClass("data_point");
					// $(li).html(tasks[i].name + " (By " + readableDate(tasks[i].due_date) + ")");
					$(li).html(tasks[i].name + " <span class='due_date_display'>(By " + readableDate(tasks[i].due_date) + ")</span> <span style='vertical-align: -5%; font-size: 14px' title='Assigned By "+ tasks[i].creator.firstname + " " + tasks[i].creator.lastname +"' class='assigned_by glyphicon glyphicon-info-sign'></span>");
					var div = document.createElement("div");
					$(div).addClass("indented");
					$(div).html(tasks[i].description);
					$(li).append("<br/>");
					$(li).append($(div));
					$(".task_list.completed").append($(li));
				}
			} else {
				$(".task_list.completed").append("<li class='data_point'>none</li>");
			}
			$(".assigned_by").jBox("Tooltip", {
					delayOpen: 0,
					delayClose: 0,
					theme: "TooltipDark"
			});
		} else {
			alert(tasks);
		}
	});
	sendAjax("GET", ["users/id", userId, "tasks/pending"], function(tasks) {
		if (tasks != "fail") {
			if (tasks.length > 0) {
				for (var i = 0; i < tasks.length; i++) {
					var li = document.createElement("li");
					$(li).addClass("data_point");
					// $(li).html(tasks[i].name + " (By " + readableDate(tasks[i].due_date) + ")");
					$(li).html(tasks[i].name + " <span class='due_date_display'>(By " + readableDate(tasks[i].due_date) + ")</span> <span style='vertical-align: -5%; font-size: 14px' title='Assigned By "+ tasks[i].creator.firstname + " " + tasks[i].creator.lastname +"' class='assigned_by glyphicon glyphicon-info-sign'></span>");
					var div = document.createElement("div");
					$(div).addClass("indented");
					$(div).html(tasks[i].description);
					$(li).append("<br/>");
					$(li).append($(div));
					if (localStorage._id == tasks[i].for || isCurrentUserAdmin()) {
						var mark_as_completed = document.createElement("input");
						$(mark_as_completed).attr("type", "button");
						$(mark_as_completed).attr("data-taskid", tasks[i]._id);
						$(mark_as_completed).attr("value", "Mark as Completed");
						$(mark_as_completed).addClass("task_complete");
						$(mark_as_completed).addClass("button");
						$(li).append($(mark_as_completed));
					}
					$(".task_list.pending").append($(li));
				}
			} else {
				$(".task_list.pending").append("<li class='data_point'>none</li>");
			}
			$('.assigned_by').jBox('Tooltip', {
					delayOpen: 0,
					delayClose: 0,
					theme: "TooltipDark"
			});
		} else {
			alert(tasks);
		}
	})

	$(document).on("click", "#change_password", function() {
		change_password_modal = changePasswordModal("Change Password");
	})
	$(document).on("click", ".save_password", function() {
		var oldPass = $(".old_password").val();
		var newPass = $(".new_password").val();
		var newPassConfirm = $(".new_password_confirm").val()
		if (newPass == newPassConfirm) {
			sendAjax("PUT", "/password", {
				oldPassword: oldPass,
				newPassword: newPass,
				newPasswordConfirm: newPassConfirm
			}, function(response) {
				if (response == "success") {
					alert("Successfully changed password");
					change_password_modal.close();
				} else {
					alert(response);
				}
			});
		} else {
			alert("New passwords do not match");
		}
	});
	$(document).on("click", ".edit_prof_pic", function() {
		$("#new_prof_pic").trigger("click");
	})
	$(document).on("click", "#edit_profile", function() {
		edit_profile_modal = editProfileModal("Edit Profile");
	});
	$(document).on("submit", "#edit_profile_form", function(e) {
		e.preventDefault();
		if (validateEmail($(".edit_email").val())) {
			if (validatePhone($(".edit_phone").val())) {
				$(".edit_firstname").val($(".edit_firstname").val().replace(/[^\w\s]/gi, "").capitalize())
				$(".edit_lastname").val($(".edit_lastname").val().replace(/[^\w\s]/gi, '').capitalize())
				$(this).ajaxSubmit({
						error: function(xhr) {
							alert(xhr.status)
						},
						success: function(response) {
							if (response == "success") {
								localStorage.firstname = $(".edit_firstname").val().replace(/[^\w\s]/gi, '').capitalize();
								localStorage.lastname = $(".edit_lastname").val().replace(/[^\w\s]/gi, '').capitalize();
								localStorage.email = $(".edit_email").val();
								localStorage.phone = $(".edit_phone").val();
								window.location.reload(true);
							} else {
								alert(response);
							}
						}
				});
			} else {
				alert("invalid phone");
			}
		} else {
			alert("invalid email");
		}
		return false;
	});
	$(document).on("click", "#assign_task", function() {
		task_modal = assignTaskModal('Assign a Task');
	});
	$(document).on("click", ".submit_task", function() {
		var userId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
		sendAjax("POST", ["users/id", userId, "tasks"], {
			task_name: $(".task_name").val(),
			task_description: $(".task_description").val(),
			due_date: new Date($(".task_year option:selected").text(), $(".task_month option:selected").val()-1, $(".task_day option:selected").text())
		}, function(response) {
			if (response != "fail") {
				var li = document.createElement("li");
				$(li).addClass("data_point");
				$(li).html($(".task_name").val() + " <span class='due_date_display'>(By " + readableDate(new Date($(".task_year option:selected").text(), $(".task_month option:selected").val()-1, $(".task_day option:selected").text())) + ")</span> <span style='vertical-align: -5%; font-size: 14px' title='Assigned By "+ localStorage.firstname + " " + localStorage.lastname +"' class='assigned_by glyphicon glyphicon-info-sign'></span>");
				var div = document.createElement("div");
				$(div).addClass("indented");
				$(div).html($(".task_description").val());
				$(li).append("<br/>");
				$(li).append($(div));
				var mark_as_completed = document.createElement("input");
				$(mark_as_completed).attr("type", "button");
				$(mark_as_completed).attr("data-taskid", response);
				$(mark_as_completed).attr("value", "Mark as Completed");
				$(mark_as_completed).addClass("task_complete");
				$(mark_as_completed).addClass("button");
				$(li).append($(mark_as_completed));
				$(".task_list.pending").append($(li));
				$(".assigned_by").jBox("Tooltip", {
						delayOpen: 0,
						delayClose: 0,
						theme: "TooltipDark"
				});
				task_modal.close();
				task_modal.destroy();
			} else {
				alert(response);
			}
		})
	});
	$(document).on("click", ".task_complete", function() {
		if (window.confirm("Are you sure? This action is irreversible. You can, and will be held accountable if you mark this dishonestly.")) {
			var $this = $(this);
			var taskId = $this.attr("data-taskid");
			sendAjax("POST", ["tasks/id", taskId, "markCompleted"], {
				target_user: window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1)
				// TODO: does target user really have to be sent to the server?
			}, function(response) {
				if (response == "success") {
					var completedTask = $this.parent().clone();
					$this.parent().remove();
					completedTask.find(".task_complete").remove();
					completedTask.appendTo($(".task_list.completed"));
				} else {
					alert(response);
				}
			});
		}
	})
	$(document).on("click", ".position_item", function() {
		if (window.confirm("Are you sure?")) {
			var $this = $(this);
			var userId = $this.parent().parent().attr("data-userid");
			var newPosition = $this.text().toLowerCase();
			sendAjax("PUT", ["users/id", userId, "position", newPosition], function(response) {
				if (response == "success") {
					$(".position_item").removeClass("selected");
					$this.addClass("selected");
					$this.parent().prev().html($this.text() + '<span class="caret"></span>');
				} else {
					alert(response);
				}
			});
		}
	});
	$(document).on("click", ".excuse_btn", function() {
		if (window.confirm("Are you sure?")) {
			var $this = $(this);
			var eventId = $this.attr("data-eventid");
			var userId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
			sendAjax("PUT", ["events/id", eventId, "users/id", userId, "excuseAbsences"], function(response) {
				if (response == "success") {
					$this.attr("value", "Excused!");
					$this.addClass("excused-btn");
				}
			});
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
	});

	$(document).on("click", "#show_morscout_profile", function() {
		var user_id = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1)
		location = "http://www.scout.morteam.com/profile.html?id=" + user_id
	});

});
