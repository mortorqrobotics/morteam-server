var socket = io();

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
function debounce(fn, threshold) {
	var timeout;
	return function debounced() {
		if (timeout) {
			clearTimeout(timeout);
		}

		function delayed() {
			fn();
			timeout = null;
		}
		timeout = setTimeout(delayed, threshold || 100);
	}
}
function hideLeftbar(time, button) {
	$(".leftbar").velocity({
		left: "-260px"
	}, time);
	$(".documents_list").velocity({
		left: "40px"
	}, time);
	$(button).removeClass("glyphicon-chevron-left").addClass("glyphicon-chevron-right");
	$(button).velocity({
		left: "10px"
	}, time);
	setTimeout(function() {
		$(".documents_list").css("width", "calc(100vw - 60px)")
		$grid.isotope();
	}, time)
}
function showLeftbar(time, button) {
	$(".leftbar").velocity({
		left: "0px"
	}, time);
	$(".documents_list").velocity({
		left: "300px"
	}, time);
	$(button).removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-left");
	$(button).velocity({
		left: "220px"
	}, time);
	setTimeout(function() {
		$(".documents_list").css("width", "calc(100vw - 320px)")
		$grid.isotope();
	}, time);
}
jQuery.fn.flash = function(color, duration) {
	var current = this.css('backgroundColor');
	this.animate({
		backgroundColor: color
	}, duration / 2).animate({
		backgroundColor: current
	}, duration / 2);
}
function showDropHere() {
	$("#add_file_sign").removeClass("glyphicon-plus")
	$("#add_file_sign").html("Drop Here");
	$(".add_file").css("background-color", "#f5f5f5");
	$("#add_file_sign").css("font-size", "40px");
}
function hideDropHere() {
	$("#add_file_sign").addClass("glyphicon-plus")
	$("#add_file_sign").html("");
	$(".add_file").css("background-color", "#e9e9e9")
	$("#add_file_sign").css("font-size", "60px");
}
function loadTeamFolders() {
	sendAjax("GET", "/folders/team", function(folders) {
		for (var i = 0; i < folders.length; i++) {
			var li = document.createElement("li");
			$(li).attr("data-folderid", folders[i]._id);
			$(li).addClass("drive_name");
			$(li).append('<span id="make_drive" class="glyphicon glyphicon-folder-open"></span>'+folders[i].name);
			$(".folders_list").append($(li));
		}
		setTimeout(function() { //finde better way
			$(".folders_list").children().first().next().next().trigger("click")
		},100)
	});
}
function newTeamFolderModal(title) {
	var new_modal = new jBox('Modal', {
		width: 350,
		height: 373,
		title: title,
		onClose: function() {
			setTimeout(function() {
				team_folder_modal.destroy();  //keyword "this" does not work. make sure to name the modal "team_folder_modal".
			}, 100)
		}
	});
	var span = document.createElement("span");
	var folder_name = '<input type="text" id="folder_name" class="name_input" placeholder="Group Name" />';
	var user_search = '<input type="text" placeholder="Search Names..." class="members_search" id="folder_members_search">';
	var potential_members = document.createElement("div");
	$(potential_members).attr("id", "potential_folder_members");
	$(potential_members).addClass("potential_members");
	$(potential_members).addClass("medium-tall");
	var make_team_folder = '<input type="button" id="make_team_folder" class="button done_button" value="Done">'
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
		$(span).append($(folder_name));
		$(span).append($(user_search));
		$(span).append("<br/>");
		$(span).append($(potential_members));
		$(span).append("<br/>");
		$(span).append($(make_team_folder));
		new_modal.setContent($(span));
		new_modal.open();
	})
	return new_modal;
}
function addFileModal(title) {
	var new_modal = new jBox('Modal', {
		width: 300,
		height: 230,
		title: 'Upload a File',
		onOpen: function() {
			$("#chosen_file").html("No File Selected");
			$("#file").val("");
			$(".file_name")[0].value = "";
			document.getElementById("file").onchange = function() {
				uploads = this.files;
				if (this.files.length == 1) {
					document.getElementById("chosen_file").innerHTML = this.files[0].name;
					setTimeout(function() {
						$("#chosen_file").flash("#0099ff", 1000);
					}, 300);
				} else {
					document.getElementById("chosen_file").innerHTML = "Multiple Selected";
					setTimeout(function() {
						$("#chosen_file").flash("#0099ff", 1000);
					}, 300);
				}
			};

		},
		onClose: function() {
			setTimeout(function() {
				add_file_modal.destroy(); //keyword "this" does not work. make sure to name the modal "add_file_modal".
			}, 100)
		}
	});
	new_modal.setContent("<form enctype='multipart/form-data' action='/files' method='post' id='upload_form'><input type='file' id='file' class='hidden' name='uploadedFile'></input><input type='button' class='button file_choose' value='Choose File'></input><p id='chosen_file'>No File Selected</p><input type='text' class='file_name' name='fileName' placeholder='File Name'></input><input type='submit' class='button upload_button' value='Upload'></input></form>");
	new_modal.open();
	return new_modal;
}
function bytesToSize(bytes) {
	if (bytes < 1000) {
		return +bytes.toFixed(2) + " Bytes";
	} else if (bytes < 1000000) {
		return +(bytes/1000).toFixed(2)+ " KB"
	} else if (bytes < 1000000000) {
		return +(bytes/1000000).toFixed(2)+ " MB"
	} else {
		return +bytes.toFixed(2) + " Bytes";
	}
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
		}
	});
};

