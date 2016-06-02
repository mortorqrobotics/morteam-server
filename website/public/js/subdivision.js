var socket = io();

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
function addMembersToSubdivisionModal(title) {
	var new_modal = new jBox("Modal", {
		width: 350,
		height: 373,
		title: title,
		onClose: function() {
			setTimeout(function() {
				add_members_modal.destroy();  //keyword "this" does not work. make sure to name the modal "add_members_modal".
			}, 100)
		}
	});
	sendAjax("GET", "/teams/current/users", function(users) {
		var span = document.createElement("span");
		var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="subdivision_members_search">';
		var potential_members = document.createElement("div");
		$(potential_members).attr("id", "potential_subdivision_members");
		$(potential_members).addClass("potential_members");
		$(potential_members).addClass("tall");
		var add_btn = '<input type="button" id="add_to_subdivision_btn" class="button done_button" value="Invite">'
		for (var i = 0; i < users.length; i++) {
			var user = document.createElement("p");
			$(user).addClass("potential_member");
			$(user).attr("data-userid", users[i]._id);
			$(user).html(users[i].firstname + " " + users[i].lastname);
			$(potential_members).append(user);
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

$(document).ready(function() {
	if (localStorage.profpicpath == "images/user.jpg") {
		$(".profile_id.ejs").attr("src", localStorage.profpicpath + "-60");
	} else {
		$(".profile_id.ejs").attr("src", localStorage.profpicpath + "-60");
	}

	$(document).on("click", ".subdivision_join_btn", function() {
		var subdivId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
		sendAjax("POST", ["subdivisions/public/id", subdivId, "join"], function(response) {
			if (response == "success") {
				$(".subdivision_join_btn").remove();
				$("#join-leave").append('<input type="button" class="button subdivision_leave_btn" value="Leave"></input>');
				$("#subdivision_members").append('<li class="user-link subdivision_member full-width" data-userid="' + localStorage._id + '" id="' + localStorage._id + '"><img src='+localStorage.profpicpath+' onerror="this.src=\'../images/user.jpg\'" class="small_prof_pic show" id="small_prof_pic">' + localStorage.firstname + ' ' +
					localStorage.lastname + '</li>');
			} else {
				alert("fail");
			}
		});
	});
	$(document).on("click", ".subdivision_leave_btn", function() {
		if (window.confirm("Are you sure?")) {
			var subdivId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
			sendAjax("POST", ["subdivisions/id", subdivId, "leave"], function(response) {
				if (response == "success") {
					$(".subdivision_leave_btn").remove();
					$("#join-leave").append('<input type="button" class="button subdivision_join_btn" value="Join"></input>');
					$("#subdivision_members").find("#" + localStorage._id).next().remove();
					$("#subdivision_members").find("#" + localStorage._id).remove();
				} else {
					alert("fail");
				}
			});
		}
	});
	$(document).on("click", ".subdivision_delete_btn", function() {
		if (window.confirm("Are you sure?")) {
			var subdivId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
			sendAjax("DELETE", ["subdivisions/id", subdivId], function(response) {
				if (response == "success") {
					location.assign("/");
				} else {
					alert(response);
				}
			});
		}
	});
	$(document).on("click", ".user_remove_btn", function() {
		if (window.confirm("Are you sure?")) {
			var $this = $(this);
			var subdivId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
			var userId = $this.attr("data-userid");
			sendAjax("DELETE", ["subdivisions/id", subdivId, "users/id", userId], function(response) {
				if (response == "success") {
					$("#subdivision_members").find("#" + $this.attr("data-userid")).next().remove();
					$("#subdivision_members").find("#" + $this.attr("data-userid")).next().remove();
					$("#subdivision_members").find("#" + $this.attr("data-userid")).remove();
				} else {
					alert(response);
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
	$(document).on("keyup", ".members_search", function() {
		var val = $.trim($(this).val()).replace(/ +/g, " ").toLowerCase();
		$('.potential_members p').show().filter(function() {
				var text = $(this).text().replace(/\s+/g, " ").toLowerCase();
				console.log(!~text.indexOf(val));
				return !~text.indexOf(val);
		}).hide();
	});

	//add member modal
	$(document).on("click", ".subdivision_member_add", function() {
		add_members_modal = addMembersToSubdivisionModal("Invite members");
	});
	$(document).on("click", "#add_to_subdivision_btn", function() {
		var p_selected_users = $("p.clicked");
		var selectedUsers = [];
		for (var i = 0; i < p_selected_users.length; i++) {
			selectedUsers.push($(p_selected_users[i]).attr("data-userid"));
		}
		for (var i=0; i<selectedUsers.length; i++) {
			var userId = selectedUsers[i];
			var subdivId = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
			sendAjax("POST", ["subdivisions/id", subdivId, "invitations/userId", userId], function(response) {
				if (response == "success") {
					//
				} else if (response == "already invited") {
//							console.log(response);
				} else {
					alert(response);
				}
			});
		}
		add_members_modal.close();

	});

	socket.on("message", function(msg) {
		if (msg.type == "group") {
			messageNotification(msg.author_fn+" "+msg.author_ln+" in "+msg.chat_name, msg.content, msg.chat_id);
		} else {
			messageNotification(msg.author_fn+" "+msg.author_ln, msg.content, msg.chat_id);
		}
		$("#audio-files").find("audio#click-sound")[0].play();
		$("#audio-files").find("audio#click-sound")[0].currentTime = 0;
	})

});
window.onunload = function() {};
