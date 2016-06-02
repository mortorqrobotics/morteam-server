$(document).ready(function() {
	$(document).on("click", ".user_display", function(e) {
		var a = $(e.target);
		var b = $(this).find(".delete_user");
		if (a[0] != b[0]) {
			location.assign("/profile/id/" + $(this).attr("data-userid"));
		}
	});
	$(document).on("click", ".delete_user", function() {
		if (window.confirm("Are you sure?")) {
			var $this = $(this);
			var userId = $this.parent().attr("data-userid");
			sendAjax("DELETE", ["teams/current/users", userId], function(response) {
				if (response == "success") {
					$this.parent().find("#small_prof_pic").remove();
					$this.parent().find(".user_link").html("Removed");
					$this.parent().css("background-color", "#FF6F6F")
					var delete_btn = $this;
					setTimeout(function() {
						delete_btn.remove();
					}, 10)
				} else {
					alert(response);
				}
			})
		}
	})
});
window.onunload = function() {};
