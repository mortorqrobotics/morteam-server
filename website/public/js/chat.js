var socket = io();
var shouldListen = false;

var window_is_focused;

$(window).focus(function() {
	window_is_focused = true;
}).blur(function() {
	window_is_focused = false;
});

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
		}
	});
};
function getUserOtherThanSelf(twoUsers) {
	if (twoUsers[0]._id == localStorage._id) {
		return twoUsers[1];
	} else {
		return twoUsers[0];
	}
}
function removeDuplicates(arr) {
	var seen = {};
	var out = [];
	var len = arr.length;
	var j = 0;
	for (var i = 0; i < len; i++) {
		var item = arr[i];
		if (seen[item] !== 1) {
			seen[item] = 1;
			out[j++] = item;
		}
	 }
	return out;
}
function parseDate(dateString) {
	var date = new Date(dateString);
	var now = new Date();
	var result = "";
	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	var month = date.getMonth();
	var day = date.getDate();
	var year = date.getFullYear();
	var time = standardizeTime(date);
	if (now.getFullYear() == year) {
		if (now.getDate() == day && now.getMonth() == month) {
			result += "Today";
		} else if (now.getDate() == day + 1 && now.getMonth() == month) {
			result += "Yesterday";
		} else {
			result += months[month] + ' ' + day;
		}
	} else {
		result += months[month] + ' ' + day + ' ' + year;
	}
	result += ' ' + time;
	return result;
}
function composeModal(title) {
	var new_modal = new jBox('Modal', {
		width: 350,
		height: 373,
		title: title,
		onClose: function() {
			setTimeout(function() {
				new_convo_modal.destroy(); //keyword "this" does not work. make sure to name the modal "new_convo_modal".
			}, 100)
		}
	});
	var span = document.createElement("span");
	var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="audience_members_search">';
	var potential_members = document.createElement("div");
	$(potential_members).attr("id", "potential_audience_members");
	$(potential_members).addClass("potential_members");
	$(potential_members).addClass("tall");
	var add_btn = '<input type="button" id="compose_done_btn" class="button done_button" value="Done">'
	sendAjax("GET", "/subdivisions/joined", function(subdivisions) {
		for (var i = 0; i < subdivisions.length; i++) {
			var subdivision = document.createElement("p");
			$(subdivision).addClass("potential_subdivision");
			$(subdivision).attr("data-subdivisionid", subdivisions[i]._id);
			$(subdivision).html(subdivisions[i].name);
			$(potential_members).append(subdivision);
		}
	}, { async: false }); // TODO: should this really be synchronous...

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
$(document).ready(function() {
	document.body.appendChild(loadingDiv);

	if (navigator.platform.indexOf("Mac") == -1) {
			$('.chat_area').perfectScrollbar();
	}

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

	$(document).on("click", ".compose", function() {
		new_convo_modal = composeModal("Compose");
	})
	$(document).on("click", "#compose_done_btn", function() {
		var p_selected_users = $(".potential_member.clicked");
		var p_selected_subdivisions = $(".potential_subdivision.clicked");

		subdivisionMembers = [];
		userMembers = []

		for (var i = 0; i < p_selected_users.length; i++) {
			userMembers.push($(p_selected_users[i]).attr("data-userid"));
		}
		for (var i = 0; i < p_selected_subdivisions.length; i++) {
			subdivisionMembers.push($(p_selected_subdivisions[i]).attr("data-subdivisionid"));
		}

		$(".potential_member").removeClass("clicked");
		$(".potential_subdivision").removeClass("clicked");

		if (removeDuplicates(userMembers).length == 1 && subdivisionMembers.length == 0) {
			new_convo_modal.close();
		} else if (removeDuplicates(userMembers).length == 2 && subdivisionMembers.length == 0) {
			// private
			sendAjax("POST", "/chats", {
				userMembers: userMembers,
				type: "private",
				user2: getUserOtherThanSelf(userMembers)
			}, function(user2) {
				if (user2 != "fail" && user2 != "exists") {
					// append new chat to leftbar
					var li = document.createElement("li");
					$(li).addClass("chat_name");
					var img = document.createElement("img");
					$(img).addClass("small_prof_pic");
					$(img).addClass("temp");
					$(img).attr("id", "small_prof_pic");
					$(img).attr("src", user2.profpicpath + "-60");
					var span = document.createElement("span");
					$(span).html(user2.fn + " " + user2.ln);
					// var options_span = '<span class="glyphicon glyphicon-cog list_right options_li"></span>'
					$(li).append($(img));
					$(li).append($(span));
					// $(li).append($(options_span)); //TODO: why wont this work
					$(li).attr("data-chatid", user2.chat_id);
					$(".chat_search_li").after($(li));
					$(li).trigger("click");
					socket.emit('new chat', {type: "private", receiver: user2._id, chat_id: user2.chat_id});
				} else {
					alert(user2);
				}
			})
			new_convo_modal.close();
		} else {
			//group

			var span = document.createElement("span");
			var group_chat_name = '<input type="text" class="name_input" id="group_chat_name" placeholder="Choose Name For Group Chat">';
			var create_btn = '<input type="button" id="make_chat_btn" class="button" value="Done">'

			sessionStorage.userMembers = JSON.stringify(userMembers);
			sessionStorage.subdivisionMembers = JSON.stringify(subdivisionMembers);

			$(span).append($(group_chat_name));
			$(span).append($(create_btn));
			new_convo_modal.setHeight(120);
			new_convo_modal.setContent($(span));
		}

	})

	$(".chat_search").keyup(function() {
		var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
		$('li.chat_name').not(".compose").show().filter(function() {
				var text = $(this).find("span").text().replace(/\s+/g, ' ').toLowerCase();
				console.log(!~text.indexOf(val));
				return !~text.indexOf(val);
		}).hide();
	})


	$(document).on("click", "#make_chat_btn", function() {
		if (normalizeDisplayedText($(this).prev().val()).length < 20) {
			var $this = $(this);
			sendAjax("POST", "/chats", {
				userMembers: sessionStorage.userMembers,
				subdivisionMembers: sessionStorage.subdivisionMembers,
				type: "group",
				name: normalizeDisplayedText($this.prev().val())
			}, function(chat) {
				if (chat != "fail") {
					var li = document.createElement("li");
					$(li).addClass("chat_name");
					var img = document.createElement("img");
					$(img).addClass("small_prof_pic");
					$(img).addClass("temp");
					$(img).attr("id", "small_prof_pic");
					$(img).attr("src", "images/group.png");
					var span = document.createElement("span");
					$(span).html(chat.name);
					$(li).append($(img));
					$(li).append($(span));
					$(li).attr("data-chatid", chat._id);
					$(".chat_search_li").after($(li));
					$(li).trigger("click");
					socket.emit('new chat', {type: "group", userMembers: chat.userMembers, subdivisionMembers: chat.subdivisionMembers, name: chat.name, chat_id: chat._id});
				} else {
					alert(chat);
				}
			})
			sessionStorage.removeItem("userMembers");
			sessionStorage.removeItem("subdivisionMembers");
			new_convo_modal.close();
		} else {
			alert("Name has to be 19 characters or fewer.")
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

});
function hideLeftbar(time, button) {
	$(".leftbar").velocity({left: "-260px"}, { duration: time, queue: false });
	$(".wrapper").velocity({left: "0px"}, { duration: time, queue: false });
	$(".wrapper").velocity({width: "+=260px"}, { duration: time, queue: false });
	$(button).removeClass("glyphicon-chevron-left").addClass("glyphicon-chevron-right");
	$(button).velocity({left: "10px"}, { duration: time, queue: false });
	setTimeout(function() {
		$(".wrapper").css("width", "calc(100vw - 200px)");
		fixAdLayout();
	}, time + time)
}
function showLeftbar(time, button) {
	$(".leftbar").velocity({left: "0px"}, { duration: time, queue: false });
	$(".wrapper").velocity({left: "260px"}, { duration: time, queue: false });
	$(".wrapper").velocity({width: "-=260px"}, { duration: time, queue: false });
	$(button).removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-left");
	$(button).velocity({left: "220px"}, { duration: time, queue: false });
	setTimeout(function() {
		$(".wrapper").css("width", "calc(100vw - 460px)");
		fixAdLayout();
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

// $(".searchbox").keyup(function() {
//   var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
//   $('li.chat_name').show().filter(function() {
//       var text = $(this).find(".chat_name > span").text().replace(/\s+/g, ' ').toLowerCase();
//       console.log(!~text.indexOf(val));
//       return !~text.indexOf(val);
//   }).hide();
// })

// $(window).resize(function() {
//   if (collision($(".ads"), $(".chat_wrapper"))) {
//     $(".ad").hide();
//   } else {
//     $(".ad").show();
//   }
// })
$(window).resize(function() {
	if ($(".ad").css("display") == "none") {
		if ($(".hide_leftbar").hasClass("glyphicon-chevron-left")) {
			$(".chat_wrapper").css("width", "calc(100vw - 260px)");
		} else {
			$(".chat_wrapper").css("width", "100vw");
		}
	} else {
		if ($(".hide_leftbar").hasClass("glyphicon-chevron-left")) {
			$(".chat_wrapper").css("width", "calc(100vw - 460px)");
		} else {
			$(".chat_wrapper").css("width", "calc(100vw - 200px)");
		}
	}
});

$(window).load(function() {

	socket.emit("get clients");
	socket.on('get clients', function(online_clients) {
		sendAjax("GET", "/chats", function(chats) {
			if (chats != "fail") {
				chat_users = [];
				if (chats.length == 0) {
					//TODO: Do something to notify them that they dont have any chats
				} else {
					for (var i = 0; i < chats.length; i++) {
						var li = document.createElement("li")
						$(li).addClass("chat_name");
						var img = document.createElement("img");
						var span = document.createElement("span");
						$(img).addClass("small_prof_pic");
						$(img).addClass("temp");
						// $(img).addClass("offline");
						$(img).attr("id", "small_prof_pic");
						var options_span = '<span class="glyphicon glyphicon-cog list_right options_li"></span>'
						if (chats[i].group == true) {
							$(span).html(chats[i].name)
							$(li).addClass("group_chat");
							$(img).attr("src", "images/group.png")
							$(li).append(img);
							$(li).append(span);
							$(li).append($(options_span));
						} else {
							var user2 = getUserOtherThanSelf(chats[i].userMembers)
							$(span).html(user2.firstname + " " + user2.lastname);
							$(img).attr("src", user2.profpicpath + "-60");
							chat_users.push({
								user_id: user2._id.toString(),
								chat_id: chats[i]._id.toString()
							});
							if (online_clients.indexOf(user2._id.toString()) != -1) {
								$(img).addClass("online");
							} else {
								$(img).addClass("offline");
							}
							$(li).append(img);
							$(li).append(span);
						}
						$(li).attr("data-chatid", chats[i]._id);

						$(".users_list").append($(li));
						shouldListen = true;
						if (i == 0) {
							$(li).trigger("click");
						}
					}
				}
			}
		})
	})


	$(document).on("click", ".chat_name:not(.compose)", function() {
		if (!$(this).hasClass("selected")) {
			spinner = new Spinner(spinnerOpts).spin(loadingDiv);
			socket.emit('stop typing', {chat_id: $(".chat_name.selected").attr("data-chatid") });
			$(".send_button").show().removeClass("hidden");
			$(".reply_textarea").show().removeClass("hidden");
			$(".chat_area").show().removeClass("hidden");
			$(".chat_area").unbind("scroll");
			sessionStorage.chatPage = 0;
			if (!$(this).hasClass("selected")) {
				receivers = [];
				var $this = $(this);
				$(".chat_name:not(.compose)").removeClass("selected");
				$this.addClass("selected");
				$("#chat_area").empty();
				//load receivers
				var chatId = $this.attr("data-chatid");
				sendAjax("GET", ["chats/id", chatId, "users"], function(users) {
					for (var i = 0; i < users.length; i++) {
						if (users[i]._id.toString() != localStorage._id) {
							receivers.push(users[i]._id.toString());
						}
					}
				});
				// load messages
				sendAjax("GET", getPath(["chats/id", chatId, "messages"]) + "?skip=" + 20*parseInt(sessionStorage.chatPage), function(messages) {
					if (messages.length == 0) {
						spinner.stop();
					}
					for (var i = 0; i < messages.length; i++) {
						if (messages[i].author._id.toString() != localStorage._id) {
							$('.chat_area').prepend("<div class='bubble_wrapper'><div class='other_bubble'><img title='" + messages[i].author.firstname + " " +  messages[i].author.lastname + ", " + parseDate(messages[i].timestamp) + "' class='show tt' id='small_prof_pic' src='"+ messages[i].author.profpicpath + "-60" +"'></img>" + "<p data-userid='" + messages[i].author._id + "' class='chat_opponent user-link'>" + messages[i].author.firstname + ": </p class='chat_opponent'>" + messages[i].content + "</div></div>")
						} else {
							// $('.chat_area').append("<div class='bubble_wrapper'><div class='self_bubble'><p class='chat_opponent'>" + messages[i].author.firstname + ": </p class='chat_opponent'>" + messages[i].content + "</div></div>")
							$('.chat_area').prepend("<div class='bubble_wrapper'><div class='self_bubble'>" + messages[i].content + "</div></div>");

						}
						$(".chat_area").animate({
							scrollTop: $(".chat_area")[0].scrollHeight
						}, 0);
						if (i == messages.length-1) {
							spinner.stop();
						}
					}
					$(".tt").jBox("Tooltip", {
						delayOpen: 100,
						delayClose: 0,
						theme: "TooltipDark"
					});
					// TODO: get rid of this duplicated code!!!
					$(".chat_area").scroll(function() {
						var pos = $(".chat_area").scrollTop();
						if (pos == 0) {
							sessionStorage.chatPage++;
							sendAjax("GET", getPath(["chats/id", chatId, "messages"]) + "?skip=" + 20*parseInt(sessionStorage.chatPage), function(messages) {
								for (var i = 0; i < messages.length; i++) {
									if (messages[i].author._id.toString() != localStorage._id) {
										var appendedMsg = $("<div class='bubble_wrapper'><div class='other_bubble'><img title='" + messages[i].author.firstname + " " +  messages[i].author.lastname + ", " + parseDate(messages[i].timestamp) + "' class='show tt' id='small_prof_pic' src='"+ messages[i].author.profpicpath+ "-60" +"'></img>" + "<p data-userid='" + messages[i].author._id + "' class='chat_opponent user-link'>" + messages[i].author.firstname + ": </p class='chat_opponent'>" + messages[i].content + "</div></div>").prependTo($('.chat_area'));
										$(".chat_area").animate({
											scrollTop: "+="+appendedMsg.height()
										}, 0);
									} else {
										var appendedMsg = $("<div class='bubble_wrapper'><div class='self_bubble'>" + messages[i].content + "</div></div>").prependTo($('.chat_area'))
										$(".chat_area").animate({
											scrollTop: "+="+appendedMsg.height()
										}, 0);
									}
								}
								$(".tt").jBox("Tooltip", {
									delayOpen: 100,
									delayClose: 0,
									theme: "TooltipDark"
								});
							})
						}
					});
				});
			}
		}
	});
	function optionsModal(title, currentName, chatId) {
		var new_modal = new jBox("Modal", {
			width: 350,
			height: "auto",
			title: title,
			onClose: function() {
				setTimeout(function() {
					options_modal.destroy()
				}, 100)
			}
		});
		sendAjax("GET", ["chats/id", chatId, "allMembers"], function(data) {
			var members = data.members;
			var isGroup = data.group;
			if (isGroup) {
				var container = document.createElement("span");
				var change_name = '<input type="text" class="change_name" value="'+ currentName +'"></input><br/>';
				var div = document.createElement("div");
				$(div).addClass("group_members");
				var ul = document.createElement("ul");
				$(ul).addClass("current_group_members");
				// var addMember = '<li class=" add_group_member"><span class="glyphicon glyphicon-plus"></span><span class="group_member_name">Add Member(s)</span></li>';
				$(container).append($(change_name));
				$(container).append($(div));
				$(div).append($(ul));
				// $(ul).append($(addMember));
				for (var i = 0; i < members.userMembers.length; i++) {
					$(ul).append('<li class="group_member_li"><img class="user-link" data-userid="'+members.userMembers[i]._id+'" id="small_prof_pic" src="'+members.userMembers[i].profpicpath+'-60"></img><span data-userid="'+members.userMembers[i]._id+'" class="group_member_name user-link">'+ members.userMembers[i].firstname + ' ' + members.userMembers[i].lastname +'</span> </li>')
					//<span class="member_remove glyphicon glyphicon-remove"></span> -------------------------------^
				}
				for (var i = 0; i < members.subdivisionMembers.length; i++) {
					$(ul).append('<li class="group_member_li"><span class="glyphicon glyphicon-screenshot group_member_icon"></span><span data-subdivisionid="'+members.subdivisionMembers[i]._id+'" class="group_member_name subdivision">' + members.subdivisionMembers[i].name + '</span></li>')
				}
				// if (localStorage.c_team_position == "admin") {
				//   $(container).append('<input data-chatid="'+chatId+'" type="button" class="button leave_group" value="Leave Group"></input>')
				//   $(container).append('<input data-chatid="'+chatId+'" type="button" class="button delete_group" value="Delete Group"></input>')
				// } else {
				//   $(container).append('<input data-chatid="'+chatId+'" type="button" class="button leave_group nonadmin" value="Leave Group"></input>')
				// }
				$(container).append('<input data-chatid="'+chatId+'" type="button" class="button save_options" value="Done"></input>')
				new_modal.setContent($(container));
			} else {
				alert("You can't do that.");
				return;
			}
		});
		new_modal.open();
		return new_modal;
	}
	$(document).on("click", ".options_li", function() {
		var currentName = $(this).prev().html();
		options_modal = optionsModal("Options", currentName, $(this).parent().attr("data-chatid"));
	});
	$(document).on("click", ".leave_group", function() {
		//leave group
	});
	$(document).on("click", ".delete_group", function() {
		var chatId = $(this).attr("data-chatid");
		sendAjax("DELETE", ["chats/id", chatId], function(response) {
			if (response == "success") {
				options_modal.close();
				$(".chat_name[data-chatid='"+ chatId +"']").remove();
				$(".chat_name").first().next().next().trigger("click");
			} else {
				alert(response);
			}
		});

	})
	$(document).on("click", ".save_options", function() {
		if (normalizeDisplayedText($(".change_name").val()).length < 20) {
			var chatId = $(this).attr("data-chatid");
			sendAjax("PUT", ["chats/group/id", chatId, "name"], {
				newName: normalizeDisplayedText($(".change_name").val())
			}, function(response) {
				if (response == "success") {
					options_modal.close();
					$(".chat_name[data-chatid='"+ chatId +"'] > span").first().html($(".change_name").val())
				} else {
					alert(response);
				}
			});
		} else {
			alert("Name has to be 19 characters or fewer.")
		}
	});
	$(document).on("click", ".send_button", function() {
		var content = $(".reply_textarea").val(); 
		if (content != "") {
			var $this = $(this);

			var chatId = $(".chat_name.selected").attr("data-chatid");

			var messageHtml = "<div class='bubble_wrapper'><div class='self_bubble pending'>" + normalizeDisplayedText(content) + "</div></div>";
			if ($(".bubble_wrapper.istyping").length != 0) {
				$(".bubble_wrapper.istyping").before(messageHtml);
			} else {
				$(".chat_area").append(messageHtml);
			}

			$(".chat_area").animate({
				scrollTop: $('.chat_area')[0].scrollHeight
			}, 400);

			$(".reply_textarea").val("");
			autosize.update(ta); // resizes reply text box
			$('.chat_area').css('height', "calc(100vh - 58px - " + $this.height() + "px)"); // resizes div.chat_area according to changes that

			sendAjax("POST", ["chats/id", chatId, "messages"], {
				content:  content
			}, function(response) {

				var pending = $(".pending");
				if (pending.length == 0) {
					return; // TODO: is there anything else to do here?
				}
				pending = $(pending.get(0));

				if (response == "success") {
					pending.removeClass("pending");

					if ($(".chat_name.selected").hasClass("group_chat")) {
						socket.emit("message", {
							chat_id: chatId,
							content: content,
							chat_name: $(".chat_name.selected > span").html(),
							type: "group"
						});
					} else {
						socket.emit("message", {
							chat_id: chatId,
							content: content,
							type: "private"
						})
					}
					socket.emit('stop typing', { chat_id: chatId });

					if ($(".chat_name:not(.compose)").get(0) != $(".chat_name.selected")) {
						$(".chat_search_li").after($(".chat_name.selected"));
					}

				} else {
					pending.remove(); // TODO: more error handling here?
				}
			})
		}
	});
	var replyInitialHeight = $('.reply_textarea').height(); // initial height of reply text box, it's used to check for height changes later
	$('.reply_textarea').bind("input", function() { //checks for height change of reply text box and adjusts height of chat area accordingly
		if ($(this).height() != replyInitialHeight) {
			replyInitialHeight = $(this).height();
			$('.chat_area').css('height', "calc(100% - 30px - " + $(this).height() + "px)");
			$(".chat_area").animate({
				scrollTop: $('.chat_area')[0].scrollHeight
			}, 400); // scrolls to bottom of conversation
		}
	});
	$('.reply_textarea').focus(function() { // scrolls to bottom of conversation when reply box is focused
			$(".chat_area").animate({
					scrollTop: $('.chat_area')[0].scrollHeight
			}, 400);
	});
	$('.reply_textarea').keypress(function(e) { // changes events for enter and shift+enter to send and add line break respectively
		if (e.shiftKey && e.which == 13) {
			// creates new line
		} else if (e.which == 13) {
			e.preventDefault();
			$('.send_button').trigger("click");
			autosize.update(ta);
			$('.chat_area').css('height', "calc(100% - 30px - " + $(this).height() + "px)");
		}
	});
	$(document).on("keyup", '.reply_textarea', function() {
		if ($('.reply_textarea').val() == '') {
			socket.emit('stop typing', {chat_id: $(".chat_name.selected").attr("data-chatid") });
		} else {
			socket.emit('start typing', {chat_id: $(".chat_name.selected").attr("data-chatid") });
		}
	});

	socket.on('message', function(msg) {
		if (msg.chat_id == $(".chat_name.selected").attr("data-chatid")) {
			$('.chat_area').append("<div class='bubble_wrapper'><div class='other_bubble'><img title='" + msg.author_fn + " " + msg.author_ln + ", " + parseDate(msg.timestamp) + "' class='show tt' id='small_prof_pic' src='"+msg.author_profpicpath + "-60" +"'></img>" + "<p data-userid='" + msg.author_id + "' class='chat_opponent user-link'>" + msg.author_fn + ": </p class='chat_opponent'>" + msg.content + "</div></div>")
			$(".chat_area").animate({
					scrollTop: $('.chat_area')[0].scrollHeight
			}, 400);
			$('.tt').jBox('Tooltip', { //TODO: make it so that it appends only to new message as opposed to all messages
					delayOpen: 100,
					delayClose: 0,
					theme: "TooltipDark"
			});
			if (!window_is_focused) {
				$('#audio-files').find('audio#click-sound')[0].play();
				$('#audio-files').find('audio#click-sound')[0].currentTime = 0;
			}
		} else {
			if (msg.type == "group") {
				messageNotification(msg.author_fn+" "+msg.author_ln+" in "+msg.chat_name, msg.content, msg.chat_id);
			} else {
				messageNotification(msg.author_fn+" "+msg.author_ln, msg.content, msg.chat_id);
			}
			$('#audio-files').find('audio#click-sound')[0].play();
			$('#audio-files').find('audio#click-sound')[0].currentTime = 0;
		}
	})
	socket.on('joined', function(data) {
		if (shouldListen) {
			for (var i = 0; i < chat_users.length; i++) {
				if (data._id.toString() == chat_users[i].user_id) {
					$(".chat_name[data-chatid='"+ chat_users[i].chat_id +"']").children().first().removeClass("offline");
					$(".chat_name[data-chatid='"+ chat_users[i].chat_id +"']").children().first().addClass("online");
				}
			}
		}
	});
	socket.on('left', function(data) {
		if (shouldListen) {
			for (var i = 0; i < chat_users.length; i++) {
				if (data._id.toString() == chat_users[i].user_id) {
					$(".chat_name[data-chatid='"+ chat_users[i].chat_id +"']").children().first().removeClass("online");
					$(".chat_name[data-chatid='"+ chat_users[i].chat_id +"']").children().first().addClass("offline");
				}
			}
		}
	})
	socket.on('new chat', function(data) {
		if (data.user_id != localStorage._id) {
			var li = document.createElement("li")
			$(li).addClass("chat_name");
			var img = document.createElement("img");
			var span = document.createElement("span");
			$(img).addClass("small_prof_pic");
			$(img).addClass("temp");
			$(img).attr("id", "small_prof_pic");
			if (data.type == "group") {
				$(span).html(data.name)
				$(img).attr("src", "images/group.png")
			} else {
				$(span).html(data.firstname + " " + data.lastname);
				$(img).attr("src", data.profpicpath + "-60");
				$(img).addClass("online");
				chat_users.push({
					user_id: data.user_id.toString(),
					chat_id: data.chat_id.toString()
				});
			}
			$(li).append(img);
			$(li).append(span);
			$(li).attr("data-chatid", data.chat_id);

			$(".chat_search_li").after($(li));
		}
	});
	socket.on('start typing', function(data) {
		if ($(".bubble_wrapper.istyping").length == 0) {
			if ($(".chat_name.selected").attr("data-chatid") == data.chat_id) {
				$(".chat_area").append("<div class='bubble_wrapper istyping'><div class='other_bubble'> ... </div></div>")
				$(".chat_area").animate({
						scrollTop: $('.chat_area')[0].scrollHeight
				}, 400);
			}
		}
	})
	socket.on('stop typing', function(data) {
		if ($(".chat_name.selected").attr("data-chatid") == data.chat_id) {
			$('.bubble_wrapper.istyping').remove();
		}
	})

	function fixAdLayout() {
		if ($(".ad").css("display") == "none") {
			if ($(".hide_leftbar").hasClass("glyphicon-chevron-left")) {
				$(".chat_wrapper").css("width", "calc(100vw - 260px)");
			} else {
				$(".chat_wrapper").css("width", "100vw");
			}
		} else {
			if ($(".hide_leftbar").hasClass("glyphicon-chevron-left")) {
				$(".chat_wrapper").css("width", "calc(100vw - 460px)");
			} else {
				$(".chat_wrapper").css("width", "calc(100vw - 200px)");
			}
		}
	}
	fixAdLayout();
	setTimeout(function() {
		fixAdLayout();
	}, 200)


});
window.onbeforeunload = function() {
	socket.emit('stop typing', {chat_id: $(".chat_name.selected").attr("data-chatid") });
};
$(window).blur(function() {
	socket.emit('stop typing', {chat_id: $(".chat_name.selected").attr("data-chatid") });
});