$(document).ready(function() {
	document.body.appendChild(loadingDiv);
	loadTeamFolders();

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

	$(document).on("submit", "#upload_form", function(e) {
		e.preventDefault();
		if ($(".file_name").val() != "") {
			$(".file_name").val(removeHTML($(".file_name").val()));
			$('<input />').attr('type', 'hidden').attr('name', "currentFolderId").attr('value', currentFolder).appendTo(this);
			add_file_modal.setContent("<h2 style='width: 100%; text-align: center;'>Uploading...</h2>")
			add_file_modal.setHeight(100);
			$(this).ajaxSubmit({
				error: function(xhr) {
					alert(xhr.status)
				},
				success: function(response) {
					if (response != "fail") {
						add_file_modal.close();
						add_file_modal.destroy();
						var file = JSON.parse(response)
						var fileType = file.type;
						if (file.type == "image") {
							fileType = "/file/" + file._id + "-preview";
						} else {
							fileType = "images/"+file.type+'.png';
						}
						var $file = $('<div style="z-index:1;" class="doc_frame '+file.type+'" data-fileid="' + file._id + '" title="' + file.name +
								'"><div class="hidden confirm_del"><p>Are you sure?</p><input type="button" value="yes" class="yes"></input><input type="button" value="no" class="no"></input></div><img src="'+fileType+'" class="doc_preview"/><span class="doc_title"><span class="name">' + file.name + '</span><span class="glyphicon glyphicon-trash doc_delete"></span></span></div>');
						$grid.append($file).isotope("appended", $file);
					} else {
						alert(response);
					}
				}
			});

			return false;
		} else {
			alert("You forgot to name the file.");
		}
	});
});

