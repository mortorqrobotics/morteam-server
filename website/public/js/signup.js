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
$(document).ready(function() {

	$(".pic_choose_button").click(function() {
		$("#show_files").trigger("click");
	})
	$('#signup_form').submit(function(e) {
		$("#signup_buttonS").val("Loading");
		$("#signup_buttonS").prop("disabled",true);
		e.preventDefault();
		if (validatePhone($("#phone_signup").val())) {
			if (validateEmail($("#email_signup").val())) {

				$("#firstname").val($.trim($("#firstname").val().capitalize()));
				$("#lastname").val($.trim($("#lastname").val().capitalize()));
				$("#username_signup").val($.trim($("#username_signup").val()));
				$("#email_signup").val($.trim($("#email_signup").val().replace(/[-)(]/g,'')));
				$("#phone_signup").val($.trim($("#phone_signup").val()));

				$(this).ajaxSubmit({
					error: function(xhr) {
						alert(xhr.status)
						$("#signup_buttonS").val("Submit");
						$("#signup_buttonS").prop("disabled",false);
					},
					success: function(response) {
						if (response == "success") {
							if (location.search == "?mobileapp") {
								alert("Success! You can now log in from the mobile app.");
								location = "morscout://";
							} else if (location.search == "?offlineapp") {
								alert("Success! You can now log in from the offline app.")
							} else {
								location="/login";
							}
						} else {
							alert(response);
							$("#signup_buttonS").val("Submit");
							$("#signup_buttonS").prop("disabled",false);
						}
					}
				});

				return false;
			} else {
				alert("Email is invalid.");
				$("#signup_buttonS").val("Submit");
				$("#signup_buttonS").prop("disabled",false);
				return false;
			}
		} else {
			alert("Phone is invalid.");
			$("#signup_buttonS").val("Submit");
			$("#signup_buttonS").prop("disabled",false);
			return false;
		}
	});
});