var currentFolder;
$(window).load(function() {

	var qsRegex;

	$grid = $('.grid').isotope({
		itemSelector: '.doc_frame',
		layoutMode: 'fitRows',
		transformEnabled: false,
		isAnimated: false,
		filter: function() {
				return qsRegex ? $(this).text().match(qsRegex) : true;
		},
		getSortData: {
			name: function(itemElem) {
				var name =  $(itemElem).find(".name").html();
				if (typeof(name) == "undefined") {
					return name;
				}
				return name.toLowerCase();
			},
			size: function(itemElem) {
				var size = $(itemElem).find('.file_size').text();
				if (size.indexOf("GB") > -1) {
					size = size.substring(0, size.indexOf("GB"));
					return parseFloat(size.replace(/[\(\)]/g, '')) * 1000000000;
				} else if (size.indexOf("MB") > -1) {
					size = size.substring(0, size.indexOf("MB"));
					return parseFloat(size.replace(/[\(\)]/g, '')) * 1000000;
				} else if (size.indexOf("KB") > -1) {
					size = size.substring(0, size.indexOf("KB"));
					return parseFloat(size.replace(/[\(\)]/g, '')) * 1000;
				} else {
					return parseFloat(size.replace(/[\(\)]/g, ''));
				}
			},
			type: function(itemElem) {
				if ($(itemElem).hasClass("add_file")) {
					return "a"
				} else if ($(itemElem).hasClass("word")) {
					return "a";
				} else if ($(itemElem).hasClass("pdf")) {
					return "b";
				} else if ($(itemElem).hasClass("keynote")) {
					return "c";
				} else if ($(itemElem).hasClass("spreadsheet")) {
					return "d";
				} else if ($(itemElem).hasClass("audio")) {
					return "e";
				} else if ($(itemElem).hasClass("unknown")) {
					return "f";
				} else if ($(itemElem).hasClass("image")) {
					return "g";
				} else {
					return "z";
				}
			}
		}
	});

//				var myDropzone = new Dropzone(".add_file", {
//					url: "#",
//					createImageThumbnails: false,
//						clickable: false,
//						previewTemplate: "<div id='preview-template' style='display: none;''>",
//						uploadMultiple: false
//				});
//				myDropzone.on("addedfile", function(file) {
//					$('<input />').attr('type', 'hidden').attr("type", "file").attr('name', "uploadedFile").attr('value', file).appendTo($("#upload_form"));
//					add_file_modal = addFileModal("Upload a File")
//					document.getElementById("chosen_file").innerHTML = file.name;
//					setTimeout(function() {
//						$("#chosen_file").flash("#0099ff", 1000);
//					}, 300);
//				});
//
//				$("html").on("dragenter", function(event) {
//					event.preventDefault();
//					event.stopPropagation();
//					showDropHere();
//				});
//				$("html").on("drop", function(event) {
//					event.preventDefault();
//					event.stopPropagation();
//					hideDropHere();
//				});
//				$(".add_file").on("drop", function(event) {
//					event.preventDefault();
//					event.stopPropagation();
//					hideDropHere();
//				});
//				$("html").on("mouseenter", function(event) {
//					event.stopPropagation();
//					event.preventDefault();
//					hideDropHere();
//				})
//				$("html").on('dragover', function() {
//					event.preventDefault();
//				});
//				$("html").mouseleave(function() {
//					hideDropHere();
//				});

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

	$(document).on("mouseenter", ".doc_frame", function() {
		$(this).css({
			backgroundColor: "#" + rgb2hex($(this).css('backgroundColor')).darkenHexColorBy(25)
		})
	});
	$(document).on("mouseleave", ".doc_frame", function() {
		$(this).css({
			backgroundColor: "#" + rgb2hex($(this).css('backgroundColor')).lightenHexColorBy(25)
		})
	});

	$(document).on("click", ".drive_name:not(.new_folder, .drive_options)", function(e) {
		var a = $(e.target);
		var b = $(this).find(".list_right");
		if (a[0] != b[0] && a[0] != b[1]) {

			if (!$(this).hasClass("selected")) {
				spinner = new Spinner(spinnerOpts).spin(loadingDiv);
				var done = 0;
				var $this = $(this);
				currentFolder = $this.attr("data-folderid");
				if ($(".documents_list").hasClass("hidden")) {
					$(".documents_list").fadeIn(400).removeClass("hidden");
				}
				$grid.isotope("remove", $(".doc_frame:not(.add_file)")).isotope()
				$(".drive_name").removeClass("selected");
				$(this).addClass("selected");

				var folderId = $this.attr("data-folderid");
				sendAjax("GET", ["folders/id", folderId, "subfolders"], function(folders) {
					if (folders.length == 0) {
						done++;
						if (done == 2) {
							spinner.stop();
						}
					}
					for (var i = 0; i < folders.length; i++) {
						var $folder = $('<div style="z-index:1;" class="doc_frame folder_doc" data-folderid="' + folders[i]._id + '" title="' + folders[i].name +
								'"><div class="hidden confirm_del"><p>Are you sure?</p><input type="button" value="yes" class="yes"></input><input type="button" value="no" class="no"></input></div><img src="' +
								'images/folder.png' + '" class="doc_preview"/><span class="doc_title"><span class="name">' + folders[i].name + '</span><span class="glyphicon glyphicon-trash doc_delete"></span></span></div>');
						$grid.append($folder).isotope("appended", $folder);
						if (i == folders.length-1 && done == 1) {
							spinner.stop();
						} else if (i == folders.length-1 && done == 0) {
							done++;
						}
					}
				});
				sendAjax("GET", ["folders/id", folderId, "files"], function(files) {
					if (files.length == 0) {
						done++;
						if (done == 2) {
							spinner.stop();
						}
					}
					for (var i = 0; i < files.length; i++) {
						var fileType = files[i].type;
						if (files[i].type == "image") {
							fileType = "/files/id/" + files[i]._id + "-preview";
						} else {
							fileType = "images/"+files[i].type+'.png';
						}
						var deleteButton = '';
						if (files[i].creator == localStorage._id || isCurrentUserAdmin()) {
							deleteButton = '<span class="glyphicon glyphicon-trash doc_delete"></span>'
						}
						var $file = $('<div style="z-index:1;" class="doc_frame '+files[i].type+'" data-fileid="' + files[i]._id + '" title="' + files[i].name +
								'"><div class="hidden confirm_del"><p>Are you sure?</p><input type="button" value="yes" class="yes"></input><input type="button" value="no" class="no"></input></div><img src="'+fileType+'" class="doc_preview"/><span class="doc_title"><span class="name">' + files[i].name + '</span><span class="file_size">' + bytesToSize(files[i].size) +
								'</span>'+deleteButton+'</span></div>');
						$grid.append($file).isotope("appended", $file);
						$file.jBox('Tooltip', {
							delayOpen: 700,
							delayClose: 300,
							theme: "TooltipDark",
							position: {
								y: 'bottom'
							}
						});
						if (i == files.length-1 && done == 1) {
							spinner.stop();
						} else if (i == files.length-1 && done == 0) {
							done++;
						}
					}
				});
			}
		}
	});
	$(document).on("click", ".doc_frame:not(.add_file)", function(e) {
		var a = $(e.target);
		var b = $(this).find(".doc_delete");
		var c = $(this).find("input");
		if (a[0] != b[0] && a[0] != c[0] && a[0] != c[1]) {
			location = "/file/" + $(this).attr("data-fileid");
		}
	});
	$(document).on("click", ".doc_delete", function() {
		var frame = $(this).parent().parent();
		frame.find(".confirm_del").css("background-color", frame.css("background-color"));
		frame.find(".confirm_del").fadeIn(150).removeClass("hidden");
		$(frame).click(function(e) {
			var a = $(e.target);
			var b = $(this).find(".doc_delete");
			var c = $(this).find("input");
			if (a[0] != b[0] && a[0] != c[0] && a[0] != c[1]) {
				frame.find(".confirm_del").fadeOut(150);
			}
		});
		$(frame.find(".yes")).click(function() {
			var fileId = frame.attr("data-fileid");
			sendAjax("DELETE", getPath(["file/id", fileId]) + "?isImg=" + frame.hasClass("image"), function(response) {
				if (response == "success") {
					$grid.isotope('remove', frame).isotope();
				} else {
					alert(response);
				}
			});
		});
		$(frame.find(".no")).click(function() {
			frame.find(".confirm_del").fadeOut(150);
		});
	});
//				$(document).on("click", ".folder_doc", function(e) {
//					var a = $(e.target);
//					var b = $(this).find(".list_right");
//					if (a[0] != b[0] && a[0] != b[1]) {
//						var $this = $(this);
//						currentFolder = $this.attr("data-folderid");
//						if ($(".documents_list").hasClass("hidden")) {
//							$(".documents_list").fadeIn(400).removeClass("hidden");
//						}
//
//						$grid.isotope("remove", $(".doc_frame:not(.add_file)")).isotope()
//
//						var folderId = $this.attr("data-folderid");
//						sendAjax("GET", ["folders/id", folderId, "subfolders"], function(folders) {
//							for (var i = 0; i < folders.length; i++) {
//								var $folder = $('<div style="z-index:1;" class="doc_frame folder_doc" data-folderid="' + folders[i]._id + '" title="' + folders[i].name +
//									'"><div class="hidden confirm_del"><p>Are you sure?</p><input type="button" value="yes" class="yes"></input><input type="button" value="no" class="no"></input></div><img src="' +
//									'images/folder.png' + '" class="doc_preview"/><span class="doc_title"><span class="name">' + folders[i].name + '</span><span class="glyphicon glyphicon-trash doc_delete"></span></span></div>');
//								$grid.append($folder).isotope("appended", $folder);
//								$folder.jBox('Tooltip', {
//									delayOpen: 700,
//									delayClose: 300,
//									theme: "TooltipDark",
//									position: {
//										y: 'bottom'
//									}
//								});
//							}
//						});
//						sendAjax("GET", ["folders/id", folderId, "files"], function(files) {
//							for (var i = 0; i < files.length; i++) {
//								// append files
//							}
//						});
//					}
//				});

	$(document).on("click", ".new_folder", function() {
		team_folder_modal = newTeamFolderModal("New Group");
	});
	$(document).on("click", "#make_team_folder", function() {
		if ($("#folder_name").val() != "") {
			if ($("#folder_name").val().length < 22) {
				var p_selected_users = $(".potential_member.clicked");
				var p_selected_subdivisions = $(".potential_subdivision.clicked");

				userMembers = [];
				subdivisionMembers = [];

				for (var i = 0; i < p_selected_users.length; i++) {
					userMembers.push($(p_selected_users[i]).attr("data-userid"));
				}
				for (var i = 0; i < p_selected_subdivisions.length; i++) {
					subdivisionMembers.push($(p_selected_subdivisions[i]).attr("data-subdivisionid"));
				}

				if (removeDuplicates(userMembers).length == 1 && subdivisionMembers.length == 0) {
					team_folder_modal.close();
					team_folder_modal.destroy();
				} else {
					sendAjax("POST", "/folders", {
						type: "teamFolder",
						name: $("#folder_name").val(),
						userMembers: userMembers,
						subdivisionMembers:
						subdivisionMembers
					}, function(folder) {
						if (folder != "fail") {
							var li = document.createElement("li");
							$(li).attr("data-folderid", folder._id);
							$(li).addClass("drive_name");
							$(li).html('<span id="make_drive" class="glyphicon glyphicon-folder-open"></span> ' + folder.name)
							$(".folders_list").append($(li));
						} else {
							alert(folder);
						}
					});
					team_folder_modal.close();
					team_folder_modal.destroy();
				}
			} else {
				alert("Name has to be 21 characters or fewer.")
			}
		} else {
			alert("You forgot to name the folder.");
		}
	});

	$(document).on("click", ".add_file", function() {
		add_file_modal = addFileModal("Upload a File");
	})
	$(document).on("click", ".file_choose", function() {
		$("#file").trigger("click");
	});
	var ascending;

	$(".sort_by").click(function() {

		 if (!$(this).hasClass("selected")) {
			var chosenSort = "";
			$(".sort_by").removeClass("selected");
			$(this).addClass("selected");
			chosenSort = $(this).html().toLowerCase();
			if (chosenSort === "date") {
				chosenSort = "original-order";
			}
			$grid.isotope({
				sortBy: chosenSort,
			})
		} else {
			var chosenSort = "";
			$(".sort_by").removeClass("selected");
			$(this).addClass("selected");
			chosenSort = $(this).html().toLowerCase();
			if (chosenSort === "date") {
				chosenSort = "original-order";
			}
			console.log(ascending);
			$grid.isotope({
				sortBy: chosenSort,
			})
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


	var $quicksearch = $('.searchbox').keyup(debounce(function() {
		qsRegex = new RegExp($quicksearch.val(), 'gi');
		$grid.isotope();
		if (currentFolderID == "") {
			$(".add_file").hide();
			$grid.isotope();
		}
	}, 200));
});
